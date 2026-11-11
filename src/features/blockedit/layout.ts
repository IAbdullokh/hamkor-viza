import type { BlockEdits, BlockInfo, BlockPatch } from './context'
import { isEmptyPatch } from './order'

/**
 * Card sizes, DataLens style (owner, 2026-10-26: "I should be able to place every card where I like … make cards bigger
 * or smaller … a button so everything is exactly the same size, or I manage it myself"). One model for the KPI grid and
 * the page's column: a container in which any block was given a size becomes a 12-column grid with dense flow
 * (blockedit.css `[data-block-grid]`), a sized block spans `span` of the 12 columns, every other one keeps the share it
 * had (`data-block-auto`, written by fitBlockGrid), and a card dropped into an empty spot fills it. A block can also be
 * `h: 'compact'` (a KPI: smaller number, no sparkline; a chart: ~200px) or `h: 'tall'` (a chart ~420px, a bigger KPI);
 * unset = normal. In edit mode every side and corner of the frame drags the size (SizeTools; owner 2026-11-03).
 * On a phone the spans fold to half / full rows (blockedit.css).
 * The pure parts are tested in layout.test.ts.
 */

export const GRID = 12
export type BlockHeight = 'compact' | 'tall'

/** the heights from short to tall; undefined = normal */
export const HEIGHTS: (BlockHeight | undefined)[] = ['compact', undefined, 'tall']
/** "Balandligi" menu labels (Uzbek keys) */
export const HEIGHT_LABELS = { compact: 'Ixcham', normal: 'Odatiy', tall: 'Baland' } as const
/** px of vertical drag per height step */
export const HEIGHT_STEP_PX = 45

/** a frame side or corner that drags the size: w / e = width, s = height, the corners both */
export type Edge = 'w' | 'e' | 's' | 'nw' | 'ne' | 'sw' | 'se'
export const EDGES: Edge[] = ['w', 'e', 's', 'nw', 'ne', 'sw', 'se']

/**
 * Which way a drag on `edge` sizes the block: x = +1 (a right side: dragging right widens), −1 (a left side: dragging
 * toward the card's centre narrows it), 0 (no width); y = +1 (the bottom: dragging down makes it taller), −1 (a top
 * corner: dragging up makes it taller), 0 (no height). Physical left / right: the pointer moves on the screen.
 */
export function edgeAxes(edge: Edge): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  const x = edge === 'e' || edge === 'ne' || edge === 'se' ? 1 : edge === 's' ? 0 : -1
  const y = edge === 's' || edge === 'sw' || edge === 'se' ? 1 : edge === 'nw' || edge === 'ne' ? -1 : 0
  return { x, y }
}

/** the width a drag of `dx` px on `edge` gives a block that was `width` px wide (a left side grows when pulled left) */
export const widthFromDrag = (edge: Edge, width: number, dx: number): number => width + edgeAxes(edge).x * dx

/** the height a drag of `dy` px on `edge` gives a block that was `from`: one step per 45px, compact … tall */
export function heightFromDrag(edge: Edge, from: BlockHeight | undefined, dy: number): BlockHeight | undefined {
  const grow = edgeAxes(edge).y * dy
  const steps = Math.trunc(grow / HEIGHT_STEP_PX)
  const at = HEIGHTS.indexOf(from)
  return HEIGHTS[Math.max(0, Math.min(HEIGHTS.length - 1, at + steps))]
}
export type SizeName = 'small' | 'medium' | 'large' | 'full'
export const SIZE_NAMES: SizeName[] = ['small', 'medium', 'large', 'full']
/** "O'lcham" menu labels (Uzbek keys) */
export const SIZE_LABELS: Record<SizeName, string> = { small: 'Kichik', medium: "O'rta", large: 'Katta', full: "To'liq qator" }

/** the quick sizes of the "O'lcham" menu in grid columns: a KPI tile is small by nature, a card wide */
export const SIZE_SPANS: Record<BlockInfo['kind'], Record<SizeName, number>> = {
  stat: { small: 2, medium: 3, large: 6, full: GRID },
  card: { small: 4, medium: 6, large: 8, full: GRID },
}

