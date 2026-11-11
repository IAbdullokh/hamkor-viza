import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { GripVertical, Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { useT, uzbekOf } from '@/i18n'
import { cx } from '@/lib/cx'
import { useToast } from '@/ui/overlay'
import type { VisualType } from '@/spec'
import { BlockChartCtx, BlockDeleteCtx, blockId, useBlockEdit, type BlockDelete, type BlockInfo, type BlockPatch, type HierInfo } from './context'
import { announce } from './announce'
import { canMove, domBlocksIn, domItems, domLegacyShift, domUnits, onBlocksChange, placeOf, V2, placesAfterDrop, placesAfterSwap, sortContainer, unitOf, watchContainer, withHidden, withOrder } from './order'
import { mergeChange, tidyTable, withBlock, type TableColumnInfo, type TablePatch } from './patch'
import { SizeTools } from './SizeTools'
import { OwnBlock } from './OwnBlock'
import { BlockUndo } from './HistoryTools'
import { shownViews, tableFor, useCurrentView, validView, withViewTable, type ViewOption } from './views'
import { markGrid } from './layout'
import { useBlockWorking } from './bgwork'
import { flashCell, takeFlash } from './flash'
import './blockedit.css'

/**
 * One block of a dashboard (a KPI tile or a card) as edit mode sees it. Outside edit mode it only applies the saved edit
 * (new title, hidden, chart form, place). In edit mode the block gets a dashed outline, opens zoomed on click
 * (BlockEditOverlay), and has two tools in its corner (DataLens style): ⠿ to drag it to another place among the blocks
 * it can trade places with (its grid, or the page's column for a card that sits alone — order.ts unitOf; mouse, touch or
 * the arrow keys) and ✕ to remove it (undo in the toast, and "Yashirilgan bloklar" brings it back). Once a block of the
 * page was moved, every block keeps its wrapper outside edit mode too, so what trades places is the same in both modes.
 * `render` draws the block with a given edit — the overlay uses it for the live preview.
 * Kept free of the UI kit's controls (ui/controls imports this file).
 */
export function EditableBlock({
  kind,
  title,
  idTitle,
  className,
  render,
  explain,
}: {
  kind: BlockInfo['kind']
  title: string
  /**
   * The block's title in Uzbek, as the page wrote it (with its industry words): the block's id in every language. Without
   * it the shown title is read back through the dictionary, which can give another id in Russian / English (aliases.ts).
   */
  idTitle?: string
  /** the card's own className: its grid placement (col-span …) moves to the edit wrapper */
  className?: string
  render: (patch: BlockPatch) => ReactNode
  /** how the block's number is computed (a KPI card: pages/lead/explain.ts) — Nova's metric_definition; the latest one is read */
  explain?: () => unknown
}) {
  const be = useBlockEdit()
  const del = useContext(BlockDeleteCtx)
  // the latest definition (it follows the page's period and filters); the block info reads it when Nova is asked
  const explainRef = useRef(explain)
  explainRef.current = explain
  const readExplain = useCallback(() => explainRef.current?.(), [])
  const explainOf = explain ? readExplain : undefined
  const [chart, setChart] = useState<BlockInfo['chart']>()
  const report = useCallback((origin: VisualType, visuals: VisualType[], measures?: string[]) => {
    setChart((c) =>
      c && c.origin === origin && c.visuals.join() === visuals.join() && (c.measures ?? []).join('\u0001') === (measures ?? []).join('\u0001')
        ? c
        : { origin, visuals, measures: measures?.length ? measures : undefined },
    )
  }, [])
  // a table inside the block tells its columns (kit/DataTable): the zoomed editor lists them, Nova reads them
  const [table, setTable] = useState<BlockInfo['table']>()
  const reportTable = useCallback((columns: TableColumnInfo[]) => {
    setTable((c) => (c && sameColumns(c.columns, columns) ? c : { columns }))
  }, [])
  // a table that can be nested tells its breakdowns (kit/hier): the zoomed editor's "Ierarxiya", Nova
  const [hier, setHier] = useState<HierInfo>()
  const reportHier = useCallback((h: HierInfo) => {
    setHier((c) => (c && JSON.stringify(c) === JSON.stringify(h) ? c : h))
  }, [])
  const id = be ? blockId(be.page, kind, idTitle ?? uzbekOf(title)) : ''
  // the id the shown title read back to before idTitle: what was kept under it is still this block's (aliases.ts)
  const oldId = be && idTitle !== undefined ? blockId(be.page, kind, uzbekOf(title)) : ''
  const alias = be?.alias
  const forget = be?.forget
  useEffect(() => {
    if (!alias || !id) return
    alias(id, oldId && oldId !== id ? oldId : null)
  }, [alias, id, oldId])
  useEffect(() => (forget && id ? () => forget(id) : undefined), [forget, id])
  const patch = be?.edits[id]
  // a view switcher in the block's header tells its views (views.ts): the table settings are the view stood on's
  const [views, setViews] = useState<ViewOption[]>()
  const reportViews = useCallback((v: ViewOption[]) => {
    setViews((c) => (c && JSON.stringify(c) === JSON.stringify(v) ? c : v))
  }, [])
  const stored = useCurrentView(id)
  const view = views ? validView(stored, shownViews(views, patch?.views)) : undefined
  const viewTable = views ? tableFor(patch, view) : patch?.table
  // the chart pencil: in edit mode the block's form for everyone, outside it this viewer's own (context.tsx routes it:
  // personal.ts keeps it in their browser only, nothing goes to the server)
  const apply = be?.apply
  const setVisual = useMemo(
    () =>
      apply && id
        ? (visual: VisualType | null) => {
            apply((prev) => withBlock(prev, id, mergeChange(prev[id], { visual: visual ?? undefined }))).catch(() => undefined)
          }
        : undefined,
    [apply, id],
  )
  // a table's columns dragged on their headers (kit/DataTable): in edit mode the defaults for everyone, saved at once —
  // the view stood on's table when the block has views (views.ts withViewTable)
  const editing = !!be?.editing && !!be.canEdit
  const saveTable = useMemo(
    () =>
      // outside edit mode a viewer's own (personal.ts), like the pencil
      apply && id
        ? (table: TablePatch | undefined) => {
            apply((prev) =>
              withBlock(prev, id, mergeChange(prev[id], view ? { viewTables: withViewTable(prev[id]?.viewTables, view, table) } : { table: tidyTable(table) })),
            ).catch(() => undefined)
          }
        : undefined,
    [apply, editing, id, view],
  )
  // the chart pencil's opener, for the ✏️ among the corner tools in edit mode
  const penOpen = useRef<(() => void) | null>(null)
  const [hasPen, setHasPen] = useState(false)
  const registerPen = useCallback((open: (() => void) | null) => {
    penOpen.current = open
    setHasPen(!!open)
  }, [])
  const chartCtx = useMemo(
    () => ({ visual: patch?.visual, measure: patch?.visualMeasure, color: patch?.color, table: viewTable, report, reportTable, reportHier, setVisual, setTable: saveTable, blockId: id, views: patch?.views, reportViews, mine: !editing, registerPen }),
    [patch?.visual, patch?.visualMeasure, patch?.color, viewTable, report, reportTable, reportHier, setVisual, saveTable, id, patch?.views, reportViews, editing, registerPen],
  )
  const ref = useRef<HTMLDivElement>(null)
  const order = patch?.order
  // a size kept under "Avtomatik" (patch.off) is not applied: the system lays the page out
  const span = patch?.off ? undefined : patch?.span
  const height = !patch?.off && !patch?.hpx && (patch?.h === 'compact' || patch?.h === 'tall') ? patch.h : undefined
  // "Qo'lda": a height of its own — the card is exactly this tall (empty space below, or its bottom cut off)
  const hpx = !patch?.off && patch?.hpx ? patch.hpx : undefined
  // outside edit mode every viewer has the block's tools too (their own view, personal.ts): always wrapped then
  const wrapped = !!be && !patch?.hidden

  // the "Yashirilgan bloklar" list names blocks by their own title, also while they are hidden
  // the zoomed block follows its table, breakdowns and views while open (another view stood on has other columns)
  const focused = be?.focused
  const refocus = be?.focus
  useEffect(() => {
    if (!focused || !refocus || focused.id !== id) return
    if (focused.table === table && focused.hier === hier && focused.views === views && focused.chart === chart) return
    refocus({ ...focused, table, hier, views, chart })
  }, [focused, refocus, id, table, hier, views, chart])

  // Nova or the AI tips working on this block with its editor closed, or Nova's answer waiting (bgwork.ts): a sign on the block
  const working = useBlockWorking(be?.scope, id)
  const { t } = useT()

  // the block whose editor was open when edit mode was left in the middle opens it again (context.tsx takeResume)
  const takeResume = be?.takeResume
  useEffect(() => {
    if (editing && id && takeResume?.(id)) refocus?.({ id, kind, title, chart, table, hier, render, views, explain: explainOf })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when edit mode comes back
  }, [editing, id, takeResume])

  // the change log asked for this block before its page drew it: it blinks now (flash.ts)
  useEffect(() => {
    if (id && takeFlash(id) && ref.current) flashCell(ref.current)
  }, [id])

  const describe = be?.describe
  useEffect(() => {
    if (describe && id) describe({ id, kind, title, chart, table, views, explain: explainOf })
  }, [describe, id, kind, title, chart, table, views, explainOf])
  const remember = be?.remember
  useEffect(() => {
    if (remember && id) remember(id, title)
  }, [remember, id, title])
  // after every render: the block's place on its unit (the wrapper itself, or the lone wrapper around it — order.ts),
  // the container's units at their saved places, and kept so while React renders into the container
  const marked = useRef<Element | null>(null)
  const spanned = useRef<Element | null>(null)
  const watch = useRef<{ el: Element; release: () => void } | null>(null)
  useLayoutEffect(() => {
    const cell = ref.current
    const u = cell ? unitOf<Element>(cell, domBlocksIn) : null
    // a place saved in the first form counts the filter bar above the first card too (order.ts legacyShift)
    const place = u ? placeOf(order, u.unit !== cell, order !== undefined && order < V2 ? domLegacyShift(u.container) : 0) : undefined
    const unit = u && place !== undefined ? u.unit : null
    if (marked.current && marked.current !== unit) marked.current.removeAttribute('data-block-order')
    marked.current = unit
    if (unit) unit.setAttribute('data-block-order', String(place))
    // a column of lone cards gets an even gap between all its children (the KPI grid moved below a card has no margin)
    if (unit && unit !== cell) u!.container.setAttribute('data-block-column', '')
    // its size (layout.ts): the span on its unit, the container a 12-column grid while any of its units has one
    const sizedUnit = u && span !== undefined ? u.unit : null
    if (spanned.current && spanned.current !== sizedUnit) {
      spanned.current.removeAttribute('data-block-span')
      markGrid(spanned.current.parentElement)
    }
    spanned.current = sizedUnit
    if (sizedUnit && sizedUnit.getAttribute('data-block-span') !== String(span)) sizedUnit.setAttribute('data-block-span', String(span))
    if (u) markGrid(u.container as HTMLElement)
    const want = unit ? u!.container : null
    if (watch.current?.el !== want) {
      watch.current?.release()
      watch.current = want ? { el: want, release: watchContainer(want) } : null
    }
    if (u) sortContainer(u.container)
  })
  useEffect(
    () => () => {
      marked.current?.removeAttribute('data-block-order')
      const s = spanned.current
      if (s) {
        s.removeAttribute('data-block-span')
        markGrid(s.parentElement)
      }
      watch.current?.release()
      watch.current = null
    },
    [],
  )

  if (!be) return <>{render({})}</>
  if (patch?.hidden) return null
  // a block with its own data draws that in its place (OwnBlock); "Asl holiga" brings the page's own back
  const body = patch?.source ? (
    // inside the block's context: its own table takes the same column settings as a page's table
    <BlockChartCtx.Provider value={chartCtx}>
      <OwnBlock source={patch.source} title={patch.title ?? title} color={patch.color} />
    </BlockChartCtx.Provider>
  ) : (
    <BlockChartCtx.Provider value={chartCtx}>{render(patch ?? {})}</BlockChartCtx.Provider>
  )
  if (!wrapped) return body

  const shown = patch?.title ?? title
  const open = () => be.focus({ id, kind, title, chart, table, hier, render, views, explain: explainOf })
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  // one element in and out of edit mode, so the card inside (and its chart) is not drawn again on the switch
  return (
    <div
      ref={ref}
      data-block-id={id}
      role={be.editing ? 'button' : undefined}
      tabIndex={be.editing ? 0 : undefined}
      aria-label={be.editing ? `✎ ${shown}` : undefined}
      onClickCapture={
        be.editing
          ? (e) => {
              if ((e.target as Element).closest('.block-edit-tools, .block-size-tools')) return
              // the block's own header controls (a view switcher) keep working in edit mode
              if ((e.target as Element).closest('[data-block-keep]')) return
              e.preventDefault()
              e.stopPropagation()
              open()
            }
          : undefined
      }
      onKeyDown={be.editing ? onKey : undefined}
      data-block-h={height}
      data-block-sized={hpx ? '' : undefined}
      style={hpx ? { height: hpx } : undefined}
      className={cx('block-cell', be.editing ? 'block-edit' : 'block-mine', placement(className))}
    >
      {body}
      {working && (
        <span role="status" className="block-working">
          {working === 'working' ? <Loader2 aria-hidden size={13} className="animate-spin" /> : <Sparkles aria-hidden size={13} />}
          {working === 'working' ? t('Nova ishlayapti') : t('Javob tayyor')}
        </span>
      )}
      {be.editing && (
        <span aria-hidden className="block-edit-tag">
          ✎ {shown}
        </span>
      )}
      {/* move / size / remove are the owner's, in edit mode only; viewers change filters, the look and chart types */}
      {be.editing && <BlockTools id={id} title={shown} cell={ref} del={del} mine={false} pen={hasPen ? () => penOpen.current?.() : null} />}
      {be.editing && <SizeTools id={id} kind={kind} title={shown} cell={ref} />}
    </div>
  )
}

/** ⠿ and ✕ in the corner of a block in edit mode (✕ hides a page's own block, deletes an added one — `del`) */
function BlockTools({ id, title, cell, del, mine, pen }: { id: string; title: string; cell: RefObject<HTMLDivElement | null>; del: BlockDelete | null; mine?: boolean; pen?: (() => void) | null }) {
  const { t } = useT()
  const toast = useToast()
  const be = useBlockEdit()!
  const handle = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)
  const drag = useRef<Drag | null>(null)
  // the ⠿ shows only when there is something to trade places with (a page with one card has nothing). Asked from the
  // tools' own element: on the first render in edit mode the block's wrapper mounts in the same commit, and React sets
  // the wrapper's ref (`cell`) only after this child's layout effect — reading it here gave no ⠿ until a redraw. Asked
  // again when blocks come or go anywhere on the dashboard (a sibling drawn later, one hidden) — order.ts onBlocksChange.
  const tools = useRef<HTMLSpanElement>(null)
  const [movable, setMovable] = useState(false)
  const recheck = useCallback(() => {
    const el = tools.current?.parentElement
    const n = el ? canMove<Element>(el, domBlocksIn, domItems) : false
    setMovable((m) => (m === n ? m : n))
  }, [])
  useLayoutEffect(recheck)
  useEffect(() => {
    const root = tools.current?.closest('[data-block-root]')
    return root ? onBlocksChange(root, recheck) : undefined
  }, [recheck])

  // a keyboard move re-inserts the block in the DOM, which drops the focus: give it back to the handle
  useLayoutEffect(() => {
    if (refocus.current) {
      refocus.current = false
      handle.current?.focus()
    }
  })

  /**
   * Where this block moves (order.ts unitOf): its unit, the container's children, the units in it (they get a place) and
   * the items it can be dropped next to — the other units, and a KPI grid or a pair of cards standing between them
   */
  const box = (): Box | null => {
    const el = cell.current ?? tools.current?.parentElement
    const u = el ? unitOf<Element>(el, domBlocksIn) : null
    if (!u) return null
    // places are counted among the children that hold a block only: a note that comes and goes never shifts them (order.ts)
    const items = domItems(u.container)
    return { unit: u.unit as HTMLElement, kids: items, units: domUnits(u.container), items }
  }

  /** drops the unit before / after `target` and stores the new places; `said` is told to a screen reader */
  const store = (b: Box, target: HTMLElement, after: boolean, swap = false) => {
    const places = swap ? placesAfterSwap(b.kids, b.units, b.unit, target) : placesAfterDrop(b.kids, b.units, b.unit, target, after)
    if (!places) return false
    const moved = b.items.filter((x) => x !== b.unit)
    const at = swap ? b.items.indexOf(target) : moved.indexOf(target) + (after ? 1 : 0)
    be.apply((prev) => withOrder(prev, places)).then(
      () => announce(t("«{name}» {n}-o'ringa ko'chirildi ({total} tadan)", { name: title, n: at + 1, total: b.items.length })),
      () => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error'),
    )
    return true
  }

  const failed = () => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
  const remove = () => {
    if (del) {
      del().then((undo) => {
        announce(t("«{name}» o'chirildi", { name: title }))
        toast(t("«{name}» o'chirildi", { name: title }), 'info', { action: { label: t('Qaytarish'), onClick: () => void undo().catch(failed) } })
      }, failed)
      return
    }
    be.apply((prev) => withHidden(prev, [id], true)).then(
      () => {
        const said = mine ? t("«{name}» sizga ko'rsatilmaydi — «Asl holiga» qaytaradi", { name: title }) : t("«{name}» o'chirildi", { name: title })
        announce(said)
        toast(said, 'info', {
          action: { label: t('Qaytarish'), onClick: () => void be.apply((prev) => withHidden(prev, [id], false)).catch(() => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')) },
        })
      },
      () => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error'),
    )
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight'
    if (!back && !fwd && e.key !== 'Home' && e.key !== 'End') {
      // Enter / Space on the handle must not open the zoomed block
      if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
      e.stopPropagation()
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const b = box()
    if (!b) return
    const from = b.items.indexOf(b.unit)
    // left / right swap in a right-to-left page
    const rtl = document.documentElement.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    const step = back !== rtl ? -1 : 1
    const target = e.key === 'Home' ? b.items[0] : e.key === 'End' ? b.items[b.items.length - 1] : b.items[from + step]
    if (!target || target === b.unit) return
    const after = e.key === 'End' || (e.key !== 'Home' && step > 0)
    refocus.current = store(b, target, after)
  }

  const clearDrop = (d: NonNullable<typeof drag.current>) => {
    if (d.over) {
      delete d.over.dataset.drop
      delete d.over.dataset.dropAxis
    }
    d.over = null
  }
  const end = (commit: boolean) => {
    const d = drag.current
    const el = cell.current
    drag.current = null
    if (!d || !el) return
    cancelAnimationFrame(d.raf)
    el.style.translate = ''
    delete el.dataset.dragging
    document.documentElement.removeAttribute('data-block-dragging')
    const target = d.over
    const after = d.after
    const swap = d.swap
    clearDrop(d)
    if (!commit || !target) return
    store(d.box, target, after, swap)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const b = box()
    if (e.button !== 0 || !cell.current || !b) return
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // a pointer the browser no longer tracks: the drag still follows its moves while over the handle
    }
    const d: Drag = { x: e.clientX, y: e.clientY, sy: window.scrollY, cx: e.clientX, cy: e.clientY, pointer: e.pointerId, box: b, over: null, after: false, swap: false, raf: 0 }
    drag.current = d
    cell.current.dataset.dragging = ''
    document.documentElement.setAttribute('data-block-dragging', '')
    // while the pointer is held near the top or bottom edge the page keeps scrolling (a finger on a phone stays still)
    const tick = () => {
      if (drag.current !== d) return
      const v = d.cy < 70 ? -14 : d.cy > window.innerHeight - 70 ? 14 : 0
      if (v) {
        const before = window.scrollY
        window.scrollBy(0, v)
        if (window.scrollY !== before) track(d)
      }
      d.raf = requestAnimationFrame(tick)
    }
    d.raf = requestAnimationFrame(tick)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointer) return
    d.cx = e.clientX
    d.cy = e.clientY
    track(d)
  }
  /** the dragged block under the pointer (also while the page scrolls under it), and where it would land */
  const track = (d: Drag) => {
    const el = cell.current
    if (!el) return
    el.style.translate = `${d.cx - d.x}px ${d.cy - d.y + window.scrollY - d.sy}px`
    // what is under the pointer: another card of the same grid, or in the page's column another lone card, the KPI
    // grid or a pair of cards
    let over: HTMLElement | null = null
    for (const hit of document.elementsFromPoint(d.cx, d.cy)) {
      over = d.box.items.find((x) => x !== d.box.unit && x.contains(hit)) ?? null
      if (over) break
    }
    // an empty spot of the grid (owner: "it should fit even if not perfectly"): the nearest card there takes the drop
    if (!over) over = nearest(d.box, d.cx, d.cy)
    if (over !== d.over) clearDrop(d)
    const parent = over?.parentElement
    if (!over || !parent) return
    const r = over.getBoundingClientRect()
    // a block as wide as its container (a column of cards) takes the drop above / below, a grid cell left / right
    const axis = r.width >= parent.getBoundingClientRect().width * 0.66 ? 'y' : 'x'
    let after = axis === 'y' ? d.cy > r.top + r.height / 2 : d.cx > r.left + r.width / 2
    if (axis === 'x' && document.documentElement.dir === 'rtl') after = !after
    // the middle of a card swaps the two cards; its edges insert before / after it
    const f = axis === 'y' ? (d.cy - r.top) / r.height : (d.cx - r.left) / r.width
    const swap = f > 0.25 && f < 0.75
    d.over = over
    d.after = after
    d.swap = swap
    over.dataset.drop = swap ? 'swap' : after ? 'after' : 'before'
    over.dataset.dropAxis = axis
  }

  return (
    <span ref={tools} className="block-edit-tools">
      <BlockUndo id={id} />
      {pen && (
        <button
          type="button"
          className="block-tool"
          data-block-keep=""
          aria-label={t("«{name}» — grafik turi", { name: title })}
          title={t('Grafik turi')}
          onClick={(e) => {
            e.stopPropagation()
            pen()
          }}
        >
          <Pencil aria-hidden size={14} />
        </button>
      )}
      {movable && (
        <button
          ref={handle}
          type="button"
          className="block-tool block-tool-grip"
          aria-label={t("«{name}» — joyini o'zgartirish: tortib boring yoki strelka tugmalari", { name: title })}
          title={t("Joyini o'zgartirish")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => end(true)}
          onPointerCancel={() => end(false)}
          onLostPointerCapture={() => drag.current && end(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && drag.current) {
              e.stopPropagation()
              end(false)
              return
            }
            onKey(e)
          }}
        >
          <GripVertical aria-hidden size={15} />
        </button>
      )}
      <button
        type="button"
        className="block-tool block-tool-remove"
        aria-label={mine ? t("«{name}» — menga ko'rsatmaslik", { name: title }) : t("«{name}» — o'chirish", { name: title })}
        title={mine ? t("Menga ko'rsatmaslik") : t("O'chirish")}
        onClick={(e) => {
          e.stopPropagation()
          remove()
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <X aria-hidden size={15} />
      </button>
    </span>
  )
}

interface Drag {
  /** where the pointer went down, the page's scroll then, and where the pointer is now */
  x: number
  y: number
  sy: number
  cx: number
  cy: number
  pointer: number
  box: Box
  over: HTMLElement | null
  after: boolean
  /** dropped on the middle of `over`: the two trade places */
  swap: boolean
  raf: number
}

interface Box {
  unit: HTMLElement
  kids: HTMLElement[]
  units: ReturnType<typeof domUnits>
  items: HTMLElement[]
}

/** the item of the box nearest to the pointer while it is inside the container (an empty cell of a sized grid) */
function nearest(b: Box, x: number, y: number): HTMLElement | null {
  const c = b.unit.parentElement?.getBoundingClientRect()
  if (!c || x < c.left - 24 || x > c.right + 24 || y < c.top - 24 || y > c.bottom + 24) return null
  let best: HTMLElement | null = null
  let dist = Infinity
  for (const it of b.items) {
    if (it === b.unit) continue
    const r = it.getBoundingClientRect()
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    const dd = dx * dx + dy * dy
    if (dd < dist) {
      dist = dd
      best = it
    }
  }
  return best
}

// the numbers too (Nova's "nega 0%?" about a picked column reads them; a filter changes them)
const sameColumns = (a: TableColumnInfo[], b: TableColumnInfo[]) =>
  a.length === b.length && a.every((c, i) => c.key === b[i]!.key && c.label === b[i]!.label && !!c.num === !!b[i]!.num && JSON.stringify(c.stats ?? null) === JSON.stringify(b[i]!.stats ?? null))

/** the grid placement classes of a card (col-span, row-span, order, start) — they belong on the outer element */
function placement(className?: string): string {
  return (className ?? '')
    .split(/\s+/)
    .filter((c) => /(^|:)(col-span|row-span|col-start|col-end|row-start|order)-/.test(c))
    .join(' ')
}
