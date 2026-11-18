import { DAY, startOfDay, type DateRange } from '@/data/range'

/** what a table of the data source holds: its first and last record (epoch ms) and how many */
export interface Coverage {
  from: number
  to: number
  count: number
}

/** a date before this is a missing one (a row without a creation date reads as 1970), not the first record */
const REAL_FROM = Date.UTC(2000, 0, 1)

/** the first and last record of rows (by `ts`), or null when there are none */
export function coverageOf<T>(rows: readonly T[], ts: (row: T) => number): Coverage | null {
  let from = Infinity
  let to = -Infinity
  let count = 0
  for (const r of rows) {
    const t = ts(r)
    count++
    if (t < REAL_FROM) continue
    if (t < from) from = t
    if (t > to) to = t
  }
  return count && Number.isFinite(from) ? { from, to, count } : null
}

/**
 * True when the chosen period reaches past what the source holds — it starts more than a day before the first record, or
 * ends more than a day after the last one — so an empty or thin page is the data's edge, not a quiet business (2026-11-09:
 * calls chosen for 26–31 Oct showed 00:00 everywhere; the newest call was two days old). A period inside the data: false.
 */
export function periodOutside(c: Coverage | null, r: DateRange): boolean {
  if (!c) return true
  const first = startOfDay(c.from)
  const lastDay = startOfDay(c.to)
  const periodLastDay = startOfDay(Math.max(r.from, r.to - 1))
  return startOfDay(r.from) < first - DAY || periodLastDay > lastDay + DAY
}

/** the line is shown: the period reaches past the data, or holds none of it (a hole inside the data, e.g. a cut import) */
export function coverageShown<T>(c: Coverage | null, rows: readonly T[], ts: (row: T) => number, r: DateRange): boolean {
  if (periodOutside(c, r)) return true
  return !rows.some((x) => {
    const t = ts(x)
    return t >= r.from && t < r.to
  })
}