export const clampSpan = (n: number): number => Math.max(1, Math.min(GRID, Math.round(n)))
export const isSpan = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= GRID

/** the share of the 12 columns a block has when a row holds `cols` of them (4 → 3, 6 → 2, 5 → 2, 1 → 12) */
export const autoSpan = (cols: number): number => clampSpan(GRID / Math.max(1, cols))

/** the span a block dragged to `width` px gets in a grid `inner` px wide with `gap` px between columns (snaps) */
export function spanFromWidth(width: number, inner: number, gap: number): number {
  const col = (inner - gap * (GRID - 1)) / GRID
  if (!(col > 0)) return GRID
  return clampSpan((width + gap) / (col + gap))
}

/**
 * The quick sizes for a block whose automatic share is `auto` columns: "Kichik" is always narrower than the automatic
 * size and "Katta" always wider (a row of 6 KPI cards is already 2/12, so a fixed Kichik 2/12 changed nothing — owner
 * 2026-10-26 "I want to make it smaller, but I couldn't"). Without `auto` the fixed sizes.
 */
export function quickSpans(kind: BlockInfo['kind'], auto?: number): Record<SizeName, number> {
  const s = { ...SIZE_SPANS[kind] }
  if (auto === undefined || !isSpan(auto)) return s
  if (s.small >= auto) s.small = Math.max(1, auto - 1)
  if (s.large <= auto && auto < GRID - 1) s.large = Math.min(GRID - 1, auto + 2)
  if (s.large - s.small >= 2) s.medium = Math.max(s.small + 1, Math.min(s.large - 1, s.medium))
  return s
}

/** the quick size a span is, if any (the menu ticks it); `spans` = the menu's sizes (quickSpans) */
export const sizeOf = (kind: BlockInfo['kind'], span: number | undefined, spans: Record<SizeName, number> = SIZE_SPANS[kind]): SizeName | undefined =>
  span === undefined ? undefined : SIZE_NAMES.find((s) => spans[s] === span)

/**
 * The automatic share (columns of 12) a block in `container` has: the sized grid's `data-block-auto`, a KPI grid's
 * balanced count, else measured from the container's own columns.
 */
export function autoSpanOf(container: HTMLElement): number {
  const a = Number(container.getAttribute('data-block-auto'))
  if (isSpan(a)) return a
  const k = Number(container.dataset.kpiCols)
  if (k > 0) return autoSpan(k)
  return autoSpan(ownCols(container))
}

/** a patch without its size (and dropped when nothing else is left) */
function drop(p: BlockPatch | undefined, keys: ('span' | 'h' | 'hpx' | 'off')[]): BlockPatch | undefined {
  if (!p) return undefined
  const next = { ...p }
  for (const k of keys) delete next[k]
  return isEmptyPatch(next) ? undefined : next
}

function put(edits: BlockEdits, id: string, p: BlockPatch | undefined): void {
  if (p && !isEmptyPatch(p)) edits[id] = p
  else delete edits[id]
}

/**
 * "O'lcham: Avtomatik | Qo'lda" on the edit bar — how a drag sizes a card (owner, 2026-11-03: "when I put automatic not
 * every card should be placed automatically … in automatic it is measured like every other card, there is a restriction;
 * in manual, slide more than needed even if nothing is drawn in the bottom part"). Switching never moves or resizes a card.
 * Avtomatik: the width snaps to the sizes that line up with the other cards (spanCandidates), the height to the card's own
 * or a neighbour's in its row, never taller (autoHeight). Qo'lda: any width of the 12 columns, any height in px (hpx).
 * The choice is this editor's, in this browser (sizing.ts).
 */
export type Sizing = 'auto' | 'manual'

/** the widths Avtomatik snaps to: the other cards' spans, what completes a row beside them, a full row, the quick sizes */
export function spanCandidates(kind: BlockInfo['kind'], others: number[]): number[] {
  const set = new Set<number>([GRID, ...Object.values(SIZE_SPANS[kind])])
  for (const o of others) {
    if (!isSpan(o)) continue
    set.add(o)
    if (GRID - o >= 1) set.add(GRID - o)
  }
  return [...set].sort((a, b) => a - b)
}

