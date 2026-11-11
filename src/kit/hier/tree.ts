/**
 * A table's hierarchy (owner, 2026-10-26, on the flat "Manba bo'yicha" table: "when I want to change the table it should
 * ask for the hierarchy, like in DataLens — or the AI should do it itself"). Pure parts, tested in tree.test.ts: the
 * records grouped level by level (Manba → Mas'ul → Sana (oy)), each group's row made from ITS records by the page's own
 * row maker — so a rate like Konversiya is recomputed per group, never summed — and the tree shown as rows with the
 * opened ones' children right under them.
 *
 * Saved in the block's table patch as `levels` (≤ 3 dim keys, the table's own first; validated in LiveBlocks.cs).
 */

/** a breakdown a table can be nested by: its key (table.levels), its name, a record's value, and how its values sort */
export interface HierDim<T> {
  key: string
  /** Uzbek key (translated where shown) */
  label: string
  keyOf: (r: T) => string | null | undefined
  /** the value as shown (a date "2026-10" → "Oktabr 2026"); default: the value itself (translated) */
  title?: (k: string) => string
  /** the groups' order (dates newest first, stages in pipeline order); default: the biggest group first */
  order?: (a: string, b: string) => number
}

export const MAX_LEVELS = 3
/** what a record without a value is grouped under (the same as the lead model's groupBy) */
export const NONE = 'Belgilanmagan'

export interface HierNode<R> {
  /** the group's value at its level ("Instagram", "Ali Valiyev", "2026-10") */
  key: string
  /** every value from the top down, joined by "|" — unique in the table */
  path: string
  depth: number
  /** the dim this level groups by */
  dim: string
  /** the page's row for this group (counts / measures over its records) */
  row: R
  /** how many records (the default order: biggest first) */
  size: number
  parent: HierNode<R> | null
  kids: HierNode<R>[]
}

/**
 * The records grouped by each dim in turn. `make` builds a row from a group's records (the same maker the flat table
 * uses), so subtotals and rates are the group's own. Groups with no records never appear; a record without a value
 * goes under "Belgilanmagan".
 */
export function buildTree<T, R>(records: T[], dims: HierDim<T>[], make: (key: string, records: T[], dim: HierDim<T>) => R): HierNode<R>[] {
  const level = (rs: T[], depth: number, parent: HierNode<R> | null): HierNode<R>[] => {
    const dim = dims[depth]
    if (!dim) return []
    const groups = new Map<string, T[]>()
    for (const r of rs) {
      const k = dim.keyOf(r) || NONE
      let arr = groups.get(k)
      if (!arr) groups.set(k, (arr = []))
      arr.push(r)
    }
    const keys = [...groups.keys()]
    keys.sort(dim.order ?? ((a, b) => groups.get(b)!.length - groups.get(a)!.length))
    return keys.map((k) => {
      const recs = groups.get(k)!
      const node: HierNode<R> = { key: k, path: parent ? `${parent.path}|${k}` : k, depth, dim: dim.key, row: make(k, recs, dim), size: recs.length, parent, kids: [] }
      node.kids = level(recs, depth + 1, node)
      return node
    })
  }
  return level(records, 0, null)
}

/** the rows shown: each node, and right under it its children when it is opened */
export function visibleNodes<R>(tops: HierNode<R>[], open: ReadonlySet<string>): HierNode<R>[] {
  const out: HierNode<R>[] = []
  const walk = (ns: HierNode<R>[]) => {
    for (const n of ns) {
      out.push(n)
      if (n.kids.length && open.has(n.path)) walk(n.kids)
    }
  }
  walk(tops)
  return out
}

/** every node that has children ("Hammasini ochish") */
export function openablePaths<R>(tops: HierNode<R>[]): string[] {
  const out: string[] = []
  const walk = (ns: HierNode<R>[]) => {
    for (const n of ns)
      if (n.kids.length) {
        out.push(n.path)
        walk(n.kids)
      }
  }
  walk(tops)
  return out
}

/** the node's top-level ancestor (the table sorts by its values, so children stay right under their parent) */
export const topOf = <R,>(n: HierNode<R>): HierNode<R> => (n.parent ? topOf(n.parent) : n)

/**
 * The levels a table takes from its patch: the table's own dim first, then known dims only, no repeats, ≤ 3. Fewer than
 * two levels = no hierarchy (an empty list).
 */
export function cleanLevels(levels: readonly string[] | undefined, base: string, known: readonly string[]): string[] {
  const out = [base]
  for (const k of levels ?? []) if (known.includes(k) && !out.includes(k)) out.push(k)
  return out.length > 1 ? out.slice(0, MAX_LEVELS) : []
}
