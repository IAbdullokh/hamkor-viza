import type { BlockEdits, BlockPatch } from './context'

/**
 * Moving blocks DataLens-style (owner, 2026-10-24: "change the places of the cards whenever I want"). The hand-written
 * pages render their cards in a fixed order, so the order lives next to the cards: a moved block's unit (its wrapper, or
 * the lone wrapper around it — unitOf) gets `order` = its index among the children of its container (the grid or the
 * page's column), and the units are put at those indexes inside the container's DOM (sortContainer); the other children
 * (a KPI grid, a pair of cards, the filter bar) fill the rest in their own order. Moving the real elements, not CSS
 * `order`, keeps every look's position rules right — the Bento hero is whatever is first, its wide tiles whatever is last.
 * The pure parts are here (tested in order.test.ts); the DOM part is at the end.
 */

/** a patch with nothing left to keep is dropped */
export const isEmptyPatch = (p: BlockPatch | null | undefined): boolean =>
  !p || (!p.title && !p.hidden && !p.visual && !p.color && isEmptyTable(p.table) && p.order === undefined && p.span === undefined && !p.h && p.hpx === undefined && !p.views && !(p.viewTables && Object.keys(p.viewTables).length) && !p.source)

/** a table patch (patch.ts) that changes nothing */
export const isEmptyTable = (t: BlockPatch['table']): boolean =>
  !t || (!t.calc?.length && !t.hidden?.length && !t.order?.length && !(t.labels && Object.keys(t.labels).length) && !t.sort && !(t.rows && t.rows > 0) &&
      !(t.colColors && Object.keys(t.colColors).length) && !(t.colRules && Object.keys(t.colRules).length) && !(t.colFormat && Object.keys(t.colFormat).length) && !(t.levels && t.levels.length > 1) &&
      !(t.widths && Object.keys(t.widths).length) && t.barStyle !== 'line')

/** `ids` (a container's blocks in their current order) with the one at `from` moved to `to` (clamped) */
export function moveId<T>(ids: T[], from: number, to: number): T[] {
  if (from < 0 || from >= ids.length) return ids
  const at = Math.max(0, Math.min(ids.length - 1, to))
  if (at === from) return ids
  const next = ids.slice()
  const [one] = next.splice(from, 1)
  next.splice(at, 0, one!)
  return next
}

/** `ids` with `id` dropped before (or after) `target` — a drag ending over another block */
export function dropId<T>(ids: T[], id: T, target: T, after: boolean): T[] {
  if (id === target) return ids
  const rest = ids.filter((x) => x !== id)
  const at = rest.indexOf(target)
  if (at < 0 || !ids.includes(id)) return ids
  rest.splice(after ? at + 1 : at, 0, id)
  return rest
}

/** `ids` with `a` and `b` trading places — a card dropped onto the middle of another card (owner: "place it on another one, it should be replaced") */
export function swapIds<T>(ids: T[], a: T, b: T): T[] {
  const i = ids.indexOf(a)
  const j = ids.indexOf(b)
  if (i < 0 || j < 0 || i === j) return ids
  const next = ids.slice()
  next[i] = b
  next[j] = a
  return next
}

/** like placesAfterDrop, for two units that trade places */
export function placesAfterSwap<T>(kids: T[], units: { unit: T; id: string; outer: boolean }[], unit: T, target: T): Record<string, number> | null {
  const next = swapIds(kids, unit, target)
  if (next === kids) return null
  const places: Record<string, number> = {}
  for (const u of units) places[u.id] = orderOf(next.indexOf(u.unit), u.outer)
  return places
}

/** the edits with each block of `places` given that place as `order` (other blocks and other settings untouched) */
export function withOrder(edits: BlockEdits, places: Record<string, number>): BlockEdits {
  const next = { ...edits }
  for (const [id, order] of Object.entries(places)) next[id] = { ...next[id], order }
  return next
}

