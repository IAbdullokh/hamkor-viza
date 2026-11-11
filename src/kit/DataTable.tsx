import { Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useDesign } from '@/lib/design'
import { DS } from '@/ds/registry'
import { BlockChartCtx } from '@/features/blockedit/context'
import { COLOR_HEX, tableColumns, tidyTable, tintText, type TableColumnInfo, type TablePatch } from '@/features/blockedit/patch'
import { useResolvedTheme } from '@/shell/ThemeController'
import { announce } from '@/features/blockedit/announce'
import { clampWidth, dropColumn, dropSlot, stepColumn, withWidth, swapColumns, swapTarget } from './coldrag'
import './coldrag.css'
import { barStyleOf, barWidth, columnStats, formatCell, hueBg, isBars, paletteFor, percentScale, progressOn, ranks, ringHue, ringValue, ruleHue, RANK_BADGES, withAllBars, withBarStyle, withColorful, withProgressLook, withRings } from '@/features/blockedit/colstyle'
import { PenSwitch } from '@/charts/EChart'
import { frameFromTable } from '@/charts/switcher'
import { withCalc } from '@/features/blockedit/calc'

/**
 * The standard dashboard table: optional grouped headers (e.g. "PROPUSHENNIY › Qayta chiqilgan"), sticky first
 * column, sortable columns, a Jami (totals) row, clickable cells/rows for drill-down. Looks right in every design
 * because it only uses theme tokens. Inside a dashboard block it follows the block's table settings (edit mode / Nova,
 * features/blockedit patch.ts): hidden columns, their order, new names, a sort and a top-N — and tells the block its
 * columns, so the zoomed editor can list them. A column may have its own colour, conditional colours (higher greener / a
 * threshold) and number format (colstyle.ts); in the zoomed editor a header or cell click picks a column (`pick`).
 * A header can be dragged left / right to another place (a line shows where it lands; Alt+← / → too; on a phone a long
 * press first) and its edge to another width (double click = automatic) — coldrag.ts. The first column stays first. In
 * edit mode that is the dashboard's default, in the zoomed editor its draft (BlockChart.setTable); otherwise the table
 * keeps it for this visit.
 */
export interface Column<R> {
  key: string
  label: string
  /** grouped header label; adjacent columns with the same group share one top header cell */
  group?: string
  align?: 'start' | 'end' | 'center'
  /** cell value used for sorting and default rendering */
  value: (row: R) => string | number | null
  render?: (row: R) => ReactNode
  format?: (v: number) => string
  /** totals row value (omit = blank) */
  total?: (rows: R[]) => string | number | null
  /** clicking this cell drills down */
  onCell?: (row: R) => void
  width?: number
  /** extra classes for its header (e.g. a matrix's stage names wrapping onto two lines) and its body cells */
  headClass?: string
  cellClass?: string
  /** its cells are tinted by size (a matrix's heat): the table style's first choice, off once another is picked */
  heat?: boolean
  /**
   * the row's own number when `value` is something else (kit/hier: `value` is the top row's, for sorting) — what bars,
   * colour rules and rings measure (owner, 2026-10-27: "zero rows show full bars")
   */
  own?: (row: R) => string | number | null
}

