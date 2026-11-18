import { useCallback, useMemo } from 'react'
import { useDb } from '@/data/db'
import { DEFAULT_WORK_END_HOUR, useMeta } from '@/data/source'
import { useProjectState } from '@/lib/projectState'
import { dayKey, parseDay, DAY } from '@/data/range'
import type { Staff } from '@/data/types'

/**
 * Taqsimot roster + editable schedule (Hilol: responsibles.taqsimot_pct / days_off / operator_off_days).
 * Seed values come from staff.share / weekly_off / vacation; the user's edits persist in the 'taqsimot' page state
 * (localStorage `d365.taqsimot` in the demo, the server in a live project) as overrides on top of the seed. In a live
 * project this is Data365's own planning copy: nothing is written to the client's portal (Taqsimot is view-only there).
 */
interface Saved {
  shares: Record<string, number>
  weekly: Record<string, number[]>
  weeklyNote: Record<string, string>
  /** `${staffId}:${YYYY-MM-DD}` → entry (added) | null (seeded day removed) */
  off: Record<string, OffEntry | null>
  /** own working hours, Tashkent: staffId → "09:00-18:00" (none = the distribution's shared hours; server TaqsimotPlan.Hours) */
  hours: Record<string, string>
  /** the demo's roster (no server): the operators added / removed in the table; a live project keeps it in its distribution */
  roster?: string[]
}

export type OffKind = 'otpuska' | 'istisno'
/** One-off day off. The kind is stored explicitly (never inferred from the free-text note, which may be in any language). */
export interface OffEntry {
  kind: OffKind
  /** user's free text; '' = no note (the kind's label is shown, translated) */
  note: string
}

/** Older saves stored the bare note string — migrate it. */
function migrateOff(off: Record<string, unknown> | undefined): Record<string, OffEntry | null> {
  const out: Record<string, OffEntry | null> = {}
  for (const [k, v] of Object.entries(off ?? {})) {
    if (v === null) out[k] = null
    else if (typeof v === 'string') {
      const kind: OffKind = /otpuska|отпуск|vacation|leave/i.test(v) ? 'otpuska' : 'istisno'
      out[k] = { kind, note: v === 'Otpuska' || v === 'Istisno' ? '' : v }
    } else if (v && typeof v === 'object' && 'kind' in v) {
      const e = v as OffEntry
      out[k] = { kind: e.kind === 'otpuska' ? 'otpuska' : 'istisno', note: typeof e.note === 'string' ? e.note : '' }
    }
  }
  return out
}

const EMPTY_SAVED: Saved = { shares: {}, weekly: {}, weeklyNote: {}, off: {}, hours: {} }
const isSaved = (v: unknown): v is Partial<Saved> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Fill missing parts of an older / partial save and migrate its off-day entries. */
function normalise(s: Partial<Saved>): Saved {
  return { ...EMPTY_SAVED, ...s, off: migrateOff(s.off as Record<string, unknown> | undefined) }
}

export interface Op {
  id: string
  name: string
  hue: number
  sub: string
  staff: Staff
  /** taqsimot % (0..100) */
  share: number
  /** the share was set on this page (else the default: in a live roster an equal part of today's working operators) */
  shareSaved: boolean
  /** weekly days off, JS dow (0 = Sunday); the «Ish kunlari» are the other days */
  weekly: number[]
  note: string
  /** working hours, minutes of the day: own, else the shared ones (`hoursSaved` false) */
  from: number
  to: number
  hoursSaved: boolean
}

/**
 * "09:00-18:00" → [540, 1080]; "24:00" is the day's end; "22:00-06:00" an overnight shift [1320, 360] (it ends the next
 * morning, never at 00:00 — that one ends at "24:00"); anything else → null (as the server's DistributionRules.Span)
 */
export function parseSpan(v: unknown): [number, number] | null {
  const m = typeof v === 'string' ? /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(v) : null
  if (!m) return null
  const [a, b] = [+m[1]! * 60 + +m[2]!, +m[3]! * 60 + +m[4]!]
  return +m[2]! < 60 && +m[4]! < 60 && a !== b && a < 1440 && b <= 1440 && !(a > b && b === 0) ? [a, b] : null
}