/**
 * A lone card's place is kept as OUTER + its index in the page's column, a grid cell's as its index in the grid. When a
 * card is removed, the card it was paired with becomes lone (its unit is then the pair's wrapper): its saved place is
 * from the grid, so it is not read as a place in the column (it would jump to the top), and the other way round.
 *
 * Two forms (owner, 2026-11-09: "I move the cards, the data refreshes, they are back in their first place"):
 * - the first (below V2): the index among ALL the container's children — the filter bar and any note too. A child that
 *   comes and goes with the data (the period's coverage line, an empty-data line) moved every index after it, and the
 *   cards were put back among the page's own ones on the next refresh.
 * - V2 (from 1000): the index among the children that hold a block only (`items`: units, a KPI grid, a pair of cards).
 *   Whatever else the container shows stays where the page puts it and never shifts a place. Every new drag writes this.
 * The first form is still read: its index less the children before the first item that hold no block (the filter bar —
 * `legacyShift`), so a dashboard arranged before keeps its places.
 */
export const OUTER = 500
export const V2 = 1000
export const V2_OUTER = 1500
export const placeOf = (order: number | undefined, outer: boolean, legacyShift = 0): number | undefined => {
  if (order === undefined) return undefined
  if (order >= V2) return outer ? (order >= V2_OUTER ? order - V2_OUTER : undefined) : order < V2_OUTER ? order - V2 : undefined
  const old = outer ? (order >= OUTER ? order - OUTER : undefined) : order < OUTER ? order : undefined
  return old === undefined ? undefined : Math.max(0, old - legacyShift)
}
export const orderOf = (index: number, outer: boolean): number => (outer ? V2_OUTER + index : V2 + index)

/**
 * The first form's offset in a container: its children before the first one that holds a block, not counting the ones
 * that come and go with the data (`transient`, e.g. the coverage line, which did not exist when those places were saved).
 */
export function legacyShift<T>(children: T[], isItem: (c: T) => boolean, transient: (c: T) => boolean): number {
  let n = 0
  for (const c of children) {
    if (isItem(c)) break
    if (!transient(c)) n++
  }
  return n
}

/**
 * After dragging `unit` before / after `target` (both children of one container, `kids` the container's children that
 * hold a block, in their current order): the new `order` of every unit of the container — its index in the new order, as
 * a lone card or a grid cell (`outer`), in the V2 form.
 */
export function placesAfterDrop<T>(kids: T[], units: { unit: T; id: string; outer: boolean }[], unit: T, target: T, after: boolean): Record<string, number> | null {
  const next = dropId(kids, unit, target, after)
  if (next === kids || next.every((k, i) => k === kids[i])) return null
  const places: Record<string, number> = {}
  for (const u of units) places[u.id] = orderOf(next.indexOf(u.unit), u.outer)
  return places
}

/** the edits without any `order` of the blocks on `page` ("Tartibni tiklash"); patches left empty are dropped */
export function withoutOrder(edits: BlockEdits, page: string): BlockEdits {
  const next: BlockEdits = {}
  for (const [id, p] of Object.entries(edits)) {
    if (!id.startsWith(page + ':') || p.order === undefined) {
      next[id] = p
      continue
    }
    const { order: _drop, ...rest } = p
    if (!isEmptyPatch(rest)) next[id] = rest
  }
  return next
}

/** the edits with `id` hidden (true) or shown again (false); the block keeps its title, form and place */
export function withHidden(edits: BlockEdits, ids: string[], hidden: boolean): BlockEdits {
  const next = { ...edits }
  for (const id of ids) {
    const { hidden: _was, ...rest } = next[id] ?? {}
    const p: BlockPatch = hidden ? { ...rest, hidden: true } : rest
    if (isEmptyPatch(p)) delete next[id]
    else next[id] = p
  }
  return next
}

/** the hidden blocks of `page` */
export const hiddenOn = (edits: BlockEdits, page: string): string[] =>
  Object.keys(edits).filter((id) => id.startsWith(page + ':') && edits[id]!.hidden)

/** does any block of `page` have a saved place */
export const hasOrder = (edits: BlockEdits, page: string): boolean =>
  Object.entries(edits).some(([id, p]) => id.startsWith(page + ':') && p.order !== undefined)

/** does any block of `page` have a saved place or size (its blocks then keep their wrapper outside edit mode too) */
export const hasLayout = (edits: BlockEdits, page: string): boolean =>
  Object.entries(edits).some(([id, p]) => id.startsWith(page + ':') && (p.order !== undefined || p.span !== undefined || p.h !== undefined))

