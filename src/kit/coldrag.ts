import { orderedKeys, tidyTable, type TablePatch } from '@/features/blockedit/patch'

/**
 * Moving and sizing a table's columns by hand (owner, 2026-10-26: "I should be able to change the columns' places myself
 * by dragging them to the right or to the left with the cursor"): a header dragged left / right lands between two shown
 * columns (a vertical line shows where), Alt+← / → moves it one place, its right edge drags its width (double click =
 * automatic again). The first (label) column always stays first. Pure parts (coldrag.test.ts): where a drop lands, the
 * new order (hidden columns keep their place among the others) and a column's width; DataTable draws and saves them.
 */

/** the narrowest and widest a column may be dragged to, in CSS pixels */
export const MIN_COL_WIDTH = 56
export const MAX_COL_WIDTH = 640

/** a column's width as kept: a whole number of pixels within the limits; anything else is no width (automatic) */
export function clampWidth(px: unknown): number | undefined {
  if (typeof px !== 'number' || !Number.isFinite(px) || px <= 0) return undefined
  return Math.round(Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, px)))
}

/** the saved widths of known keys only (a column the table no longer has, a broken value, are left out) */
export function cleanWidths(w: unknown, keys?: string[]): Record<string, number> | undefined {
  if (!w || typeof w !== 'object' || Array.isArray(w)) return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(w as Record<string, unknown>)) {
    if (keys && !keys.includes(k)) continue
    const px = clampWidth(v)
    if (px !== undefined) out[k] = px
  }
  return Object.keys(out).length ? out : undefined
}

/** the table patch with one column's width set (undefined = automatic again) */
export function withWidth(p: TablePatch | undefined, key: string, px: number | undefined): TablePatch | undefined {
  const widths = { ...p?.widths }
  const w = clampWidth(px)
  if (w === undefined) delete widths[key]
  else widths[key] = w
  return tidyTable({ ...p, widths })
}

/**
 * Where a header dropped at `x` lands: the index among the shown columns it goes before (1…n; the first column's place
 * is never taken). `cells` are the shown headers' left edge and width in their order on screen; right-to-left pages
 * read them from the right.
 */
export function dropSlot(cells: { left: number; width: number }[], x: number, rtl = false): number {
  const n = cells.length
  if (n < 2) return n
  let slot = n
  for (let i = 0; i < n; i++) {
    const c = cells[i]!
    const mid = c.left + c.width / 2
    if (rtl ? x > mid : x < mid) {
      slot = i
      break
    }
  }
  return Math.max(1, slot)
}

/**
 * The column `key` dropped before the shown column at `slot` (`shown.length` = after the last). Returns the new full
 * order (hidden columns keep their place among the others), or null when nothing moves: the first shown column, a drop
 * on its own place, an unknown key.
 */
export function orderAfterDrop(keys: string[], p: TablePatch | undefined, shown: string[], key: string, slot: number): string[] | null {
  const from = shown.indexOf(key)
  if (from < 1) return null
  const to = Math.max(1, Math.min(shown.length, slot))
  if (to === from || to === from + 1) return null
  const order = orderedKeys(keys, p).filter((k) => k !== key)
  const before = shown[to]
  const at = before === undefined ? order.indexOf(shown[shown.length - 1]!) + 1 : order.indexOf(before)
  if (at < 0) return null
  order.splice(at, 0, key)
  return order
}

/** the table patch with `key` dropped at `slot` of the shown columns (the table's own order needs no saving) */
export function dropColumn(keys: string[], p: TablePatch | undefined, shown: string[], key: string, slot: number): TablePatch | undefined {
  const order = orderAfterDrop(keys, p, shown, key, slot)
  if (!order) return p
  return tidyTable({ ...p, order: order.every((k, i) => k === keys[i]) ? undefined : order })
}

/** Alt+← / → : the column one place back (-1) or on (+1) among the shown ones; the first column stays first */
export function stepColumn(keys: string[], p: TablePatch | undefined, shown: string[], key: string, step: -1 | 1): TablePatch | undefined {
  const from = shown.indexOf(key)
  if (from < 1) return p
  const slot = step < 0 ? from - 1 : from + 2
  if (slot < 1 || slot > shown.length) return p
  return dropColumn(keys, p, shown, key, slot)
}

/** the middle 40% of a column swaps; its outer 30% on each side lands between two columns */
const SWAP_FROM = 0.3

/**
 * A header dropped on the MIDDLE of another header: the shown column under the pointer (its index), or -1 when the
 * pointer is near an edge (then dropSlot inserts between). Like the cards: middle = swap, edge = insert. The first
 * column is never a swap target.
 */
export function swapTarget(cells: { left: number; width: number }[], x: number, from: number): number {
  for (let i = 1; i < cells.length; i++) {
    const c = cells[i]!
    if (i === from) continue
    if (x >= c.left + c.width * SWAP_FROM && x <= c.left + c.width * (1 - SWAP_FROM)) return i
  }
  return -1
}

/** the table patch with shown columns `a` and `b` trading places (hidden columns keep theirs) */
export function swapColumns(keys: string[], p: TablePatch | undefined, a: string, b: string): TablePatch | undefined {
  if (a === b) return p
  const order = orderedKeys(keys, p).slice()
  const i = order.indexOf(a)
  const j = order.indexOf(b)
  if (i < 0 || j < 0) return p
  order[i] = b
  order[j] = a
  return tidyTable({ ...p, order: order.every((k, n) => k === keys[n]) ? undefined : order })
}

