/**
 * A page's filter bar as the owner arranged it (owner, 2026-10-26: "I can't change the place of the filters"): the bar's
 * own filters (the Davr presets as one unit = "range", "Mas'ul", "Bosqich", "Manba" …) and the ones added with "+ Filtr"
 * share one order, and a built-in filter can be hidden from viewers (never deleted: the page computes with it). Stored per
 * page beside the added filters (store.ts, server Live/LiveFilters.cs "_layout"). Pure functions, tested in bar.test.ts.
 */
export interface BarLayout {
  /** the bar's filter keys in the owner's order (built-in and added); a key not in it keeps its place next to its neighbour */
  order?: string[]
  /** built-in filters viewers do not see */
  hidden?: string[]
}
/** page id → its bar */
export type BarLayouts = Record<string, BarLayout>

/** the Davr preset group */
export const RANGE_KEY = 'range'

/** the keys a page's own bar can have (server: LiveFilters.BuiltinKeys); only these can be hidden */
export const BAR_BUILTIN_KEYS: readonly string[] = ['range', 'manager', 'stage', 'source', 'direction', 'channel', 'shop', 'campaign', 'platform', 'form', 'form_name', 'adset', 'creative']
export const canHide = (key: string) => BAR_BUILTIN_KEYS.includes(key)

/** the same shape the server accepts for a key (Live/LiveFilters.cs FieldRx) */
const KEY_RX = /^(?:[a-z][a-z0-9_]{0,39}|uf:(?:lead|deal):[A-Za-z0-9_]{1,100})$/

/** the pages' select labels (Uzbek keys, kit MultiSelect `label`) → the field they filter by (fields.ts BUILTIN) */
const LABEL_KEYS: Readonly<Record<string, string>> = {
  "Mas'ul xodim": 'manager',
  "Mas'ul": 'manager',
  Menejer: 'manager',
  Sotuvchi: 'manager',
  Bosqich: 'stage',
  Manba: 'source',
  "Qo'ng'iroq turi": 'direction',
  Kanal: 'channel',
  "Do'kon": 'shop',
}

/**
 * The key of one of the bar's own selects: the element's React key when it is a filter key (Kampaniyalar keys its
 * selects), else the known label, else the label as a slug; null when nothing fits (the child then stays in place).
 */
export function barKeyOf(label: string, key?: string | null): string | null {
  if (key && KEY_RX.test(key)) return key
  const known = LABEL_KEYS[label]
  if (known) return known
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return KEY_RX.test(slug) && !slug.startsWith('uf') ? slug : null
}

/**
 * The bar's keys before any saved order: the page's own filters, and the added ones right after the period (owner,
 * 2026-11-09: "the Proyekt filter right next to «Davr: 30 kun»") — after the last of them when the page has no period.
 */
export function barKeys(builtins: readonly string[], added: readonly string[]): string[] {
  const at = builtins.indexOf(RANGE_KEY)
  if (at < 0) return [...builtins, ...added]
  return [...builtins.slice(0, at + 1), ...added, ...builtins.slice(at + 1)]
}

/**
 * The bar's keys in the saved order. The saved keys that are on the bar come first, as saved; a key the order does not
 * know (a filter added later, a new built-in one) goes right after the key before it on the page, or first.
 */
export function arrange(keys: readonly string[], order?: readonly string[]): string[] {
  if (!order?.length) return [...keys]
  const have = new Set(keys)
  const out: string[] = []
  for (const k of order) if (have.has(k) && !out.includes(k)) out.push(k)
  keys.forEach((k, i) => {
    if (out.includes(k)) return
    let at = 0
    for (let j = i - 1; j >= 0; j--) {
      const p = out.indexOf(keys[j]!)
      if (p >= 0) {
        at = p + 1
        break
      }
    }
    out.splice(at, 0, k)
  })
  return out
}

/** `keys` with the key at `from` moved to `to` (null when it does not move) */
export function moveKey(keys: readonly string[], from: number, to: number): string[] | null {
  if (from === to || from < 0 || to < 0 || from >= keys.length || to >= keys.length) return null
  const next = [...keys]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x!)
  return next
}

/** the key dropped before / after `target` (null when nothing changes) */
export function dropKey(keys: readonly string[], key: string, target: string, after: boolean): string[] | null {
  if (key === target || !keys.includes(key) || !keys.includes(target)) return null
  const rest = keys.filter((k) => k !== key)
  rest.splice(rest.indexOf(target) + (after ? 1 : 0), 0, key)
  return rest.join('\u0000') === keys.join('\u0000') ? null : rest
}

/** a built-in key hidden or shown again */
export function withHiddenKey(layout: BarLayout | undefined, key: string, hide: boolean): BarLayout {
  const was = layout?.hidden ?? []
  const hidden = hide ? (was.includes(key) || !canHide(key) ? was : [...was, key]) : was.filter((k) => k !== key)
  return { ...layout, hidden }
}

/** the layout as it is stored: no empty lists, nothing twice, only keys of the right shape; null when nothing is left */
export function cleanLayout(layout: BarLayout | null | undefined): BarLayout | null {
  if (!layout) return null
  const uniq = (xs: unknown, ok: (k: string) => boolean) => [...new Set(Array.isArray(xs) ? xs.filter((k): k is string => typeof k === 'string' && ok(k)) : [])]
  const order = uniq(layout.order, (k) => KEY_RX.test(k)).slice(0, 40)
  const hidden = uniq(layout.hidden, canHide)
  const out: BarLayout = {}
  if (order.length) out.order = order
  if (hidden.length) out.hidden = hidden
  return out.order || out.hidden ? out : null
}

/** the page's layouts with one page's bar replaced (null = back to the page's own order, everything shown) */
export function withLayout(all: BarLayouts, page: string, layout: BarLayout | null): BarLayouts {
  const next = { ...all }
  const clean = cleanLayout(layout)
  if (clean) next[page] = clean
  else delete next[page]
  return next
}