/** a readable name for a block id when the block itself is not on screen ("lead:card:lid va konversiya" → "Lid va konversiya") */
export function titleFromId(id: string): string {
  const raw = id.split(':').slice(2).join(':')
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : id
}

/**
 * The container's children in their wanted order: the children that carry a saved place go to that index (or the first
 * free one after it); everything else (a group of cards, the filter bar, a block never moved) fills the other indexes in
 * its current order. Equal places keep their current order. Returns null when nothing has to move (so it is idempotent).
 */
export function arrange<T>(children: T[], placeOf: (c: T) => number | undefined): T[] | null {
  const placed: { c: T; o: number; i: number }[] = []
  const rest: T[] = []
  children.forEach((c, i) => {
    const o = placeOf(c)
    if (o === undefined) rest.push(c)
    else placed.push({ c, o, i })
  })
  if (!placed.length) return null
  placed.sort((a, b) => a.o - b.o || a.i - b.i)
  const out: T[] = []
  let p = 0
  let r = 0
  for (let at = 0; at < children.length; at++) {
    if (p < placed.length && (placed[p]!.o <= at || r >= rest.length)) out.push(placed[p++]!.c)
    else out.push(rest[r++]!)
  }
  return out.every((c, i) => c === children[i]) ? null : out
}

/**
 * The container's children in their wanted order when only the ones that hold a block (`isItem`) are arranged (arrange,
 * places counted among them): the others — the filter bar, a note, an empty line — keep their own spots. Null when
 * nothing has to move.
 */
export function arrangeItems<T>(children: T[], isItem: (c: T) => boolean, placeOf: (c: T) => number | undefined): T[] | null {
  const items = children.filter(isItem)
  const want = arrange(items, placeOf)
  if (!want) return null
  let k = 0
  return children.map((c) => (isItem(c) ? want[k++]! : c))
}

/**
 * What moves when a block is dragged (its "unit") and among what (its container). A page puts most big cards each in a
 * wrapper of their own (`<div className="mt-4"><Card/></div>`), so the block's own parent often holds nothing else to
 * swap with. The unit is the block's highest ancestor that still holds only this block, the container that ancestor's
 * parent: the lone cards of a page move among each other in the page's column, the cards of a grid inside the grid.
 * The climb stops at the dashboard body (`data-block-root`). `blocksIn(el)` is the block wrappers in el (el included).
 */
interface TreeEl<T> {
  parentElement: T | null
  hasAttribute(name: string): boolean
}
export function unitOf<T extends TreeEl<T>>(cell: T, blocksIn: (el: T) => unknown[]): { unit: T; container: T } | null {
  let unit = cell
  let p = cell.parentElement
  for (; p && !p.hasAttribute('data-block-root') && blocksIn(p).length <= 1; p = p.parentElement) unit = p
  // a block outside a dashboard body (the zoomed preview) has nothing to trade places with
  for (let r = p; r; r = r.parentElement) if (r.hasAttribute('data-block-root')) return { unit, container: p! }
  return null
}

/**
 * Can the block in `cell` trade places with anything: its container (unitOf) holds something else to drop it next to —
 * another unit, a KPI grid or a pair of cards (`items`). Edit mode's ⠿ shows only then (a page with one card has nothing).
 */
export function canMove<T extends TreeEl<T>>(cell: T, blocksIn: (el: T) => unknown[], items: (container: T) => unknown[]): boolean {
  const u = unitOf(cell, blocksIn)
  return !!u && items(u.container).length > 1
}

/** the units of a container in their current order: its children holding exactly one block, with that block */
export function unitsIn<T>(kids: T[], blocksIn: (el: T) => T[]): { unit: T; cell: T }[] {
  const out: { unit: T; cell: T }[] = []
  for (const k of kids) {
    const cells = blocksIn(k)
    if (cells.length === 1) out.push({ unit: k, cell: cells[0]! })
  }
  return out
}

/** the block wrappers in a DOM element, the element itself included */
export const domBlocksIn = (el: Element): HTMLElement[] =>
  el.matches('[data-block-id]') ? [el as HTMLElement] : Array.from(el.querySelectorAll<HTMLElement>('[data-block-id]'))