export function DataTable<R>({
  columns: given,
  rows,
  rowKey,
  onRow,
  totals = true,
  maxHeight,
  numbered,
  initialSort,
  empty,
  level,
  expanded,
}: {
  columns: Column<R>[]
  rows: R[]
  rowKey: (row: R, i: number) => string
  onRow?: (row: R) => void
  totals?: boolean
  maxHeight?: number
  numbered?: boolean
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  empty?: string
  /** something drawn right under a row, across the whole table (an opened operator's panel); null = nothing */
  expanded?: (row: R) => ReactNode | null
  /** a hierarchy row's level (kit/hier): comparison bars and ranks compare rows of the same level only */
  level?: (row: R) => number
}) {
  const { t, lang } = useT()
  const design = useDesign()
  const bars = !!(design && DS[design]?.tableBars)
  const block = useContext(BlockChartCtx)
  // the block's calculated columns are ordinary columns from here on: moved, renamed, hidden and sorted like the others
  const calc = block?.table?.calc
  const all = useMemo(() => withCalc<R, Column<R>>(given, calc, lang), [given, calc, lang])
  const dark = useResolvedTheme() === 'dark'
  const setBlockTable = block?.setTable
  // a column moved / sized by hand where nothing saves it (a viewer outside edit mode, a table outside a dashboard): kept
  // for this visit, on top of the block's settings (only the fields dragged)
  // (and the pencil's "Rangli chiziqli jadval" look, where nothing saves it either)
  const [mine, setMine] = useState<Pick<TablePatch, 'order' | 'widths' | 'colColors' | 'colRules' | 'barStyle'> | null>(null)
  const base = block?.table
  const patch = useMemo(() => (mine && !setBlockTable ? tidyTable({ ...base, ...mine }) : base), [base, mine, setBlockTable])
  const reportTable = block?.reportTable
  const columns = useMemo(() => tableColumns(all, patch), [all, patch])
  const pick = block?.pick
  const [hot, setHot] = useState<string | null>(null)
  // the columns as text (with their numbers, for Nova's "nega 0%?"), so a page that builds its columns on every render
  // does not report them again (only inside a dashboard block)
  const names = reportTable
    ? JSON.stringify(
        all.map((c, i) => {
          const values = rows.map((r) => c.value(r))
          const num = i > 0 && values.some((v) => typeof v === 'number')
          const pct = percentScale(c.format)
          return { key: c.key, label: t(c.label), num, stats: num ? columnStats(values, c.total ? c.total(rows) : null, pct) : null, ...(c.heat ? { heat: true } : {}), ...(pct === 'ratio' ? { ratio: true } : {}) }
        }),
      )
    : ''

  useEffect(() => {
    if (reportTable && all.length) reportTable(JSON.parse(names) as TableColumnInfo[])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `names` is the columns
  }, [reportTable, names])
  const [sort, setSort] = useState(patch?.sort ?? initialSort ?? null)
  // a header's sort is for this look only (a viewer's is not kept); the default sort is set in the zoomed editor
  const sortBy = (key: string) => {
    const next: { key: string; dir: 'asc' | 'desc' } = sort?.key === key ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }
    setSort(next)
  }
  // a sort chosen for the block (edit mode / Nova) takes over when it changes; the headers still sort for the viewer
  const wanted = patch?.sort ? `${patch.sort.key}:${patch.sort.dir}` : ''
  const hadSort = useRef(!!patch?.sort)
  useEffect(() => {
    if (patch?.sort) setSort(patch.sort)
    // the block's sort taken back (an undo, "Asl holiga"): the table's own order again
    else if (hadSort.current) setSort(initialSort ?? null)
    hadSort.current = !!patch?.sort
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `wanted` is the sort
  }, [wanted])
  const sortedAll = useMemo(() => {
    if (!sort) return rows
    // a hidden column still sorts the table
    const col = all.find((c) => c.key === sort.key)
    if (!col) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = col.value(a)
      const y = col.value(b)
      if (x === y) return 0
      if (x === null) return 1
      if (y === null) return -1
      return (x < y ? -1 : 1) * dir
    })
  }, [rows, sort, all])
  // "faqat top 5": the first N rows; the Jami row still counts them all
  const top = patch?.rows
  const sorted = top && top > 0 ? sortedAll.slice(0, top) : sortedAll
  const grouped = columns.some((c) => c.group)
  // group header spans
  const groups: { label: string; span: number }[] = []
  for (const c of columns) {
    const g = c.group ?? ''
    const last = groups[groups.length - 1]
    if (last && last.label === g && g) last.span++
    else groups.push({ label: g, span: 1 })
  }
  // per-column max for bar-in-cell UIs
  const colMax = new Map<string, number>()
  if (bars) for (const c of columns) if (c.align === 'end') colMax.set(c.key, Math.max(0, ...rows.map((r) => { const v = c.value(r); return typeof v === 'number' ? v : 0 })))
  // a column's own look (colstyle.ts): its colour, conditional colours, number format
  const colColor = (c: Column<R>) => (patch?.colColors?.[c.key] ? tintText(patch.colColors[c.key]!, dark) : undefined)
  const range = new Map<string, [number, number]>()
  for (const c of columns)
    if (patch?.colRules?.[c.key]) {
      const nums = sortedAll.map((r) => (c.own ?? c.value)(r)).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      range.set(c.key, nums.length ? [Math.min(...nums), Math.max(...nums)] : [0, 0])
    }
  const ruleBg = (c: Column<R>, v: string | number | null) => {
    const rule = patch?.colRules?.[c.key]
    if (!rule || typeof v !== 'number') return undefined
    const [min, max] = range.get(c.key) ?? [0, 0]
    const h = ruleHue(rule, v, min, max)
    return h === null ? undefined : hueBg(h)
  }
  // comparison bars / ranks (colRules "bars" | "barsRank"; owner, 2026-10-26: "bars so I know which number is higher"):
  // per column and per hierarchy level, over all rows (the Jami row is not one of them)
  // a "ring" rule on a percent column draws a ring instead (below); on any other column it is a bar
  const ringable = (c: Column<R>) => !!percentScale(c.format) || patch?.colFormat?.[c.key]?.kind === 'pct'
  const isRing = (c: Column<R>) => patch?.colRules?.[c.key]?.mode === 'ring' && ringable(c)
  const cmp = useMemo(() => {
    const out = new Map<string, Map<R, { w: number | null; rank: number | null }>>()
    for (const c of columns) {
      const rule = patch?.colRules?.[c.key]
      if (!isBars(rule) && !(rule?.mode === 'ring' && !ringable(c))) continue
      const pct = percentScale(c.format)
      const byLevel = new Map<number, R[]>()
      for (const r of sortedAll) {
        const l = level ? level(r) : 0
        byLevel.set(l, [...(byLevel.get(l) ?? []), r])
      }
      const cells = new Map<R, { w: number | null; rank: number | null }>()
      for (const group of byLevel.values()) {
        const vals = group.map((r) => { const v = (c.own ?? c.value)(r); return typeof v === 'number' && Number.isFinite(v) ? v : null })
        const nums = vals.filter((v): v is number => v !== null)
        const min = nums.length ? Math.min(...nums) : 0
        const max = nums.length ? Math.max(...nums) : 0
        const rk = rule?.mode === 'barsRank' && max > min ? ranks(vals) : vals.map(() => null)
        group.forEach((r, i) => cells.set(r, { w: barWidth(vals[i]!, min, max, pct), rank: rk[i]! }))
      }
      out.set(c.key, cells)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ringable follows the patch
  }, [columns, patch, sortedAll, level])
  // a percent cell's ring (0..100 and the % it shows): a ratio / percent column as it is, a count shown in % as its share
  const ringOf = (c: Column<R>, v: string | number | null) => {
    if (typeof v !== 'number') return null
    const pct = percentScale(c.format)
    if (pct) return ringValue(v, pct)
    const total = c.total ? Number(c.total(sortedAll)) : 0
    return total > 0 ? ringValue(v / total, 'ratio') : null
  }
  // a line / ring column (the progress look): its header in its colour (darkened for contrast), its numbers and Jami plain
  const tinted = (c: Column<R>) => isRing(c) || (cmp.has(c.key) && barStyleOf(patch, c.key) === 'line')
  const fmt = (c: Column<R>, v: number, isTotal = false): string => {
    const f = patch?.colFormat?.[c.key]
    if (!f) return c.format ? c.format(v) : String(v)
    const pct = percentScale(c.format)
    const total = f.kind === 'pct' && !pct && c.total ? Number(c.total(sortedAll)) : undefined
    if (isTotal && f.kind === 'pct' && !pct) return formatCell(f, 1, { pct: 'ratio', lang })
    return formatCell(f, v, { total, pct, lang, som: t("so'm") })
  }
  const pickCls = (c: Column<R>) => (pick ? cx(pick.key === c.key && 'col-picked', hot === c.key && pick.key !== c.key && 'col-hot') : undefined)
  const pickCell = (c: Column<R>) =>
    pick
      ? {
          onMouseEnter: () => setHot(c.key),
          // capture phase: the page's own clickable cell content (drill-down buttons) must not swallow the pick
          onClickCapture: (e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            pick.set(pick.key === c.key ? null : c.key)
          },
        }
      : {}
  const cellAlign = (c: Column<R>) => (c.align === 'end' ? 'text-end' : c.align === 'center' ? 'text-center' : 'text-start')

  /* ── a header dragged to another place / its edge to another width (coldrag.ts) ── */
  const wrap = useRef<HTMLDivElement>(null)
  const keys = all.map((c) => c.key)
  const shownKeys = columns.map((c) => c.key)
  // a dashboard's viewer (outside edit mode) moves and sizes no columns: the table is the owner's (owner, 2026-10-26)
  const locked = !!block?.mine
  const movable = shownKeys.length > 2 && !locked
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [line, setLine] = useState<{ x: number; h: number; w?: number } | null>(null)
  const [live, setLive] = useState<{ key: string; w: number } | null>(null)
  const drag = useRef<ColDrag | null>(null)
  const flip = useRef<Map<string, number> | null>(null)
  const refocus = useRef<string | null>(null)
  const rtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const commit = (next: TablePatch | undefined) => {
    if (setBlockTable) setBlockTable(next)
    else setMine({ order: next?.order, widths: next?.widths })
  }
  const heads = (): HTMLElement[] => Array.from(wrap.current?.querySelectorAll<HTMLElement>('thead tr:last-child > th[data-col]') ?? [])
  /** the shown columns' places before a move, so the cells slide to their new places after it */
  const remember = () => {
    flip.current = new Map(heads().map((th) => [th.dataset.col!, th.getBoundingClientRect().left]))
  }
  const order = shownKeys.join('\u0001')
  useLayoutEffect(() => {
    const before = flip.current
    flip.current = null
    const root = wrap.current
    if (root && refocus.current) {
      root.querySelector<HTMLElement>(`thead th[data-col="${cssEscape(refocus.current)}"] button`)?.focus()
      refocus.current = null
    }
    if (!before || !root || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return
    const moved: HTMLElement[] = []
    for (const th of heads()) {
      const dx = (before.get(th.dataset.col!) ?? th.getBoundingClientRect().left) - th.getBoundingClientRect().left
      if (Math.abs(dx) < 1) continue
      for (const cell of root.querySelectorAll<HTMLElement>(`[data-col="${cssEscape(th.dataset.col!)}"]`)) {
        cell.style.transition = 'none'
        cell.style.translate = `${dx}px 0`
        moved.push(cell)
      }
    }
    if (!moved.length) return
    void root.offsetWidth
    const raf = requestAnimationFrame(() => {
      for (const cell of moved) {
        cell.style.transition = 'translate 200ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        cell.style.translate = ''
      }
    })
    const done = window.setTimeout(() => moved.forEach((cell) => (cell.style.transition = '')), 260)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `order` is the shown columns
  }, [order])

  const say = (key: string, next: TablePatch | undefined) => {
    const c = columns.find((x) => x.key === key)
    const shown = tableColumns(all, next).map((x) => x.key)
    if (c) announce(t("«{name}» {n}-o'ringa ko'chirildi ({total} tadan)", { name: t(c.label), n: shown.indexOf(key) + 1, total: shown.length }))
  }
  const dropTo = (key: string, slot: number) => {
    const next = dropColumn(keys, patch, shownKeys, key, slot)
    if (next === patch) return
    remember()
    commit(next)
    say(key, next)
  }
  /** where the dragged header would land under the pointer: the line between two columns */
  const track = (d: ColDrag, x: number) => {
    const root = wrap.current
    if (!root) return
    const ths = heads()
    // the dragged header is measured at its own place, not where it follows the pointer (else a drop between two
    // columns to the right was lost when the header was held by its left half)
    const cells = ths.map((th) => {
      const r = th.getBoundingClientRect()
      return { left: r.left - (th === d.th ? parseFloat(d.th.style.translate) || 0 : 0), width: r.width }
    })
    const dir = rtl()
    const slot = dropSlot(cells, x, dir)
    d.slot = slot
    const box = root.getBoundingClientRect()
    // over the middle of another header: the two will trade places (the whole column lights up, like the cards)
    const sw = swapTarget(cells, x, shownKeys.indexOf(d.key))
    d.swap = sw >= 0 ? shownKeys[sw]! : null
    if (sw >= 0) {
      setLine({ x: cells[sw]!.left - box.left + root.scrollLeft, w: cells[sw]!.width, h: (root.querySelector('table') as HTMLElement | null)?.offsetHeight ?? 0 })
      d.th.style.translate = `${x - d.x}px 0`
      return
    }
    const edge = slot < cells.length ? (dir ? cells[slot]!.left + cells[slot]!.width : cells[slot]!.left) : dir ? cells[cells.length - 1]!.left : cells[cells.length - 1]!.left + cells[cells.length - 1]!.width
    const from = shownKeys.indexOf(d.key)
    const still = slot === from || slot === from + 1
    setLine(still ? null : { x: edge - box.left + root.scrollLeft, h: (root.querySelector('table') as HTMLElement | null)?.offsetHeight ?? 0 })
    d.th.style.translate = `${x - d.x}px 0`
    // near the table's edge it scrolls sideways
    if (x < box.left + 28) root.scrollLeft -= 14
    else if (x > box.right - 28) root.scrollLeft += 14
  }
  const begin = (d: ColDrag) => {
    d.started = true
    try {
      d.th.setPointerCapture(d.pointer)
    } catch {
      // a pointer the browser no longer tracks
    }
    setDragKey(d.key)
    document.documentElement.setAttribute('data-col-dragging', '')
    if (d.touch) navigator.vibrate?.(12)
  }
  const finish = (ok: boolean) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    window.clearTimeout(d.timer)
    document.documentElement.removeAttribute('data-col-dragging')
    if (!d.started) return
    d.th.style.translate = ''
    setDragKey(null)
    setLine(null)
    // the click that ends a drag is not a sort / a pick / the block's zoom (EditableBlock skips [data-block-keep])
    d.th.setAttribute('data-block-keep', '')
    d.th.dataset.colSwallow = ''
    window.setTimeout(() => {
      d.th.removeAttribute('data-block-keep')
      delete d.th.dataset.colSwallow
    }, 0)
    if (ok && d.swap) {
      const next = swapColumns(keys, patch, d.key, d.swap)
      if (next !== patch) {
        remember()
        commit(next)
        say(d.key, next)
      }
      return
    }
    if (ok && d.slot !== null) dropTo(d.key, d.slot)
  }
  const headDown = (key: string) => (e: ReactPointerEvent<HTMLTableCellElement>) => {
    if (!movable || e.button !== 0 || shownKeys.indexOf(key) < 1) return
    if ((e.target as Element).closest('.col-resize')) return
    const touch = e.pointerType === 'touch'
    const d: ColDrag = { key, pointer: e.pointerId, x: e.clientX, y: e.clientY, th: e.currentTarget, started: false, touch, slot: null, swap: null, timer: 0 }
    // a finger holds still a moment first (a plain swipe scrolls the table)
    if (touch) d.timer = window.setTimeout(() => drag.current === d && begin(d), 380)
    drag.current = d
  }
  const headMove = (e: ReactPointerEvent<HTMLTableCellElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointer) return
    if (!d.started) {
      const far = Math.hypot(e.clientX - d.x, e.clientY - d.y)
      if (d.touch) {
        if (far > 8) finish(false)
        return
      }
      if (far < 5) return
      begin(d)
    }
    e.preventDefault()
    track(d, e.clientX)
  }
  // a finger's drag must not scroll the page (a non-passive touchmove — React's are passive)
  useEffect(() => {
    const root = wrap.current
    if (!root) return
    const stop = (e: TouchEvent) => {
      if (drag.current?.started) e.preventDefault()
    }
    root.addEventListener('touchmove', stop, { passive: false })
    return () => root.removeEventListener('touchmove', stop)
  }, [])
  useEffect(() => () => document.documentElement.removeAttribute('data-col-dragging'), [])
  const headKey = (c: Column<R>) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    e.stopPropagation()
    // Alt+Shift: its width; Alt: its place
    if (e.shiftKey) {
      const th = (e.currentTarget as HTMLElement).closest('th')
      const now = widthOf(c) ?? th?.getBoundingClientRect().width ?? 120
      commit(withWidth(patch, c.key, now + ((e.key === 'ArrowRight') !== rtl() ? 16 : -16)))
      return
    }
    if (!movable) return
    const next = stepColumn(keys, patch, shownKeys, c.key, (e.key === 'ArrowLeft') !== rtl() ? -1 : 1)
    if (next === patch) return
    remember()
    refocus.current = c.key
    commit(next)
    say(c.key, next)
  }
  const widthOf = (c: Column<R>): number | undefined => (live?.key === c.key ? live.w : (patch?.widths?.[c.key] ?? c.width))
  const sizeDown = (c: Column<R>) => (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const th = e.currentTarget.closest('th')
    if (!th) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // the width still follows the moves over the edge
    }
    const w0 = th.getBoundingClientRect().width
    const x0 = e.clientX
    const sign = rtl() ? -1 : 1
    const el = e.currentTarget
    let w = w0
    const move = (ev: PointerEvent) => {
      w = clampWidth(w0 + (ev.clientX - x0) * sign) ?? w0
      setLive({ key: c.key, w })
    }
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      setLive(null)
      if (ev.type === 'pointerup' && Math.abs(w - w0) >= 2) commit(withWidth(patch, c.key, w))
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  /** a column with a width of its own: its cells keep to it (a long value ends in …) */
  const sized = (c: Column<R>): React.CSSProperties | undefined => {
    const w = widthOf(c)
    if (w === undefined || (live?.key !== c.key && patch?.widths?.[c.key] === undefined)) return undefined
    return { width: w, minWidth: w, maxWidth: w, overflow: 'hidden', textOverflow: 'ellipsis' }
  }
  const show = (c: Column<R>, v: string | number | null) => (v === null ? '—' : typeof v === 'number' ? fmt(c, v) : String(v))

  // the chart pencil (owner, 2026-10-26): a dashboard block's table can be seen as a chart of the same rows — not a
  // long drill list or a boxed side list (the zoomed editor draws its draft form without the pencil)
  const penOk = !!block && maxHeight === undefined && !(numbered && sorted.length > 30)
  const frame = useMemo(
    () =>
      penOk
        ? frameFromTable(columns.map((c) => ({ label: c.group ? `${t(c.group)} · ${t(c.label)}` : t(c.label), values: sorted.map((r) => c.value(r)), format: (v: number) => fmt(c, v), percent: !!percentScale(c.format) })))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fmt follows the patch and the language
    [penOk, columns, sorted, t, patch, lang],
  )

  const view = (
    <div ref={wrap} className={cx('scroll-thin relative overflow-auto', pick && 'pointer-events-auto')} style={{ maxHeight }} onMouseLeave={pick ? () => setHot(null) : undefined}>
      {line && <span aria-hidden className={line.w ? 'col-drop-swap' : 'col-drop-line'} style={{ left: line.x, height: line.h, ...(line.w ? { width: line.w } : {}) }} />}
      <table className={cx('data-table', numbered && 'dt-numbered', pick && 'data-table-pick', dragKey && 'data-table-dragging')}>
        <thead>
          {grouped && (
            <tr>
              {numbered && <th rowSpan={2} className="dt-num" />}
              {groups.map((g, i) =>
                g.label ? (
                  <th key={i} colSpan={g.span} className="!border-b-0 !pb-0 text-center !text-[0.625rem] tracking-[0.08em] text-primary-strong">
                    <span className="block border-b border-[rgb(var(--accent-rgb)/0.35)] pb-1">{t(g.label)}</span>
                  </th>
                ) : (
                  <th key={i} colSpan={g.span} className="!border-b-0" />
                ),
              )}
            </tr>
          )}
          <tr>
            {numbered && !grouped && <th className="dt-num">#</th>}
            {columns.map((c, i) => (
              <th
                key={c.key}
                data-col={c.key}
                className={cx(cellAlign(c), i === 0 && 'dt-pin', c.headClass, pickCls(c), movable && i > 0 && 'col-movable', dragKey === c.key && 'col-dragged', tinted(c) && colColor(c) && 'col-tint')}
                style={{ width: widthOf(c), ...(tinted(c) && colColor(c) ? { '--cc': colColor(c) } : { color: colColor(c) }), ...sized(c) } as React.CSSProperties}
                onMouseEnter={pick ? () => setHot(c.key) : undefined}
                onPointerDown={headDown(c.key)}
                onPointerMove={headMove}
                onPointerUp={() => finish(true)}
                onPointerCancel={() => finish(false)}
                onLostPointerCapture={() => drag.current?.started && finish(true)}
                onContextMenu={(e) => drag.current && e.preventDefault()}
                onClickCapture={(e) => {
                  if (e.currentTarget.dataset.colSwallow === undefined) return
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {movable && i > 0 && <GripVertical aria-hidden size={11} className="col-grip" />}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 uppercase hover:text-ink"
                  // in the zoomed editor a header picks its column (keyboard too); elsewhere it sorts
                  aria-pressed={pick ? pick.key === c.key : undefined}
                  title={pick ? t('Ustunni tanlash') : movable && i > 0 ? t("Tortib joyini o'zgartiring (Alt + ← →)") : undefined}
                  aria-keyshortcuts={movable && i > 0 ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined}
                  onKeyDown={headKey(c)}
                  onClick={() =>
                    pick
                      ? pick.set(pick.key === c.key ? null : c.key)
                      : sortBy(c.key)
                  }
                >
                  {t(c.label)}
                  {sort?.key === c.key && (sort.dir === 'desc' ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                </button>
                {!locked && <span
                  aria-hidden
                  data-block-keep
                  className="col-resize"
                  title={t("Kengligini o'zgartirish (ikki marta bosing — avtomatik)")}
                  onPointerDown={sizeDown(c)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (patch?.widths?.[c.key] !== undefined) commit(withWidth(patch, c.key, undefined))
                  }}
                />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, ri) => (
            <Fragment key={rowKey(r, ri)}>
            <tr onClick={onRow && !pick ? () => onRow(r) : undefined} className={onRow && !pick ? 'cursor-pointer' : undefined}>
              {numbered && <td className="dt-num text-ink-3 num">{ri + 1}</td>}
              {columns.map((c, i) => {
                const v = c.value(r)
                const clickable = !pick && c.onCell && typeof v === 'number' && v > 0
                const own = colColor(c)
                const mine = c.own ? c.own(r) : v
                const bg = ruleBg(c, mine)
                const bar = cmp.get(c.key)?.get(r)
                const line = !!bar && barStyleOf(patch, c.key) === 'line'
                const ring = isRing(c) ? ringOf(c, mine) : undefined
                // the progress look keeps the numbers plain: the colour is in the header, the line and the ring
                const ink = line || ring !== undefined ? undefined : own
                if (ring !== undefined)
                  return (
                    <td
                      key={c.key}
                      data-col={c.key}
                      className={cx(cellAlign(c), 'cell-ring-td', c.cellClass, pickCls(c), dragKey === c.key && 'col-dragged')}
                      style={sized(c)}
                      {...pickCell(c)}
                    >
                      <CellRing ring={ring} color={own} label={ring ? show(c, v) : t("Qiymat yo'q")} />
                    </td>
                  )
                return (
                  <td
                    key={c.key}
                    data-col={c.key}
                    className={cx(cellAlign(c), c.align === 'end' && 'num', i === 0 && 'dt-pin font-medium', c.cellClass, bar && (line ? 'cell-line' : 'cell-cmp'), pickCls(c), dragKey === c.key && 'col-dragged')}
                    style={ink || bg || sized(c) ? { color: ink, backgroundColor: bg, ...sized(c) } : undefined}
                    {...pickCell(c)}
                  >
                    {bar && !line && bar.w !== null && (
                      <span aria-hidden className="cmp-bar" style={{ width: `${Math.max(bar.w > 0 ? 2 : 0, bar.w)}%`, background: own } as React.CSSProperties} />
                    )}
                    {bar && bar.rank !== null && bar.rank <= RANK_BADGES && (
                      <span className={cx('cmp-rank', `cmp-rank-${bar.rank}`)} title={t("{n}-o'rin", { n: bar.rank })} aria-label={t("{n}-o'rin", { n: bar.rank })}>
                        {bar.rank}
                      </span>
                    )}
                    {c.render && !(patch?.colFormat?.[c.key] && typeof v === 'number') ? (
                      c.render(r)
                    ) : clickable ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          c.onCell!(r)
                        }}
                        className="rounded-[6px] px-1 font-semibold text-ink underline-offset-2 hover:bg-primary-soft hover:underline"
                        // numbers stay black whatever the block's colour (owner, 2026-10-26); a column's own colour wins
                        style={ink ? { color: ink } : undefined}
                      >
                        {show(c, v)}
                      </button>
                    ) : (
                      show(c, v)
                    )}
                    {line && (
                      <span aria-hidden className="cmp-line">
                        {bar.w !== null && <span style={{ width: `${Math.max(bar.w > 0 ? 3 : 0, bar.w)}%`, background: own }} />}
                      </span>
                    )}
                    {bars && !bar && typeof v === 'number' && (colMax.get(c.key) ?? 0) > 0 && (
                      <span
                        aria-hidden
                        className="cell-bar"
                        style={{ '--w': `${Math.max(2, (v / colMax.get(c.key)!) * 100)}%`, background: own } as React.CSSProperties}
                      />
                    )}
                  </td>
                )
              })}
            </tr>
            {expanded?.(r) != null && (
              <tr className="row-expanded">
                <td colSpan={columns.length + (numbered ? 1 : 0)} className="!p-0">
                  {expanded(r)}
                </td>
              </tr>
            )}
            </Fragment>
          ))}
          {!sorted.length && (
            <tr>
              <td colSpan={columns.length + (numbered ? 1 : 0)} className="py-8 text-center text-ink-3">
                {t(empty ?? "Tanlangan davrda ma'lumot yo'q")}
              </td>
            </tr>
          )}
        </tbody>
        {top && top > 0 && sortedAll.length > top && (
          <tbody>
            <tr>
              <td colSpan={columns.length + (numbered ? 1 : 0)} className="py-2 text-center text-[0.75rem] text-ink-3">
                {t("Eng yuqori {n} tasi ko'rsatilgan ({total} tadan)", { n: top, total: sortedAll.length })}
              </td>
            </tr>
          </tbody>
        )}
        {totals && sorted.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              {numbered && <td className="dt-num bg-surface-2" />}
              {columns.map((c, i) => {
                const v = i === 0 ? t('Jami') : c.total ? c.total(sortedAll) : null
                return (
                  <td
                    key={c.key}
                    data-col={c.key}
                    className={cx(cellAlign(c), 'border-t-2 border-[var(--border-strong)] bg-surface-2 py-2.5', c.align === 'end' && 'num', i === 0 && 'dt-pin', pickCls(c), dragKey === c.key && 'col-dragged')}
                    style={(colColor(c) && !tinted(c)) || sized(c) ? { color: tinted(c) ? undefined : colColor(c), ...sized(c) } : undefined}
                    {...pickCell(c)}
                  >
                    {v === null ? '' : typeof v === 'number' ? fmt(c, v, true) : v}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
  if (!frame) return view
  // the pencil's "Rangli chiziqli jadval" (owner, 2026-10-26): the same table in the progress look, with a live preview
  const numCols = all.filter((c, i) => i > 0 && rows.some((r) => typeof c.value(r) === 'number'))
  const numKeys = numCols.map((c) => c.key)
  const pctKeys = numCols.filter((c) => percentScale(c.format)).map((c) => c.key)
  const progress = progressOn(patch, numKeys, pctKeys)
  const applyLook = (next: TablePatch) => {
    const clean = tidyTable(next)
    if (setBlockTable) setBlockTable(clean)
    else setMine({ ...mine, colColors: clean?.colColors, colRules: clean?.colRules, barStyle: clean?.barStyle })
  }
  const variations = numKeys.length
    ? (done: () => void) => (
        <ProgressTile
          on={progress}
          cols={[...numCols.filter((c) => !pctKeys.includes(c.key)).slice(0, pctKeys.length ? 3 : 4), ...numCols.filter((c) => pctKeys.includes(c.key)).slice(0, 1)].map((c) => ({ key: c.key, label: t(c.label), pct: percentScale(c.format), values: sorted.slice(0, 3).map((r) => c.value(r)) }))}
          first={sorted.slice(0, 3).map((r) => String(all[0]!.value(r) ?? ''))}
          onPick={() => {
            applyLook(
              progress
                ? withBarStyle(withAllBars(withRings(withColorful(patch, numKeys, false), pctKeys, false), numKeys, undefined), 'fill')
                : withProgressLook(patch, numKeys, pctKeys),
            )
            done()
          }}
        />
      )
    : undefined
  return (
    <PenSwitch
      variations={variations}
      frame={frame}
      height={Math.min(440, Math.max(260, frame.categories.length * 30))}
      chartKey={`table:${frame.categories.length > 0 ? t(columns[0]!.label) : ''}:${frame.series.map((x) => x.name).join('|')}`}
      onClick={onRow ? (p) => { const r = sorted[p.dataIndex]; if (r) onRow(r) } : undefined}
    >
      {view}
    </PenSwitch>
  )
}

/** a header being dragged (coldrag.ts): from where, and the place it would land (`slot` among the shown columns) */
interface ColDrag {
  key: string
  pointer: number
  x: number
  y: number
  th: HTMLTableCellElement
  started: boolean
  /** a finger: the drag starts after a long press */
  touch: boolean
  slot: number | null
  /** dropped on the middle of this shown column: the two swap */
  swap: string | null
  timer: number
}

const cssEscape = (s: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'))

/**
 * A percent cell as a small ring (the progress look, colRules "ring"): the share filled in the column's colour (else red …
 * green by the value), the % inside; "–" when the cell has no value. 28px; the number stays readable for screen readers.
 */
function CellRing({ ring, color, label }: { ring: { fill: number; pct: number } | null; color?: string; label: string }) {
  const r = 11.5
  const len = 2 * Math.PI * r
  const stroke = color ?? (ring ? `hsl(${ringHue(ring.fill)} 62% 44%)` : undefined)
  return (
    <span className="cell-ring" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden>
        <circle cx="14" cy="14" r={r} className="cell-ring-track" />
        {ring && ring.fill > 0 && (
          <circle cx="14" cy="14" r={r} className="cell-ring-fill" style={{ stroke, strokeDasharray: `${(ring.fill / 100) * len} ${len}` }} />
        )}
      </svg>
      <span className="cell-ring-text">{ring ? `${Math.round(ring.pct)}%` : '–'}</span>
    </span>
  )
}

/** The pencil's progress-look tile: a few of the table's own rows drawn in that look (colours, lines, a ring). */
function ProgressTile({ on, cols, first, onPick }: { on: boolean; cols: { key: string; label: string; pct: 'ratio' | 'percent' | null; values: (string | number | null)[] }[]; first: string[]; onPick: () => void }) {
  const { t } = useT()
  const colors = paletteFor(cols.map((c) => c.key))
  const max = (c: (typeof cols)[number]) => Math.max(0, ...c.values.map((v) => (typeof v === 'number' ? v : 0)))
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={cx(
        'pen-tile pressable mt-2 flex w-full min-w-0 flex-col gap-1 rounded-[16px] border p-2 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
        on ? 'border-[var(--primary)] bg-primary-soft' : 'border-line bg-surface-2/60 hover:bg-surface-2',
      )}
    >
      <div aria-hidden className="pointer-events-none overflow-hidden rounded-[10px] bg-surface/70 px-2 py-1.5">
        <table className="progress-mini w-full">
          <thead>
            <tr>
              <th />
              {cols.map((c) => (
                <th key={c.key} className="col-tint" style={{ '--cc': COLOR_HEX[colors[c.key]!] } as React.CSSProperties}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {first.map((name, ri) => (
              <tr key={ri}>
                <td>{name}</td>
                {cols.map((c) => {
                  const v = c.values[ri]
                  const hex = COLOR_HEX[colors[c.key]!]
                  if (c.pct) return <td key={c.key}><CellRing ring={ringValue(typeof v === 'number' ? v : null, c.pct)} color={hex} label="" /></td>
                  const m = max(c)
                  return (
                    <td key={c.key}>
                      {typeof v === 'number' ? Math.round(v) : '—'}
                      <span className="cmp-line"><span style={{ width: `${typeof v === 'number' && m > 0 ? Math.max(3, (v / m) * 100) : 0}%`, background: hex }} /></span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="flex min-w-0 items-center gap-1">
        <span className={cx('min-w-0 flex-1 truncate text-[0.8125rem] font-semibold', on ? 'text-primary-strong' : 'text-ink')}>{t('Rangli chiziqli jadval')}</span>
      </span>
      <span className="text-[0.75rem] text-ink-3">{t("Har ustun o'z rangida, son ostida chiziq, foizlar halqada")}</span>
    </button>
  )
}

/** Sum helper for totals. */
export const sum = <R,>(get: (r: R) => number | null) => (rows: R[]) => rows.reduce((s, r) => s + (get(r) ?? 0), 0)