/** the candidate nearest to `raw` (a tie goes to the wider one) */
export function snapSpan(raw: number, candidates: number[]): number {
  let best = candidates[0] ?? clampSpan(raw)
  for (const c of candidates) if (Math.abs(c - raw) < Math.abs(best - raw) || (Math.abs(c - raw) === Math.abs(best - raw) && c > best)) best = c
  return best
}

/** a height a drag ends on: the card's own (natural), a neighbour's in px, Ixcham, or (Qo'lda) any px */
export type DragHeight = { kind: 'natural' } | { kind: 'compact' } | { kind: 'px'; px: number }

/** px of a drag up past the card's own height that make it Ixcham (owner, 2026-11-04: a longer pull felt like nothing happens) */
export const COMPACT_PULL_PX = 24
export const MIN_HEIGHT_PX = 80
export const MAX_HEIGHT_PX = 1600

/** Avtomatik's smaller steps of a card, as shares of its own height (owner, 2026-11-04: "a smaller version in automatic too") */
export const AUTO_STEPS = [0.85, 0.7] as const

/**
 * Avtomatik's height for a drag to `target` px: it snaps (unlike Qo'lda's any px) to the nearest of the card's own
 * height, its smaller steps (85 / 70% — what does not fit is cut at the bottom; Ixcham is the next one down) and the heights of the cards in its
 * row (shorter or taller); never taller than the tallest of them; pulled well below the smallest step it is Ixcham.
 */
export function autoHeight(target: number, natural: number, neighbours: number[]): DragHeight {
  const steps = AUTO_STEPS.map((k) => natural * k).filter((h) => h >= MIN_HEIGHT_PX)
  const marks = [natural, ...steps, ...neighbours.filter((n) => n >= MIN_HEIGHT_PX && Math.abs(n - natural) > 4)]
  if (target < Math.min(...marks) - COMPACT_PULL_PX) return { kind: 'compact' }
  let best = natural
  for (const m of marks) if (Math.abs(m - target) < Math.abs(best - target)) best = m
  return Math.abs(best - natural) <= 4 ? { kind: 'natural' } : { kind: 'px', px: Math.round(best) }
}

/**
 * Qo'lda's height for a drag to `target` px: any height (owner, 2026-11-04: "any size I like, a perfect fit"), smaller
 * than the card's own too — what does not fit is cut at the bottom; back on its own height it is its own again.
 */
export function manualHeight(target: number, natural: number): DragHeight {
  if (Math.abs(target - natural) <= 4) return { kind: 'natural' }
  return { kind: 'px', px: Math.round(Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, target))) }
}

/** the edits with `ids` at a dragged height: their own, Ixcham or a px height (each replaces the others) */
export function withDragHeight(edits: BlockEdits, ids: string[], h: DragHeight): BlockEdits {
  const next = { ...edits }
  for (const id of ids) {
    const base = drop(next[id], ['h', 'hpx'])
    put(next, id, h.kind === 'compact' ? { ...base, h: 'compact' } : h.kind === 'px' ? { ...base, hpx: h.px } : base)
  }
  return next
}

/** a card sized again starts from what is on screen: a size set aside by the old "Avtomatik" (off) is dropped, not revived */
export function fromScreen(edits: BlockEdits, id: string): BlockEdits {
  if (!edits[id]?.off) return edits
  const next = { ...edits }
  put(next, id, drop(next[id], ['span', 'h', 'hpx', 'off']))
  return next
}

/** the edits with every block of `ids` given `span` (undefined = back to its automatic share) */
export function withSpan(edits: BlockEdits, ids: string[], span: number | undefined): BlockEdits {
  const next = { ...edits }
  for (const id of ids) put(next, id, span === undefined ? drop(next[id], ['span']) : { ...next[id], span: clampSpan(span) })
  return next
}

/** the edits with `ids` at height `h` (undefined / false = normal, true = compact, as before 'tall' came) */
export function withHeight(edits: BlockEdits, ids: string[], h: BlockHeight | undefined | boolean): BlockEdits {
  const to: BlockHeight | undefined = h === true ? 'compact' : h === false ? undefined : h
  const next = { ...edits }
  for (const id of ids) put(next, id, to ? { ...drop(next[id], ['hpx']), h: to } : drop(next[id], ['h', 'hpx']))
  return next
}