/** the units of a block's container in the DOM, each with its block's id and whether it is a lone card's wrapper */
export function domUnits(container: Element): { unit: HTMLElement; cell: HTMLElement; id: string; outer: boolean }[] {
  return unitsIn(domKids(container), domBlocksIn).map((u) => ({ ...u, id: u.cell.getAttribute('data-block-id')!, outer: u.unit !== u.cell }))
}
export const domKids = (container: Element): HTMLElement[] => Array.from(container.children).filter((c): c is HTMLElement => c instanceof HTMLElement)
/** the children of a container a block can be dropped next to: those with a block in them (a unit, a KPI grid, a pair) */
export const domItems = (container: Element): HTMLElement[] => domKids(container).filter((c) => domBlocksIn(c).length > 0)

const orderAttr = (el: Element): number | undefined => {
  const v = el.getAttribute('data-block-order')
  return v === null || v === '' ? undefined : Number(v)
}

/** a child that comes and goes with the data: not counted by the first form of a place (legacyShift) */
export const isTransient = (el: Element): boolean => el.hasAttribute('data-coverage') || el.hasAttribute('data-block-skip')
const holdsBlock = (el: Element): boolean => domBlocksIn(el).length > 0

/** the first form's offset in a DOM container (legacyShift) */
export const domLegacyShift = (container: Element): number => legacyShift(Array.from(container.children), holdsBlock, isTransient)

/**
 * puts the units of `parent` (block wrappers, or the lone wrappers around them) at their saved places among the children
 * that hold a block; the others stay where they are (idempotent)
 */
export function sortContainer(parent: Element): void {
  const kids = Array.from(parent.children)
  const want = arrangeItems(kids, holdsBlock, orderAttr)
  if (!want) return
  // moving an element drops the focus inside it (the ⠿ of a block just moved with the keyboard): give it back
  const active = document.activeElement
  want.forEach((el, i) => {
    const at = parent.children[i]
    if (at !== el) parent.insertBefore(el, at ?? null)
  })
  if (active instanceof HTMLElement && active !== document.activeElement && parent.contains(active)) active.focus({ preventScroll: true })
}

/**
 * Keeps a container sorted while React renders into it: React inserts new or re-shown cards by its own order, the
 * observer puts the moved ones back. One observer per container, released with the last block in it.
 */
const watched = new WeakMap<Element, { mo: MutationObserver; n: number }>()
export function watchContainer(parent: Element): () => void {
  let w = watched.get(parent)
  if (!w) {
    const mo = new MutationObserver(() => sortContainer(parent))
    mo.observe(parent, { childList: true })
    w = { mo, n: 0 }
    watched.set(parent, w)
  }
  w.n++
  return () => {
    const cur = watched.get(parent)
    if (!cur) return
    cur.n--
    if (cur.n <= 0) {
      cur.mo.disconnect()
      watched.delete(parent)
    }
  }
}

/**
 * Calls `fn` (at most once a frame) whenever a block comes into or leaves the dashboard body `root` — a card wrapped or
 * unwrapped by edit mode, hidden, added, or drawn late (an added chart, a page that loads its data). The ⠿ of each block
 * asks again whether it has anything to trade places with. One observer per root, released with its last listener.
 */
const rootWatch = new WeakMap<Element, { mo: MutationObserver; fns: Set<() => void>; raf: number }>()
const hasBlock = (n: Node): boolean => n instanceof Element && (n.matches('[data-block-id]') || !!n.querySelector('[data-block-id]'))
export function onBlocksChange(root: Element, fn: () => void): () => void {
  let w = rootWatch.get(root)
  if (!w) {
    const entry = { mo: null as unknown as MutationObserver, fns: new Set<() => void>(), raf: 0 }
    entry.mo = new MutationObserver((records) => {
      if (entry.raf || !records.some((r) => Array.from(r.addedNodes).some(hasBlock) || Array.from(r.removedNodes).some(hasBlock))) return
      entry.raf = requestAnimationFrame(() => {
        entry.raf = 0
        entry.fns.forEach((f) => f())
      })
    })
    entry.mo.observe(root, { childList: true, subtree: true })
    w = entry
    rootWatch.set(root, w)
  }
  w.fns.add(fn)
  return () => {
    const cur = rootWatch.get(root)
    if (!cur) return
    cur.fns.delete(fn)
    if (!cur.fns.size) {
      cur.mo.disconnect()
      cancelAnimationFrame(cur.raf)
      rootWatch.delete(root)
    }
  }
}
