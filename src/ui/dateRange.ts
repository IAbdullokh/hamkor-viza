import type { Lang } from '@/lib/settings'

/**
 * The date range picker's logic (ui/DateRangePicker), kept pure so it is tested on its own. Days are 'YYYY-MM-DD'
 * in the browser's local time (Tashkent for our users), the same as data/range.ts; a range is inclusive at both ends.
 */
export interface DayRange {
  from: string
  to: string
}

/** what is picked so far: nothing, a start (hovering for the end), or both ends */
export interface Picking {
  start: string | null
  end: string | null
}

export type DayPreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'prevMonth' | 'quarter' | 'year' | 'prevYear' | 'all'

export const DAY_PRESETS: { key: DayPreset; label: string }[] = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: '7d', label: 'Oxirgi 7 kun' },
  { key: '30d', label: 'Oxirgi 30 kun' },
  { key: 'month', label: 'Bu oy' },
  { key: 'prevMonth', label: "O'tgan oy" },
  { key: 'quarter', label: 'Bu chorak' },
  { key: 'year', label: 'Bu yil' },
  { key: 'prevYear', label: "O'tgan yil" },
  { key: 'all', label: 'Butun davr' },
]

const pad = (n: number) => String(n).padStart(2, '0')

/** the day key of a local calendar date (month 0-based; overflowing days / months roll over) */
export function ymd(y: number, m: number, d: number): string {
  const x = new Date(y, m, d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function partsOf(day: string): [y: number, m: number, d: number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y!, m! - 1, d!]
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = partsOf(day)
  return ymd(y, m, d + n)
}

export function addMonths(day: string, n: number): string {
  const [y, m] = partsOf(day)
  return ymd(y, m + n, 1)
}

export const minDay = (a: string, b: string) => (a < b ? a : b)
export const maxDay = (a: string, b: string) => (a > b ? a : b)

export function clampDay(day: string, min?: string, max?: string): string {
  let x = day
  if (min && x < min) x = min
  if (max && x > max) x = max
  return x
}

/**
 * A click on a day: the first click is the start, the second the end (an earlier day than the start swaps them);
 * a click after both ends are set starts a new range.
 */
export function pickDay(p: Picking, day: string): Picking {
  if (!p.start || p.end) return { start: day, end: null }
  return day < p.start ? { start: day, end: p.start } : { start: p.start, end: day }
}

/** the range drawn on the calendar: the picked one, or start → the hovered day while the end is being chosen */
export function shownRange(p: Picking, hover: string | null): DayRange | null {
  if (!p.start) return null
  const end = p.end ?? hover ?? p.start
  return { from: minDay(p.start, end), to: maxDay(p.start, end) }
}

export function rangeOfPicking(p: Picking): DayRange | null {
  if (!p.start) return null
  return { from: p.start, to: p.end ?? p.start }
}

/** a preset's days for `today`; `min` = the data's first day ("Butun davr" starts there; nothing before it) */
export function presetDays(key: DayPreset, today: string, min?: string): DayRange {
  const [y, m] = partsOf(today)
  let r: DayRange
  switch (key) {
    case 'today':
      r = { from: today, to: today }
      break
    case 'yesterday': {
      const d = addDays(today, -1)
      r = { from: d, to: d }
      break
    }
    case '7d':
      r = { from: addDays(today, -6), to: today }
      break
    case '30d':
      r = { from: addDays(today, -29), to: today }
      break
    case 'month':
      r = { from: ymd(y, m, 1), to: today }
      break
    case 'prevMonth':
      r = { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) }
      break
    case 'quarter':
      r = { from: ymd(y, m - (m % 3), 1), to: today }
      break
    case 'year':
      r = { from: ymd(y, 0, 1), to: today }
      break
    case 'prevYear':
      r = { from: ymd(y - 1, 0, 1), to: ymd(y - 1, 11, 31) }
      break
    case 'all':
      r = { from: min ?? ymd(y, 0, 1), to: today }
      break
  }
  // a preset never reaches before the data starts (an empty one stays a single day at the start)
  if (min && r.from < min) r = { from: min, to: maxDay(r.to, min) }
  return r
}

/** the preset these days are, if any (the list highlights it) */
export function presetOf(r: DayRange | null, today: string, min?: string): DayPreset | null {
  if (!r) return null
  return DAY_PRESETS.find((p) => {
    const x = presetDays(p.key, today, min)
    return x.from === r.from && x.to === r.to
  })?.key ?? null
}