/** "Bir xil o'lcham": every block of `ids` the same span and the normal height */
export const withSameSize = (edits: BlockEdits, ids: string[], span: number): BlockEdits => withHeight(withSpan(edits, ids, span), ids, undefined)

/** "Avtomatik joylash": no block of `page` keeps a size (their places and other settings stay) */
export function withoutSize(edits: BlockEdits, page: string): BlockEdits {
  const next: BlockEdits = {}
  for (const [id, p] of Object.entries(edits)) {
    if (!id.startsWith(page + ':') || (p.span === undefined && p.h === undefined && p.hpx === undefined)) next[id] = p
    else put(next, id, drop(p, ['span', 'h', 'hpx']))
  }
  return next
}

/** the sizes of `ids` put back as they were in `before` (the undo of the two buttons above) */
export function restoreSize(edits: BlockEdits, before: BlockEdits, ids: string[]): BlockEdits {
  const next = { ...edits }
  for (const id of ids) {
    const was = before[id]
    const base = drop(next[id], ['span', 'h', 'hpx'])
    put(next, id, { ...base, ...(was?.span !== undefined && { span: was.span }), ...(was?.h && { h: was.h }), ...(was?.hpx !== undefined && { hpx: was.hpx }) })
  }
  return next
}

/** does any block of `page` have a size it applies (one kept under "Avtomatik" does not count) */
export const hasSize = (edits: BlockEdits, page: string): boolean =>
  Object.entries(edits).some(([id, p]) => id.startsWith(page + ':') && (p.span !== undefined || p.h !== undefined || p.hpx !== undefined) && !p.off)

/* ── DOM ───────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The container's own column count (with the 12-column grid switched off for a moment): a page column is 1, the pair
 * grid 2 (1 on a phone); a KPI grid's count is the balanced one (kpifit.ts) and is passed in as `cols`.
 */
function ownCols(el: HTMLElement): number {
  const had = el.hasAttribute('data-block-grid')
  const flat = el.hasAttribute('data-block-flat')
  if (had) el.removeAttribute('data-block-grid')
  if (flat) el.removeAttribute('data-block-flat')
  const cs = getComputedStyle(el)
  const n = cs.display.includes('grid') ? cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1 : 1
  if (had) el.setAttribute('data-block-grid', '')
  if (flat) el.setAttribute('data-block-flat', '')
  return n
}

/**
 * The share the unsized blocks of a one-row wrapper (a pair of cards) keep when the others were given a size: the rest
 * of the row, split evenly (pair 4 + auto → 4 + 8, "re-split"); a column of one block per row, or a wrapper with more
 * blocks than columns, keeps its plain share. `spans` = each child's size, undefined for an unsized one.
 */
export function shareOf(own: number, spans: (number | undefined)[]): number {
  const plain = autoSpan(own)
  if (own < 2 || spans.length > own) return plain
  const used = spans.reduce<number>((s, n) => s + (n ?? 0), 0)
  const free = spans.filter((n) => n === undefined).length
  if (!free || free === spans.length || used >= GRID) return plain
  return clampSpan(Math.floor((GRID - used) / free))
}

const spanAttr = (el: Element): number | undefined => {
  const n = Number(el.getAttribute('data-block-span'))
  return el.hasAttribute('data-block-span') && isSpan(n) ? n : undefined
}

/** writes the share a block without a size keeps in a sized container (`data-block-auto`); `cols` for a KPI grid */
export function fitBlockGrid(el: HTMLElement, cols?: number): void {
  // an attribute, not a CSS variable: a variable would be inherited by a sized grid inside a sized column
  const own = cols ?? ownCols(el)
  const v = String(el.hasAttribute('data-block-flat') ? shareOf(own, Array.from(el.children).map(spanAttr)) : autoSpan(own))
  if (el.getAttribute('data-block-auto') !== v) el.setAttribute('data-block-auto', v)
  // the wrappers whose cards joined this grid (a pair, the added charts) keep their own share as well
  if (el.hasAttribute('data-block-grid')) for (const f of flatsIn(el)) fitBlockGrid(f)
}

