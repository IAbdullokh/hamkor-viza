import { useEffect, useSyncExternalStore } from 'react'
import type { DateRange, RangeKey } from '@/data/range'

/**
 * What the open dashboard page is filtered by (its Davr preset and its multi-selects), so the charts added with
 * "Grafik qo'shish" show the same period and the same Mas'ul / Manba / Bosqich choice as the page's own blocks.
 * The page's filter state (kit/filters usePageFilters) publishes here; one page is open at a time.
 */
export interface PageMulti {
  values: string[]
  exclude: boolean
}

export interface PageScope {
  /** 'custom' = days picked with "Boshqa davr…" (the range has them) */
  preset: RangeKey | 'custom'
  range: DateRange
  /** filter key (manager, source, stage, operator …) → the choice */
  multi: Record<string, PageMulti>
}

let current: PageScope | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function setPageScope(s: PageScope | null): void {
  current = s
  emit()
}

export function usePageScope(): PageScope | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => current,
    () => current,
  )
}

/** called by the page filter state: publishes while the page is mounted */
export function usePublishPageScope(preset: RangeKey | 'custom', range: DateRange, multi: Record<string, PageMulti>): void {
  useEffect(() => {
    setPageScope({ preset, range, multi })
  }, [preset, range, multi])
  useEffect(() => () => setPageScope(null), [])
}

/**
 * The page filter keys as dataset dimension names (data/datasets.ts). A key with no matching field in a chart's
 * dataset is left out for that chart (a Manba filter does not empty a calls chart).
 */
export const FILTER_FIELD: Record<string, string> = {
  manager: "Mas'ul",
  source: 'Manba',
  stage: 'Bosqich',
  operator: 'Operator',
  campaign: 'Kampaniya',
}