/** a month's weeks, Monday first; days of the months around it fill the first and last week (null = blank) */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(ymd(year, month, d))
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** "12.05.2026" (also 12/05/2026, 12-05-2026, 2026-05-12) → '2026-05-12'; null when it is not a real date */
export function parseTyped(s: string): string | null {
  const x = s.trim()
  let y: number, m: number, d: number
  let hit = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(x)
  if (hit) [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  else {
    hit = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(x)
    if (!hit) return null
    ;[d, m, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const day = ymd(y, m - 1, d)
  return day === `${y}-${pad(m)}-${pad(d)}` ? day : null
}

/** "12.05.2026 – 31.05.2026" (or one date) → the range; the ends in any order */
export function parseTypedRange(s: string): DayRange | null {
  const parts = s.split(/\s*(?:–|—|\s-\s|\.\.)\s*/).filter(Boolean)
  if (parts.length < 1 || parts.length > 2) return null
  const a = parseTyped(parts[0]!)
  const b = parts[1] ? parseTyped(parts[1]) : a
  if (!a || !b) return null
  return { from: minDay(a, b), to: maxDay(a, b) }
}

export const typedDay = (day: string) => {
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y}`
}

export const typedRange = (r: DayRange) => (r.from === r.to ? typedDay(r.from) : `${typedDay(r.from)} – ${typedDay(r.to)}`)

export const LOCALE: Record<Lang, string> = { uz: 'uz-Latn', ru: 'ru-RU', en: 'en-GB' }

/**
 * Uzbek names when the browser's Intl has no Uzbek data (a reduced ICU, e.g. a headless Chrome, gives "M05" / "Mon");
 * Russian and English always come from Intl.
 */
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const UZ_WEEKDAYS = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba']
let uzIntl: boolean | null = null
const intlKnowsUz = () =>
  (uzIntl ??= (() => {
    try {
      return new Intl.DateTimeFormat('uz-Latn', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 15))).toLowerCase() === 'yanvar'
    } catch {
      return false
    }
  })())
const ownUz = (lang: Lang) => lang === 'uz' && !intlKnowsUz()

const monthName = (lang: Lang, m: number, form: 'long' | 'short') =>
  ownUz(lang)
    ? (form === 'long' ? UZ_MONTHS : UZ_MONTHS_SHORT)[m]!
    : new Intl.DateTimeFormat(LOCALE[lang], { month: form, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m, 15)))

/** "may", "мая", "May" — the month as it is said after a day number */
function dayMonth(lang: Lang, day: string): string {
  const [y, m, d] = partsOf(day)
  if (lang === 'uz') return `${d}-${monthName('uz', m, 'long').toLowerCase()}`
  // the genitive form ("12 мая") comes from formatting a whole date
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return fmt.format(new Date(Date.UTC(y, m, d)))
}

/** "12-may – 31-may 2026" / "12 мая – 31 мая 2026" / "12 May – 31 May 2026"; the year once when both ends share it */
export function formatRange(r: DayRange, lang: Lang, withYear = true): string {
  const yf = r.from.slice(0, 4)
  const yt = r.to.slice(0, 4)
  const a = dayMonth(lang, r.from)
  const b = dayMonth(lang, r.to)
  if (r.from === r.to) return withYear ? `${a} ${yt}` : a
  if (yf !== yt) return `${a} ${yf} – ${b} ${yt}`
  return withYear ? `${a} – ${b} ${yt}` : `${a} – ${b}`
}

/** "May 2026" heading of a calendar month */
export function monthTitle(lang: Lang, year: number, month: number): string {
  const name = monthName(lang, month, 'long')
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

export function monthNames(lang: Lang): string[] {
  return Array.from({ length: 12 }, (_, m) => {
    const s = monthName(lang, m, 'short').replace('.', '')
    return `${s.charAt(0).toUpperCase()}${s.slice(1)}`
  })
}

/** Mon … Sun, short */
export function weekdayNames(lang: Lang): string[] {
  if (ownUz(lang)) return ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', timeZone: 'UTC' })
  // 2026-01-05 is a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const s = fmt.format(new Date(Date.UTC(2026, 0, 5 + i))).replace('.', '')
    return `${s.charAt(0).toUpperCase()}${s.slice(1, 2)}`
  })
}

export function longDay(lang: Lang, day: string): string {
  const [y, m, d] = partsOf(day)
  if (ownUz(lang)) return `${UZ_WEEKDAYS[(new Date(y, m, d).getDay() + 6) % 7]}, ${d}-${UZ_MONTHS[m]} ${y}`
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, d)))
}
