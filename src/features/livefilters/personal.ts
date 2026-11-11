import type { FilterItem } from './fields'
import { arrange, canHide, type BarLayout } from './bar'

/**
 * Each viewer's own filters (owner, 2026-10-26: "every person should be able to change the filters they need, add them
 * themselves — stored in their browser, not on the server, like in Bitrix; if they change nothing or the browser storage
 * is lost, the defaults we set on the dashboard show"). The dashboard's filters (store.ts, edited in edit mode) are the
 * defaults for everyone; on top of them this browser keeps, per dashboard and page, what the viewer added, removed and
 * how they ordered the bar. Pure functions (tested in personal.test.ts) + a storage that never throws.
 */
export interface MyFilters {
  /** fields this viewer added ("+ Filtr") that are not among the dashboard's defaults */
  added: string[]
  /** filters this viewer took off their bar: a default added filter, or one of the page's own (built-in) filters */
  removed: string[]
  /** the bar's keys in this viewer's order (bar.ts arrange) */
  order?: string[]
}

export const NO_MINE: MyFilters = { added: [], removed: [] }
const VERSION = 1
const MAX_KEYS = 40
/** the same key shape the dashboard's filters use (bar.ts / Live/LiveFilters.cs FieldRx) */
const KEY_RX = /^(?:[a-z][a-z0-9_]{0,39}|uf:(?:lead|deal):[A-Za-z0-9_]{1,100})$/

/** where this browser keeps a viewer's filters for one dashboard page (scope = "live:<slug>" / "demo:<id>") */
export const myKey = (scope: string, page: string) => `d365.myfilters.${scope}|${page}`

const keys = (xs: unknown): string[] => [...new Set(Array.isArray(xs) ? xs.filter((k): k is string => typeof k === 'string' && KEY_RX.test(k)) : [])].slice(0, MAX_KEYS)

/** what was read → a viewer's filters; anything not of the shape (old, broken, another version) is ignored → null */
export function cleanMine(raw: unknown): MyFilters | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (r.v !== VERSION) return null
  const out: MyFilters = { added: keys(r.added), removed: keys(r.removed) }
  const order = keys(r.order)
  if (order.length) out.order = order
  return isEmptyMine(out) ? null : out
}

export const isEmptyMine = (m: MyFilters | null | undefined) => !m || (!m.added.length && !m.removed.length && !m.order?.length)

/** this viewer's filters for a page; null when there are none, storage is blocked or what is there is not usable */
export function readMine(key: string, store: Pick<Storage, 'getItem'> | undefined = safeStorage()): MyFilters | null {
  try {
    const raw = store?.getItem(key)
    return raw ? cleanMine(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

/** stores them (nothing left → the entry is removed, so the page follows the defaults again); false when it could not */
export function writeMine(key: string, m: MyFilters | null, store: Pick<Storage, 'setItem' | 'removeItem'> | undefined = safeStorage()): boolean {
  try {
    if (!store) return false
    if (isEmptyMine(m)) store.removeItem(key)
    else store.setItem(key, JSON.stringify({ v: VERSION, added: m!.added, removed: m!.removed, ...(m!.order?.length ? { order: m!.order } : {}) }))
    return true
  } catch {
    return false
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

/**
 * The page's added filters this viewer sees: the dashboard's defaults (with their default values) minus the ones they
 * removed, then the ones they added (no value). `has` = the field is still one this data can filter by: a field that is
 * gone is dropped silently; a default added later shows unless the viewer removed it.
 */
export function mergeItems(defaults: FilterItem[], mine: MyFilters | null, has: (field: string) => boolean): FilterItem[] {
  const base = defaults.filter((i) => has(i.field))
  if (!mine) return base
  const out = base.filter((i) => !mine.removed.includes(i.field))
  for (const f of mine.added) if (has(f) && !out.some((i) => i.field === f) && !mine.removed.includes(f)) out.push({ field: f })
  return out
}

/**
 * The page's bar as this viewer sees it: the dashboard's order with theirs on top (a key their order does not know —
 * a filter the owner added later — keeps its place next to its neighbour), the dashboard's hidden filters plus the
 * page's own filters they removed.
 */
export function mergeLayout(defaults: BarLayout | undefined, mine: MyFilters | null): BarLayout | undefined {
  if (!mine) return defaults
  const owner = defaults?.order ?? []
  const order = mine.order?.length ? arrange([...owner, ...mine.order.filter((k) => !owner.includes(k))], mine.order) : owner
  const hidden = [...new Set([...(defaults?.hidden ?? []), ...mine.removed.filter(canHide)])]
  const out: BarLayout = {}
  if (order.length) out.order = order
  if (hidden.length) out.hidden = hidden
  return out.order || out.hidden ? out : undefined
}

/** fields added ("+ Filtr"): one the viewer removed earlier comes back, a new one is added after theirs */
export function addMine(mine: MyFilters | null, fields: string[], defaults: readonly string[]): MyFilters {
  const m = { ...NO_MINE, ...mine }
  let removed = [...m.removed]
  const added = [...m.added]
  for (const f of fields) {
    if (removed.includes(f)) removed = removed.filter((k) => k !== f)
    else if (!defaults.includes(f) && !added.includes(f)) added.push(f)
  }
  return { ...m, added, removed }
}

/** a filter taken off this viewer's bar: their own one is forgotten, a default (or the page's own) one is remembered as removed */
export function removeMine(mine: MyFilters | null, key: string): MyFilters {
  const m = { ...NO_MINE, ...mine }
  if (m.added.includes(key)) return { ...m, added: m.added.filter((k) => k !== key) }
  return m.removed.includes(key) ? m : { ...m, removed: [...m.removed, key] }
}

/** a removed one put back */
export function restoreMine(mine: MyFilters | null, key: string): MyFilters {
  const m = { ...NO_MINE, ...mine }
  return { ...m, removed: m.removed.filter((k) => k !== key) }
}

export function orderMine(mine: MyFilters | null, order: string[] | undefined): MyFilters {
  const m = { ...NO_MINE, ...mine }
  const o = keys(order)
  const out: MyFilters = { added: m.added, removed: m.removed }
  if (o.length) out.order = o
  return out
}