/** a shift past midnight (22:00–06:00): it starts after it ends on the clock (DistributionRules.Overnight) */
export const overnight = (from: number, to: number) => from > to

/** minutes of the day → "09:30" (1440 → "24:00"; 1441–2879, a time of the next morning, as that morning's clock) */
export const hm = (min: number) => {
  const m = min > 1440 ? min - 1440 : min
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
export const spanText = (from: number, to: number) => `${hm(from)}-${hm(to)}`

/** Tashkent (UTC+5, no daylight saving): the weekday and minute of the day at `now` — the server's clock for the hours */
export function tashkent(now: number): { dow: number; minute: number; day: string } {
  const d = new Date(now + 5 * 3600_000)
  return { dow: d.getUTCDay(), minute: d.getUTCHours() * 60 + d.getUTCMinutes(), day: d.toISOString().slice(0, 10) }
}

type TFn = (uz: string, vars?: Record<string, string | number>) => string
/** Label of the kind, translated ('Otpuska' / 'Istisno'). */
export const offKindLabel = (kind: OffKind, t: TFn) => (kind === 'otpuska' ? t('Otpuska') : t('Istisno'))
/** Text to show for an entry: the user's note, or the translated kind label when there is none. */
export const offText = (e: OffEntry, t: TFn) => e.note.trim() || offKindLabel(e.kind, t)

/**
 * The team day at `now` (as the server's DistributionRules.BusinessDay): it runs from the previous day's `endHour` to its
 * own, so a lead after `endHour` belongs to the next day's team; `businessDay` is its date, `after` = past today's end.
 */
export function teamDay(now: number, endHour: number) {
  const d = new Date(now)
  const endMin = Math.round(endHour * 60)
  // the window [day − 1 + end, day + end) holding now; an end past 24:00 (an overnight shift) is the next morning
  let to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, endMin).getTime()
  while (to - DAY > now) to -= DAY
  while (to <= now) to += DAY
  const businessDay = dayKey(to - endMin * 60_000)
  return { from: to - DAY, to, businessDay, after: businessDay > dayKey(now) }
}

/**
 * The roster: the operators of the automatic distribution (a live project's settings) when there are such, else the demo's
 * own roster, else the sales managers (the wizard's staff.sales). `startHour`–`endHour` = the distribution's shared hours
 * of before: what an operator without own hours keeps (the migration — nothing saved is rewritten). The team day changes
 * at the latest end among the operators (`endHour` returned, as the server's DistributionRules.TeamEnd).
 * In the chosen roster a share never set here shows as an equal split and counts as the server counts it (shareOn: an
 * equal part of that day's working operators, LeadDistributor / DistributionRules.Pick).
 */
