import { useEffect, useState } from 'react'

/**
 * Date ranges and day helpers. Timestamps are epoch ms; days are 'YYYY-MM-DD' (local).
 * Every range ends at "now" at most, so today's numbers keep growing while the demo is open (live feel).
 */
export type RangeKey = 'today' | 'yesterday' | '7d' | 'week' | 'month' | 'prevMonth' | '30d' | '90d' | 'all'

export interface DateRange {
  key: RangeKey | 'custom'
  from: number
  /** exclusive */
  to: number
}

export const DAY = 86_400_000

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDay(day: string): number {
  return new Date(`${day}T00:00:00`).getTime()
}

export function monthKey(ts: number): string {
  return dayKey(ts).slice(0, 7)
}

/** Demo data starts 180 days before today (the "CRM went live" date of the demo workspace). */
export const HISTORY_DAYS = 180

export function dataStart(now = Date.now()): number {
  return startOfDay(now) - HISTORY_DAYS * DAY
}

/** `start` = the data source's first day (db.start); "Butun davr" begins there. */
export function rangeOf(key: RangeKey, now = Date.now(), start = dataStart(now)): DateRange {
  const today = startOfDay(now)
  const d = new Date(today)
  switch (key) {
    case 'today':
      return { key, from: today, to: now }
    case 'yesterday':
      return { key, from: today - DAY, to: today }
    case '7d':
      return { key, from: today - 6 * DAY, to: now }
    case 'week': {
      const dow = (d.getDay() + 6) % 7 // Monday = 0
      return { key, from: today - dow * DAY, to: now }
    }
    case 'month':
      return { key, from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: now }
    case 'prevMonth':
      return { key, from: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), to: new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
    case '30d':
      return { key, from: today - 29 * DAY, to: now }
    case '90d':
      return { key, from: today - 89 * DAY, to: now }
    case 'all':
      return { key, from: start, to: now }
  }
}

/** The same-length period right before `r` (for "vs previous period" deltas). */
export function prevRange(r: DateRange): DateRange {
  if (r.key === 'month') {
    const d = new Date(r.from)
    const from = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime()
    // same number of elapsed days in the previous month
    return { key: 'custom', from, to: Math.min(from + (r.to - r.from), r.from) }
  }
  const len = r.to - r.from
  return { key: 'custom', from: r.from - len, to: r.from }
}

export function inRange(ts: number, r: DateRange): boolean {
  return ts >= r.from && ts < r.to
}

/** Day keys covered by a range (inclusive of the partial last day). */
export function daysOf(r: DateRange): string[] {
  const out: string[] = []
  for (let t = startOfDay(r.from); t < r.to; t += DAY) out.push(dayKey(t))
  return out
}

/** Relative change; null when the base is 0. */
export function change(cur: number, prev: number): number | null {
  if (!prev) return null
  return (cur - prev) / prev
}

/** Current time that re-renders every `ms` (default 30s) — makes "today" numbers tick up. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/* ── Trend buckets ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * How finely a trend over a range is grouped (owner, 2026-11-09: a year of one point per day "looks like noise"): a day
 * per point up to a month, a week up to about half a year, a month up to ~40 months, else a quarter — so a sparkline or
 * a daily chart has roughly 12–40 points whatever the period.
 */
export type Grain = 'day' | 'week' | 'month' | 'quarter'

/** whole and partial days a range touches (arithmetic: a range from 1970 does not build 20 000 day keys) */
export function dayCount(r: DateRange): number {
  return Math.max(1, Math.ceil((r.to - startOfDay(r.from)) / DAY))
}

export function grainOf(r: DateRange): Grain {
  const n = dayCount(r)
  if (n <= 31) return 'day'
  if (n <= 186) return 'week'
  if (n <= 1220) return 'month'
  return 'quarter'
}

/** a 'YYYY-MM-DD' day's key at a grain: the day, its week's Monday, its 'YYYY-MM', its 'YYYY-Qn' */
export function grainKey(day: string, grain: Grain): string {
  if (grain === 'day') return day
  if (grain === 'month') return day.slice(0, 7)
  if (grain === 'quarter') return `${day.slice(0, 4)}-Q${Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1}`
  // calendar arithmetic in UTC: the day key is already the local day, no time zone may move it
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** one point of a trend: its key (grainKey), where it starts and ends (clipped to the range), its first day */
export interface Bucket {
  key: string
  from: number
  /** exclusive */
  to: number
  /** the first day of the bucket inside the range ('YYYY-MM-DD') */
  day: string
}

/** The range's points at a grain (default grainOf), in time order; the first and last may be partial. */
export function bucketsOf(r: DateRange, grain: Grain = grainOf(r)): Bucket[] {
  const out: Bucket[] = []
  let t = startOfDay(r.from)
  while (t < r.to) {
    const day = dayKey(t)
    const key = grainKey(day, grain)
    const d = new Date(t)
    let next: number
    if (grain === 'day') next = startOfDay(t + DAY + 3_600_000)
    else if (grain === 'week') next = startOfDay(t + (7 - ((d.getDay() + 6) % 7)) * DAY + 3_600_000)
    else if (grain === 'month') next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    else next = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1).getTime()
    out.push({ key, from: Math.max(t, r.from), to: Math.min(next, r.to), day })
    t = next
  }
  return out
}

/**
 * Rows of a range grouped into its trend points: `groups[i]` holds the rows of `buckets[i]`, by each row's day key
 * ('YYYY-MM-DD'); rows whose day falls outside the range are left out.
 */
export function bucketRows<T>(rows: Iterable<T>, r: DateRange, dayOf: (row: T) => string, grain: Grain = grainOf(r)): { grain: Grain; buckets: Bucket[]; groups: T[][] } {
  const buckets = bucketsOf(r, grain)
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  const first = buckets[0]?.day ?? ''
  const last = dayKey(Math.max(r.from, r.to - 1))
  const groups = buckets.map(() => [] as T[])
  for (const row of rows) {
    const day = dayOf(row)
    if (day < first || day > last) continue
    const i = index.get(grainKey(day, grain))
    if (i !== undefined) groups[i]!.push(row)
  }
  return { grain, buckets, groups }
}

/** a trend point's axis label without words: "19.10" (a day; a week by its first day), "10.2026" (a month), "2026 Q4" */
export function bucketLabel(b: Bucket, grain: Grain): string {
  const p2 = (n: number) => String(n).padStart(2, '0')
  const d = new Date(b.from)
  if (grain === 'day' || grain === 'week') return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`
  if (grain === 'month') return `${p2(d.getMonth() + 1)}.${d.getFullYear()}`
  return b.key.replace('-', ' ')
}