/*
 * A page's column is one block per row; a pair of cards (`grid lg:grid-cols-2`) or the added charts' grid sits in it as
 * one child. When the column becomes the 12-column grid, such a wrapper lends its cards to it (`data-block-flat`,
 * display: contents): a table can then stand at 6/12 next to a card of the pair, a pair can be re-split 4 + 8, and every
 * block is sized against the same 12 columns (owner 2026-10-26: "change the sizes itself").
 */
const blockCount = (el: Element): number => el.querySelectorAll('[data-block-id]').length

/** may `el` (a child of a one-column container) lend its cards to that container's grid */
function canFlatten(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || el.hasAttribute('data-block-id') || el.classList.contains('stagger') || el.hasAttribute('data-kpi-cols')) return false
  // a row laid out in its own code (an inline display, Klassik's rows): it stays a grid of its own, never lends its cards
  if (el.style.display) return false
  if (blockCount(el) < 2) return false
  // a row of KPI cards stays a row of its own (an earlier dashboard's, src/originals — Studio's own are .stagger): sizing a
  // table beside it never pulls its cards into the table's grid (owner, 2026-11-04: "when I change a table the cards change")
  if (Array.from(el.querySelectorAll('[data-block-id]')).every((b) => b.getAttribute('data-block-id')!.includes(':stat:'))) return false
  // a grid of its own (a pair sized by itself before counts too: ownCols looks with the 12-column grid off)
  return el.hasAttribute('data-block-flat') || ownCols(el) >= 2
}

/** the flattened wrappers among `el`'s children */
const flatsIn = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute('data-block-flat'))

/** the grid that measures a block in `container`: the column it lent its cards to, else itself */
export const gridOf = (container: HTMLElement): HTMLElement =>
  container.hasAttribute('data-block-flat') && container.parentElement ? container.parentElement : container

/** a container that can be the page's 12-column grid: one block per row, inside a dashboard body (or the body itself) */
const isColumn = (el: HTMLElement): boolean => !el.classList.contains('stagger') && !el.dataset.kpiCols && !!el.closest('[data-block-root]') && ownCols(el) === 1

/** the container becomes the 12-column grid while any of its children has a size, and stops when none has */
export function markGrid(container: HTMLElement | null): void {
  if (!container) return
  const host = container.parentElement
  // nothing sized here and nothing marked: no style is read (every block runs this after each render)
  const quiet = (el: HTMLElement) =>
    !el.hasAttribute('data-block-grid') && !el.hasAttribute('data-block-flat') && !Array.from(el.children).some((c) => c.hasAttribute('data-block-span'))
  if (quiet(container) && (!host || quiet(host))) return
  if (host && canFlatten(container) && isColumn(host)) return refresh(host)
  refresh(container)
}

function refresh(grid: HTMLElement): void {
  const flats = isColumn(grid) ? Array.from(grid.children).filter(canFlatten) : []
  const sized = (el: Element) => Array.from(el.children).some((c) => c.hasAttribute('data-block-span'))
  const any = sized(grid) || flats.some(sized)
  // a wrapper that no longer holds two blocks (one was hidden) stops lending its cards
  for (const f of flatsIn(grid)) if (!flats.includes(f)) unflat(f)
  if (any) {
    for (const f of flats) {
      if (f.hasAttribute('data-block-grid')) f.removeAttribute('data-block-grid')
      f.setAttribute('data-block-flat', '')
    }
    grid.setAttribute('data-block-grid', '')
    fitBlockGrid(grid, grid.dataset.kpiCols ? Number(grid.dataset.kpiCols) : undefined)
  } else {
    for (const f of flats) unflat(f)
    if (grid.hasAttribute('data-block-grid')) {
      grid.removeAttribute('data-block-grid')
      grid.removeAttribute('data-block-auto')
    }
  }
}

function unflat(el: HTMLElement): void {
  el.removeAttribute('data-block-flat')
  el.removeAttribute('data-block-auto')
}
