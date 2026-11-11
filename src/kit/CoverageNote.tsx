import { useMemo } from 'react'
import { useT } from '@/i18n'
import { fmtNum } from '@/lib/format'
import type { DateRange } from '@/data/range'
import { coverageOf, coverageShown } from './coverage'

const dmy = (ts: number) => {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/**
 * One factual line under the filters, only when the chosen period reaches past the data the dashboard holds (or holds none of it): "Qo'ng'iroqlar:
 * 12.07.2026 – 07.11.2026 · 5 398 ta". A period inside the data shows nothing (no helper lines in dashboards); a missing
 * range or a stale import is seen as such instead of as an empty page.
 */
export function CoverageNote<T>({ what, rows, ts, range }: { what: string; rows: readonly T[]; ts: (row: T) => number; range: DateRange }) {
  const { t, lang } = useT()
  const c = useMemo(() => coverageOf(rows, ts), [rows, ts])
  const shown = useMemo(() => coverageShown(c, rows, ts, range), [c, rows, ts, range])
  if (!shown) return null
  return (
    <p className="num mb-3 text-[0.8125rem] text-ink-3" data-coverage={what}>
      {c ? t('{what}: {from} – {to} · {n} ta', { what: t(what), from: dmy(c.from), to: dmy(c.to), n: fmtNum(c.count, 0, lang) }) : t("{what}: ma'lumot yo'q", { what: t(what) })}
    </p>
  )
}
