import type { Lang } from '@/lib/settings'
import { fmtCompact, fmtDuration, fmtMoney, fmtNum, fmtPct, fmtShortDate } from '@/lib/format'
import type { Format } from '@/spec'

const WEEKDAYS: Record<Lang, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const WEEKDAY_RANK = new Map<string, number>(
  [
    ...Object.values(WEEKDAYS),
    ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
    ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ].flatMap((names) => names.map((n, i) => [n.toLowerCase(), i] as const)),
)

/** a weekday label's place Monday → Sunday (0–6) in any dashboard language, -1 when it is not one */
export function weekdayRank(v: unknown): number {
  return typeof v === 'string' ? (WEEKDAY_RANK.get(v.trim().toLowerCase()) ?? -1) : -1
}

/** Format a query value for labels, tooltips and tables. `compact` shortens big numbers for axes. */
export function formatValue(v: unknown, format: Format | undefined, lang: Lang, compact = false): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? (lang === 'ru' ? 'Да' : lang === 'en' ? 'Yes' : 'Ha') : lang === 'ru' ? 'Нет' : lang === 'en' ? 'No' : "Yo'q"
  if (typeof v === 'string') {
    if (format === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtShortDate(new Date(`${v}T00:00:00`), lang)
    return v
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  switch (format) {
    case 'weekday':
      return (WEEKDAYS[lang][n - 1] ?? String(n))
    case 'hour':
      return `${String(n).padStart(2, '0')}:00`
    case 'money':
      return compact ? fmtCompact(n, lang) : fmtMoney(n, lang, n >= 10_000_000)
    case 'usd':
      return `$${compact && n >= 100_000 ? fmtCompact(n, lang) : fmtNum(n, n < 100 ? 2 : 0, lang)}`
    case 'percent':
      return fmtPct(n, n < 0.1 ? 1 : 1, lang)
    case 'duration':
      return fmtDuration(n)
    case 'minutes':
      return `${fmtNum(n, 1, lang)} ${lang === 'en' ? 'min' : lang === 'ru' ? 'мин' : 'daq'}`
    case 'decimal':
      return fmtNum(n, 1, lang)
    default:
      return compact && Math.abs(n) >= 10_000 ? fmtCompact(n, lang) : fmtNum(n, Number.isInteger(n) ? 0 : 1, lang)
  }
}