export function useTaqsimot(operatorIds?: readonly string[] | null, endHour?: number | null, startHour?: number | null) {
  const db = useDb()
  const { workEndHour = DEFAULT_WORK_END_HOUR } = useMeta()
  const [stored, setStored] = useProjectState<Partial<Saved>>('taqsimot', EMPTY_SAVED, isSaved)
  const saved = useMemo(() => normalise(stored), [stored])
  const shared: [number, number] = useMemo(() => [(startHour ?? 9) * 60, (endHour ?? workEndHour) * 60], [startHour, endHour, workEndHour])
  const rosterIds = operatorIds ?? saved.roster ?? null
  const update = useCallback((fn: (s: Saved) => Saved) => setStored((s) => fn(normalise(s))), [setStored])

  /** All one-off off days (istisno + otpuska): seeded vacations + user edits. */
  const offMap = useMemo(() => {
    const m = new Map<string, OffEntry>()
    for (const s of db.staff) {
      if (!s.sales || !s.vacation) continue
      for (let t = parseDay(s.vacation.from); t <= parseDay(s.vacation.to); t += DAY) m.set(`${s.id}:${dayKey(t)}`, { kind: 'otpuska', note: '' })
    }
    for (const [k, v] of Object.entries(saved.off)) {
      if (v === null) m.delete(k)
      else m.set(k, v)
    }
    return m
  }, [db, saved.off])

  const ops: Op[] = useMemo(() => {
    const roster = db.staff
      .filter((s) => (rosterIds ? rosterIds.includes(s.id) : s.sales))
      .map((s) => {
        const own = parseSpan(saved.hours[s.id])
        return {
        id: s.id,
        name: s.name,
        hue: s.hue,
        sub: s.branch,
        staff: s,
        share: saved.shares[s.id] ?? s.share,
        shareSaved: saved.shares[s.id] !== undefined,
        weekly: saved.weekly[s.id] ?? s.weekly_off,
        note: saved.weeklyNote[s.id] ?? '',
        from: own?.[0] ?? shared[0],
        to: own?.[1] ?? shared[1],
        hoursSaved: own !== null,
        }
      })
    if (!operatorIds) return roster
    // shown as an equal split of the roster; what it is on a given day is shareOn (the server's rule)
    const equal = roster.length ? Math.round((100 / roster.length) * 10) / 10 : 0
    return roster.map((o) => (o.shareSaved ? o : { ...o, share: equal }))
  }, [db, saved, operatorIds, rosterIds, shared])

  const offEntry = useCallback((id: string, day: string): OffEntry | null => offMap.get(`${id}:${day}`) ?? null, [offMap])
  const isWeeklyOff = useCallback((op: Op, day: string) => op.weekly.includes(new Date(`${day}T00:00:00`).getDay()), [])
  const isOff = useCallback((op: Op, day: string) => isWeeklyOff(op, day) || offMap.has(`${op.id}:${day}`), [isWeeklyOff, offMap])
  /**
   * The share the server hands leads out by on `day` (DistributionRules.Pick): the saved one, else (live roster) an equal
   * part of that day's working operators — not off, a share above 0 (none saved counts as working).
   */
  const shareOn = useCallback(
    (op: Op, day: string) => {
      if (op.shareSaved || !operatorIds) return op.share
      const working = ops.filter((o) => !isOff(o, day) && (o.shareSaved ? o.share > 0 : true)).length
      return working ? 100 / working : 0
    },
    [ops, isOff, operatorIds],
  )

  const setShare = useCallback((id: string, v: number) => update((s) => ({ ...s, shares: { ...s.shares, [id]: Math.max(0, Math.min(100, Math.round(v))) } })), [update])
  const setShares = useCallback((m: Record<string, number>) => update((s) => ({ ...s, shares: { ...s.shares, ...m } })), [update])
  const setWeekly = useCallback((id: string, days: number[], note: string) => update((s) => ({ ...s, weekly: { ...s.weekly, [id]: days }, weeklyNote: { ...s.weeklyNote, [id]: note } })), [update])
  const addOff = useCallback(
    (id: string, days: string[], kind: OffKind, note: string) => update((s) => ({ ...s, off: { ...s.off, ...Object.fromEntries(days.map((d) => [`${id}:${d}`, { kind, note: note.trim() }])) } })),
    [update],
  )
  const removeOff = useCallback((id: string, day: string) => update((s) => ({ ...s, off: { ...s.off, [`${id}:${day}`]: null } })), [update])
  /** the «Ish kunlari» (JS dow): stored as their complement, the weekly days off the server reads */
  const setWorkDays = useCallback((id: string, work: number[]) => update((s) => ({ ...s, weekly: { ...s.weekly, [id]: [0, 1, 2, 3, 4, 5, 6].filter((d) => !work.includes(d)) } })), [update])
  const setHours = useCallback((id: string, from: number, to: number) => parseSpan(spanText(from, to)) !== null && update((s) => ({ ...s, hours: { ...s.hours, [id]: spanText(from, to) } })), [update])
  /** the demo's roster (a live project changes its distribution's operators instead) */
  const setRoster = useCallback((ids: string[]) => update((s) => ({ ...s, roster: ids })), [update])

  /** on shift at `now` (Tashkent): inside their hours on a day they work (an overnight shift's day is the one it starts) — DistributionRules.WorkingNow */
  const isWorkingAt = useCallback((op: Op, now: number) => onShift(op, (o, day) => offMap.has(`${o.id}:${day}`), now), [offMap])
  /** the team day changes at the latest end, an overnight shift's the next morning (DistributionRules.TeamEnd); the earliest start, for "leads go out at …" */
  const teamEnd = ops.length ? Math.max(...ops.map((o) => (overnight(o.from, o.to) ? o.to + 1440 : o.to))) : shared[1]
  const teamStart = ops.length ? Math.min(...ops.map((o) => o.from)) : shared[0]

  return {
    ops,
    offMap,
    offEntry,
    isWeeklyOff,
    isOff,
    isWorkingAt,
    setShare,
    setShares,
    setWeekly,
    setWorkDays,
    setHours,
    setRoster,
    addOff,
    removeOff,
    shareOn,
    endHour: teamEnd / 60,
    startHour: teamStart / 60,
  }
}

