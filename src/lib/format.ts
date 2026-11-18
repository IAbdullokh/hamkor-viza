import type { Lang } from './settings'

/**
 * Number and date formatting. Uzbek style: space as thousands separator, comma as decimal mark,
 * money in so'm ("12 450 000 so'm", compact "12,4 mln so'm").
 */

const LOCALE: Record<Lang, string> = { uz: 'uz-Latn-UZ', ru: 'ru-RU', en: 'en-US' }

function group(n: number, digits = 0, lang: Lang = 'uz'): string {
  const fixed = Math.abs(n).toFixed(digits)
  const [int, frac] = fixed.split('.') as [string, string | undefined]
  const sep = lang === 'en' ? ',' : ' '
  const dec = lang === 'en' ? '.' : ','
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  return (n < 0 ? '−' : '') + grouped + (frac ? dec + frac : '')
}

export function fmtNum(n: number, digits = 0, lang: Lang = 'uz'): string {
  return group(n, digits, lang)
}

const COMPACT: Record<Lang, [number, string][]> = {
  uz: [[1e12, 'trln'], [1e9, 'mlrd'], [1e6, 'mln'], [1e3, 'ming']],
  ru: [[1e12, 'трлн'], [1e9, 'млрд'], [1e6, 'млн'], [1e3, 'тыс']],
  en: [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']],
}

/** 12 400 000 → "12,4 mln" */
export function fmtCompact(n: number, lang: Lang = 'uz'): string {
  const abs = Math.abs(n)
  for (const [v, unit] of COMPACT[lang]) {
    if (abs >= v) {
      const x = n / v
      const digits = Math.abs(x) >= 100 ? 0 : 1
      const s = group(x, digits, lang).replace(/[,.]0$/, '')
      return lang === 'en' ? `${s}${unit}` : `${s} ${unit}`
    }
  }
  return group(n, 0, lang)
}

const CURRENCY: Record<Lang, string> = { uz: "so'm", ru: 'сум', en: 'UZS' }

export function fmtMoney(n: number, lang: Lang = 'uz', compact = false): string {
  const body = compact ? fmtCompact(n, lang) : group(Math.round(n), 0, lang)
  return lang === 'en' ? `${body} ${CURRENCY.en}` : `${body} ${CURRENCY[lang]}`
}

export function fmtUsd(n: number, lang: Lang = 'uz'): string {
  return `$${group(n, n < 100 ? 2 : 0, lang)}`
}

export function fmtPct(ratio: number, digits = 1, lang: Lang = 'uz'): string {
  return `${group(ratio * 100, digits, lang).replace(/[,.]0$/, '')}%`
}

/** Seconds → "3:07" or "1:02:45" */
export function fmtDuration(sec: number): string {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']

/** "dushanba, 19-oktabr" */
export function fmtLongDate(d: Date, lang: Lang = 'uz'): string {
  if (lang === 'uz') return `${UZ_DAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`
  return d.toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "19-okt" / "19 окт" / "Oct 19" */
export function fmtShortDate(d: Date, lang: Lang = 'uz'): string {
  if (lang === 'uz') return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}`
  return d.toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' })
}

export function fmtMonth(d: Date, lang: Lang = 'uz'): string {
  if (lang === 'uz') return `${UZ_MONTHS[d.getMonth()]![0]!.toUpperCase()}${UZ_MONTHS[d.getMonth()]!.slice(1)} ${d.getFullYear()}`
  return d.toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric' })
}

export function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "5 daqiqa oldin" style relative time for sync stamps. */
export function fmtAgo(minutes: number, lang: Lang = 'uz'): string {
  const m = Math.round(minutes)
  const L = {
    uz: { now: 'hozirgina', min: 'daqiqa oldin', h: 'soat oldin', d: 'kun oldin' },
    ru: { now: 'только что', min: 'мин назад', h: 'ч назад', d: 'дн назад' },
    en: { now: 'just now', min: 'min ago', h: 'h ago', d: 'd ago' },
  }[lang]
  if (m < 1) return L.now
  if (m < 60) return `${m} ${L.min}`
  if (m < 60 * 24) return `${Math.round(m / 60)} ${L.h}`
  return `${Math.round(m / 1440)} ${L.d}`
}
