import type { FilterItem } from './fields'
import { cleanLayout, withLayout, type BarLayout } from './bar'
import type { StoredFilters } from './store'

/**
 * The filter section in the dashboard's "← Ortga" / "Oldinga →" (owner, 2026-10-26: undo should cover the filters too):
 * a step keeps one page's filter state — its added filters and its bar (bar.ts) — before and after the change, under the
 * history's "#filters" key (blockedit/history.ts). Edit mode only: the viewers' own filters (personal.ts) are not in it.
 * Pure functions, tested in undo.test.ts.
 */
export interface PageFilterState {
  items?: FilterItem[]
  layout?: BarLayout
}

/** one page's filters as stored: nothing set = undefined (so "no filters" and "an empty bar" are the same state) */
export function pageState(all: StoredFilters, page: string): PageFilterState | undefined {
  const items = all.pages[page]
  const layout = cleanLayout(all.layout[page])
  const out: PageFilterState = {}
  if (items?.length) out.items = items
  if (layout) out.layout = layout
  return out.items || out.layout ? out : undefined
}

/** the stored filters with one page's state put back (an undo / redo) */
export function withPageState(all: StoredFilters, page: string, state: PageFilterState | undefined): StoredFilters {
  const pages = { ...all.pages }
  if (state?.items?.length) pages[page] = state.items
  else delete pages[page]
  return { ...all, pages, layout: withLayout(all.layout, page, state?.layout ?? null) }
}

type T = (uz: string, vars?: Record<string, string | number>) => string

/**
 * A filter step's name for the arrows' tooltip ("Ortga: «Manba» filtri qo'shildi"). `name` gives a filter's name (none =
 * the words without it). The words go through `t` (i18n/dict/undo.ts has their ru / en).
 */
export function filterStepLabel(before: PageFilterState | undefined, after: PageFilterState | undefined, name: (key: string) => string | undefined, t: T): string {
  const fb = (before?.items ?? []).map((i) => i.field)
  const fa = (after?.items ?? []).map((i) => i.field)
  const added = fa.filter((f) => !fb.includes(f))
  const removed = fb.filter((f) => !fa.includes(f))
  const hb = before?.layout?.hidden ?? []
  const ha = after?.layout?.hidden ?? []
  const hidden = ha.filter((k) => !hb.includes(k))
  const shown = hb.filter((k) => !ha.includes(k))
  const one = (keys: string[], named: string, plain: string, many: string) => {
    if (keys.length > 1) return t(many, { n: keys.length })
    const n = name(keys[0]!)
    return n ? t(named, { name: n }) : t(plain)
  }
  if (added.length) return one(added, "«{name}» filtri qo'shildi", "Filtr qo'shildi", "{n} ta filtr qo'shildi")
  if (removed.length || hidden.length)
    return one([...removed, ...hidden], '«{name}» filtri olib tashlandi', 'Filtr olib tashlandi', '{n} ta filtr olib tashlandi')
  if (shown.length) return one(shown, '«{name}» filtri qaytarildi', 'Filtr qaytarildi', '{n} ta filtr qaytarildi')
  const order = (s: PageFilterState | undefined) => JSON.stringify(s?.layout?.order ?? null)
  if (order(before) !== order(after) || fb.join('\u0000') !== fa.join('\u0000')) return t('Filtrlar tartibi')
  const value = (s: PageFilterState | undefined, f: string) => JSON.stringify(s?.items?.find((i) => i.field === f)?.value ?? null)
  const changed = fa.filter((f) => value(before, f) !== value(after, f))
  if (changed.length === 1) {
    const n = name(changed[0]!)
    if (n) return t('«{name}» standart qiymati', { name: n })
  }
  return t("Filtrlardagi o'zgarish")
}