/**
 * Nobody's hours now (Tashkent): when the first operator's start, as the server hands the waiting leads out — days ahead
 * (0 = today) and the minute; null when someone works now or nobody works in the coming week. `off(op, day)` = a one-off day
 * off on that Tashkent date; an operator with a saved 0% never takes leads.
 */
export function nextStart(ops: Op[], off: (op: Op, day: string) => boolean, now: number): { days: number; minute: number; dow: number } | null {
  const takes = ops.filter((o) => !(o.shareSaved && o.share <= 0))
  if (takes.some((o) => onShift(o, off, now))) return null
  for (let days = 0; days <= 7; days++) {
    const tk = tashkent(now + days * DAY)
    const works = takes.filter((o) => !o.weekly.includes(tk.dow) && !off(o, tk.day))
    const starts = works.map((o) => o.from).filter((m) => days > 0 || m > tk.minute)
    if (starts.length) return { days, minute: Math.min(...starts), dow: tk.dow }
  }
  return null
}

/**
 * On shift at `now` (Tashkent), as the server's DistributionRules.WorkingNow: inside their hours, and the shift's day — today,
 * or yesterday for the after-midnight part of an overnight shift — is a work day (no weekly day off, `off` = no one-off one).
 */
export function onShift(op: Op, off: (op: Op, day: string) => boolean, now: number): boolean {
  const tk = tashkent(now)
  const night = overnight(op.from, op.to)
  if (night ? tk.minute < op.from && tk.minute >= op.to : tk.minute < op.from || tk.minute >= op.to) return false
  const day = night && tk.minute < op.to ? tashkent(now - DAY) : tk
  return !op.weekly.includes(day.dow) && !off(op, day.day)
}

/** readOnly: a published dashboard's viewers see the plan but only Studio changes it (TaqsimotPage) */
export type Tq = ReturnType<typeof useTaqsimot> & { readOnly?: boolean }

/* ---------- calendar words (Hilol spelling) ---------- */
export const SHORT_DAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
export const FULL_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
export const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
/** Monday-first order of JS dow values */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const dateOf = (day: string) => new Date(`${day}T00:00:00`)

/** whole days from one day (YYYY-MM-DD) to another */
export const daysBetween = (from: string, to: string) => Math.round((dateOf(to).getTime() - dateOf(from).getTime()) / DAY)

/** every day from one day to another, both included */
export function daysFromTo(from: string, to: string): string[] {
  const a = dateOf(from)
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => dayKey(new Date(a.getFullYear(), a.getMonth(), a.getDate() + i).getTime()))
}

/** days (any order) as runs of days in a row: [first, last] */
export function runsOfDays(days: string[]): [string, string][] {
  const out: [string, string][] = []
  for (const d of [...days].sort()) {
    const last = out[out.length - 1]
    if (last && daysBetween(last[1], d) === 1) last[1] = d
    else out.push([d, d])
  }
  return out
}

