import { useMemo } from 'react'
import type { SelectorFilter } from '@/charts/ChartView'
import { useDb } from '@/data/db'
import { VOCAB } from '@/data/domain'
import { rangeOf, useNow, type DateRange } from '@/data/range'
import { useMeta } from '@/data/source'
import { useBlockEdit } from '@/features/blockedit/context'
import { FILTER_FIELD, usePageScope } from './pageScope'

/** the page's Davr and filters for a chart of `dataset` (a filter whose field the dataset lacks is left out by ChartView) */
export function usePageSelectors(): { range: DateRange; selectors: SelectorFilter[] } {
  const scope = usePageScope()
  const db = useDb()
  const now = useNow()
  const meta = useMeta()
  // the Sdelkalar page's Bosqich is a deal stage, already the dataset's own name
  const onDeals = useBlockEdit()?.page === 'deal'
  const fallback = useMemo(() => rangeOf('30d', now, db.start), [now, db.start])
  const selectors = useMemo(() => {
    const out: SelectorFilter[] = []
    for (const [key, m] of Object.entries(scope?.multi ?? {})) {
      const name = FILTER_FIELD[key]
      if (!name || !m.values.length) continue
      let values: string[] = m.values
      // the page names a lead's stage by its real CRM stage, else by the portal's name for its group; the dataset's
      // Bosqich is the same real stage, else the standard name (data/tables.ts): the picked names plus, for a picked group
      // name, that group's standard name — never a whole group for one of its stages
      if (key === 'stage' && !onDeals) {
        const labels = meta.leadStageLabels as Record<string, string> | undefined
        const std = VOCAB.sales.stages as Record<string, string>
        const extra = Object.keys(std).filter((k) => m.values.includes(labels?.[k] ?? std[k]!)).map((k) => std[k]!)
        values = [...new Set([...m.values, ...extra])]
      }
      out.push({ name, values, exclude: m.exclude })
    }
    return out
  }, [scope?.multi, meta, onDeals])
  return { range: scope?.range ?? fallback, selectors }
}
