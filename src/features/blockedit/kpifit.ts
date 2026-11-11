import { useLayoutEffect, type RefObject } from 'react'
import { fitBlockGrid } from './layout'

/**
 * KPI rows that fill the width (owner, 2026-10-26: eight KPI cards showed as 6 + 2 with half a row empty — "I'm trying
 * to fit the whole row"). The pages lay their KPI grid out by the window's breakpoints (lead: 2 / 3 / 4 / 6 columns),
 * which leaves a short last row whenever the count does not divide. Here the column count is picked from the count of
 * cards actually shown (after hiding / moving in edit mode) and the room there is: never more than the page's own
 * columns, nor more than fit at a readable tile width, and the one leaving the fullest last row — 8 → 4 + 4,
 * 7 → 4 + 3, 9 → 5 + 4. A last row that is still short is stretched across the row, so there is never a hole.
 * The pure choice is kpiFit (tested in kpifit.test.ts); fitKpiGrid applies it to a grid in the DOM (blockedit.css reads
 * the data-kpi-* attributes and --kpi-* variables). Bento keeps its own layout (its 2 × 2 hero, looks.css).
 */

export interface KpiFit {
  /** cards in a full row */
  cols: number
  /** cards in the last row (= cols when every row is full) */
  last: number
  /** grid tracks: every full-row card spans tracks / cols of them, a last-row card tracks / last */
  tracks: number
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** the layout for `n` cards when at most `max` fit in a row */
export function kpiFit(n: number, max: number): KpiFit {
  const m = Math.max(1, Math.floor(max))
  if (n <= 0) return { cols: 1, last: 1, tracks: 1 }
  if (n <= m) return { cols: n, last: n, tracks: n }
  let best = { cols: m, rows: Math.ceil(n / m), fill: 0 }
  for (let c = m; c >= 2; c--) {
    const rows = Math.ceil(n / c)
    const last = n - (rows - 1) * c
    const fill = last / c
    // fewer rows first, then the fullest last row, then more cards in a row (the loop goes from wide to narrow)
    if (rows < best.rows || (rows === best.rows && fill > best.fill)) best = { cols: c, rows, fill }
  }
  if (m === 1) best = { cols: 1, rows: n, fill: 1 }
  const cols = best.cols
  const last = n - (Math.ceil(n / cols) - 1) * cols
  return { cols, last, tracks: last === cols ? cols : (cols * last) / gcd(cols, last) }
}

/** a tile narrower than this is too tight for a label and a number (the looks shrink the number further if needed) */
export const MIN_TILE = 150

/** the KPI grids in the dashboard body: `.stagger` grids whose children are KPI cards */
function kpiGrids(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.stagger')).filter((g) => {
    const kids = Array.from(g.children)
    return kids.length > 0 && kids.every((k) => k.matches(KPI) || !!k.querySelector(KPI))
  })
}
const KPI = '.glass-kpi, .look-kpi, [data-kpi]'

/** lays one KPI grid out (idempotent: writes only what changed) */
export function fitKpiGrid(grid: HTMLElement): void {
  const off = document.documentElement.dataset.design === 'bento' || getComputedStyle(grid).display !== 'grid'
  if (off) {
    clear(grid)
    return
  }
  const n = grid.children.length
  // the page's own column count at this width: read with this layout (and the sized 12-column grid) off for a moment
  const had = grid.hasAttribute('data-kpi-fit')
  if (had) grid.removeAttribute('data-kpi-fit')
  const sized = grid.hasAttribute('data-block-grid')
  if (sized) grid.removeAttribute('data-block-grid')
  const cs = getComputedStyle(grid)
  const own = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1
  const gap = parseFloat(cs.columnGap) || 0
  const room = Math.max(1, Math.floor((grid.clientWidth + gap) / (MIN_TILE + gap)))
  const fit = kpiFit(n, Math.min(own, room))
  set(grid, 'data-kpi-cols', String(fit.cols))
  // a card was given a size (layout.ts): the grid is the 12-column one, the other cards keep the balanced share
  if (sized) {
    grid.setAttribute('data-block-grid', '')
    fitBlockGrid(grid, fit.cols)
    for (const a of ['data-kpi-fit', 'data-kpi-last']) grid.removeAttribute(a)
    return
  }
  set(grid, 'data-kpi-fit', '')
  set(grid, 'data-kpi-last', fit.last === fit.cols ? null : String(fit.last))
  grid.style.setProperty('--kpi-tracks', String(fit.tracks))
  grid.style.setProperty('--kpi-span', String(fit.tracks / fit.cols))
  grid.style.setProperty('--kpi-last-span', String(fit.tracks / fit.last))
}

function set(el: HTMLElement, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name)
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

function clear(grid: HTMLElement) {
  grid.removeAttribute('data-kpi-fit')
  grid.removeAttribute('data-kpi-cols')
  grid.removeAttribute('data-kpi-last')
  for (const v of ['--kpi-tracks', '--kpi-span', '--kpi-last-span']) grid.style.removeProperty(v)
}

/**
 * Keeps every KPI grid in the dashboard body laid out: on resize, when cards come or go (hidden, moved, drawn late) and
 * when the look changes. At most once a frame.
 */
export function useKpiFit(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let raf = 0
    const fitted = new Set<HTMLElement>()
    const run = () => {
      raf = 0
      const grids = kpiGrids(el)
      for (const g of fitted) if (!grids.includes(g)) clear(g)
      fitted.clear()
      for (const g of grids) {
        fitKpiGrid(g)
        fitted.add(g)
        ro.observe(g)
      }
      // the other sized containers (a page column, a pair of cards): the share their unsized blocks keep (layout.ts)
      for (const c of Array.from(el.querySelectorAll<HTMLElement>('[data-block-grid]'))) {
        if (grids.includes(c)) continue
        fitBlockGrid(c)
        ro.observe(c)
      }
    }
    const later = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    const ro = new ResizeObserver(later)
    ro.observe(el)
    const mo = new MutationObserver((records) => {
      // only cards coming or going matter (the grids' own attributes are written here)
      if (records.some((r) => r.type === 'childList')) later()
    })
    mo.observe(el, { childList: true, subtree: true })
    // the look switched (data-design on <html>)
    const look = new MutationObserver(later)
    look.observe(document.documentElement, { attributes: true, attributeFilter: ['data-design'] })
    run()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      look.disconnect()
      for (const g of fitted) clear(g)
    }
  }, [root])
}