/** one operator's leave: its days in a row with the same note */
export interface Leave {
  op: Op
  from: string
  to: string
  note: string
  days: string[]
}

/**
 * Runs of days written once per month: `parts` are "3–12", "14"; `day` is one of the month's days, for its name.
 * A run across a month's end goes in both months. Runs come in date order.
 */
export function rangesByMonth(runs: { from: string; to: string }[]): { day: string; parts: string[] }[] {
  const out: { day: string; parts: string[] }[] = []
  for (const { from, to } of runs) {
    let a = from
    while (a <= to) {
      const d = dateOf(a)
      const monthEnd = dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime())
      const b = to < monthEnd ? to : monthEnd
      const part = a === b ? `${d.getDate()}` : `${d.getDate()}–${dateOf(b).getDate()}`
      const last = out[out.length - 1]
      if (last && last.day.slice(0, 7) === a.slice(0, 7)) last.parts.push(part)
      else out.push({ day: a, parts: [part] })
      const e = dateOf(b)
      a = dayKey(new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1).getTime())
    }
  }
  return out
}

/** the leaves not over yet (`today` on or before their last day): running ones first, then by the day they start */
export function leavesOf(ops: Op[], off: ReadonlyMap<string, OffEntry>, today: string): Leave[] {
  const out: Leave[] = []
  for (const op of ops) {
    const prefix = `${op.id}:`
    const days = [...off.entries()]
      .filter(([k, e]) => k.startsWith(prefix) && e.kind === 'otpuska')
      .map(([k, e]) => ({ day: k.slice(prefix.length), note: e.note }))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
    let run: Leave | null = null
    for (const { day, note } of days) {
      if (run && run.note === note && daysBetween(run.to, day) === 1) {
        run.to = day
        run.days.push(day)
      } else {
        run = { op, from: day, to: day, note, days: [day] }
        out.push(run)
      }
    }
  }
  return out.filter((l) => l.to >= today).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.op.name.localeCompare(b.op.name)))
}

export type DayState = 'work' | 'weekly' | 'otpuska' | 'istisno'
export interface MonthRow {
  op: Op
  /** one per day of the month */
  states: DayState[]
  work: number
}

/**
 * A month of the plan, one row per person, the fewest working days first; `working` = how many people work each day.
 * A one-off day off or leave outranks the weekly day off, as on the Kunlik tab.
 */
export function monthPlan(ops: Op[], days: string[], offEntry: (id: string, day: string) => OffEntry | null, isWeeklyOff: (op: Op, day: string) => boolean) {
  const rows: MonthRow[] = ops.map((op) => {
    const states = days.map((day): DayState => offEntry(op.id, day)?.kind ?? (isWeeklyOff(op, day) ? 'weekly' : 'work'))
    return { op, states, work: states.filter((s) => s === 'work').length }
  })
  rows.sort((a, b) => a.work - b.work || a.op.name.localeCompare(b.op.name))
  return { rows, working: days.map((_, i) => rows.filter((r) => r.states[i] === 'work').length) }
}

/** "45s" / "3m 20s" / "5m" / "2h 5m" (Hilol fmtSec) */
export function fmtSec(sec: number, lang: string): string {
  const u = lang === 'ru' ? { s: 'с', m: 'м', h: 'ч' } : { s: 's', m: 'm', h: 'h' }
  const s = Math.round(sec)
  if (s < 60) return `${s}${u.s}`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h) return m ? `${h}${u.h} ${m}${u.m}` : `${h}${u.h}`
  return r ? `${m}${u.m} ${r}${u.s}` : `${m}${u.m}`
}

export function median(xs: number[]): number {
  if (!xs.length) return 0
  const a = [...xs].sort((x, y) => x - y)
  const mid = a.length >> 1
  return a.length % 2 ? a[mid]! : (a[mid - 1]! + a[mid]!) / 2
}
