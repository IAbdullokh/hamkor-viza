import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { Check, Maximize2 } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useToast } from '@/ui/overlay'
import { useBlockEdit, type BlockInfo } from './context'
import { announce } from './announce'
import { domBlocksIn, unitOf } from './order'
import {
  EDGES, GRID, HEIGHT_LABELS, HEIGHTS, SIZE_LABELS, SIZE_NAMES, SIZE_SPANS, autoHeight, autoSpanOf, edgeAxes, fromScreen, gridOf, manualHeight, markGrid,
  quickSpans, sizeOf, snapSpan, spanCandidates, spanFromWidth, widthFromDrag, withDragHeight, withHeight, withSpan, type BlockHeight, type DragHeight,
  type Edge, type Sizing,
} from './layout'
import { getSizing } from './sizing'

/**
 * A block's size in edit mode (layout.ts): every side and corner of the blue frame drags it (owner, 2026-11-03) — the
 * left and right sides its width in columns of the 12-column grid (a left side grows when pulled out, shrinks when pulled
 * in), the bottom its height, a corner both, shown live with a "6/12 · 340px" pill. How it snaps is the edit bar's
 * "O'lcham" (sizing.ts): Avtomatik to the other cards' widths and heights, Qo'lda anywhere (empty space allowed). "O'lcham" picks a quick size — Kichik / O'rta / Katta / To'liq qator, "Avtomatik" — and the
 * height. Saved at once; the edit bar's buttons put every card back. The bottom-right corner also takes the arrow keys.
 */
export function SizeTools({ id, kind, title, cell }: { id: string; kind: BlockInfo['kind']; title: string; cell: RefObject<HTMLDivElement | null> }) {
  const { t } = useT()
  const toast = useToast()
  const be = useBlockEdit()!
  const [open, setOpen] = useState(false)
  // the block's automatic share, read when the menu opens: Kichik is narrower and Katta wider than it (layout.ts)
  const [auto, setAuto] = useState<number | undefined>(undefined)
  // a narrow card at the start of the page opens the menu toward the page, not under the side menu
  const [flip, setFlip] = useState(false)
  const menu = useRef<HTMLSpanElement>(null)
  const drag = useRef<{
    edge: Edge
    x: number
    y: number
    w: number
    inner: number
    gap: number
    unit: HTMLElement
    span: number
    was: string | null
    mode: Sizing
    /** Avtomatik's widths (layout.ts spanCandidates) */
    spans: number[]
    /** the cell's height when the drag began, its own (no size of its height), its row neighbours' */
    h: number
    natural: number
    neighbours: number[]
    /** the height on screen at the start, and the one the drag is on now (null = unchanged) */
    minH0: string
    attrH0: string | null
    to: DragHeight | null
  } | null>(null)
  // the size shown on the block while it is dragged
  const [live, setLive] = useState<{ span: number; h: string | null } | null>(null)
  const patch = be.edits[id]
  // a size kept under "Avtomatik" is not the size shown
  const span = patch?.off ? undefined : patch?.span
  const height: BlockHeight | undefined = !patch?.off && !patch?.hpx && (patch?.h === 'compact' || patch?.h === 'tall') ? patch.h : undefined
  const failed = () => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')

  useEffect(() => {
    if (!open) return
    const off = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const setSpan = (n: number | undefined) => {
    setOpen(false)
    be.apply((prev) => withSpan(fromScreen(prev, id), [id], n)).then(
      () => announce(n === undefined ? t("«{name}» — avtomatik o'lcham", { name: title }) : t("«{name}» — {n}/12 kenglik", { name: title, n })),
      failed,
    )
  }
  const setHeight = (h: BlockHeight | undefined) => {
    setOpen(false)
    be.apply((prev) => withHeight(fromScreen(prev, id), [id], h)).then(
      () => announce(t('«{name}» — balandligi: {h}', { name: title, h: t(HEIGHT_LABELS[h ?? 'normal']) })),
      failed,
    )
  }

  const unitOfCell = () => {
    const el = cell.current
    const u = el ? unitOf<Element>(el, domBlocksIn) : null
    return u ? { unit: u.unit as HTMLElement, container: u.container as HTMLElement } : null
  }

  const onDown = (edge: Edge) => (e: ReactPointerEvent<HTMLElement>) => {
    const u = unitOfCell()
    if (e.button !== 0 || !u) return
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // the drag still follows the pointer while over the handle
    }
    // a card of a pair is measured against the page column it lent its cards to (layout.ts gridOf)
    const g = gridOf(u.container)
    const cs = getComputedStyle(g)
    const gap = parseFloat(cs.columnGap) || 0
    const inner = g.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
    const w = u.unit.getBoundingClientRect().width
    const n = spanFromWidth(w, inner, gap)
    const c = cell.current!
    const rect = c.getBoundingClientRect()
    // the card's own height: for a moment without a height of its own
    const minH0 = c.style.height
    const attrH0 = c.getAttribute('data-block-h')
    c.style.height = ''
    c.removeAttribute('data-block-h')
    const natural = c.getBoundingClientRect().height
    c.style.height = minH0
    if (attrH0) c.setAttribute('data-block-h', attrH0)
    // the other cards: their widths in the same grid, the heights of those in the same row
    const others: number[] = []
    const neighbours: number[] = []
    for (const other of Array.from(document.querySelectorAll<HTMLElement>('[data-block-root] [data-block-id]'))) {
      if (other === c || !other.getAttribute('data-block-id')!.startsWith(be.page + ':')) continue
      const ou = unitOf<Element>(other, domBlocksIn)
      if (ou && gridOf(ou.container as HTMLElement) === g) others.push(spanFromWidth((ou.unit as HTMLElement).getBoundingClientRect().width, inner, gap))
      const r = other.getBoundingClientRect()
      if (Math.abs(r.top - rect.top) < 8) neighbours.push(r.height)
    }
    drag.current = {
      edge, x: e.clientX, y: e.clientY, w, inner, gap, unit: u.unit, span: n, was: u.unit.getAttribute('data-block-span'),
      mode: getSizing(), spans: spanCandidates(kind, others), h: rect.height, natural, neighbours, minH0, attrH0, to: null,
    }
    // a side or corner that changes the height says the height it is on from the start (Odatiy, Ixcham, 340px)
    setLive({ span: span ?? n, h: edgeAxes(edge).y ? heightNow(height, patch?.hpx) : null })
    document.documentElement.setAttribute('data-block-dragging', '')
  }
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    const axes = edgeAxes(d.edge)
    let changed = false
    if (axes.x) {
      const raw = spanFromWidth(widthFromDrag(d.edge, d.w, e.clientX - d.x), d.inner, d.gap)
      const n = d.mode === 'auto' ? snapSpan(raw, d.spans) : raw
      if (n !== d.span || !d.unit.hasAttribute('data-block-span')) {
        d.span = n
        // shown live: the unit takes the new width at once (the save below makes it stay)
        d.unit.setAttribute('data-block-span', String(n))
        markGrid(d.unit.parentElement)
        changed = true
      }
    }
    if (axes.y) {
      const dy = (e.clientY - d.y) * axes.y
      const target = d.h + dy
      // a corner moved sideways only keeps the height it had
      const to = Math.abs(dy) < 6 ? null : d.mode === 'auto' ? autoHeight(target, d.natural, d.neighbours) : manualHeight(target, d.natural)
      if (JSON.stringify(to) !== JSON.stringify(d.to)) {
        d.to = to
        showHeight(d, to)
        changed = true
      }
    }
    if (changed) setLive({ span: d.span, h: axes.y ? (heightLabel(d.to) ?? heightNow(height, patch?.hpx)) : null })
  }
  const onUp = (commit: boolean) => {
    const d = drag.current
    drag.current = null
    setLive(null)
    document.documentElement.removeAttribute('data-block-dragging')
    if (!d) return
    const widened = d.unit.getAttribute('data-block-span') !== d.was
    const to = d.to
    if (!commit || (!widened && !to)) {
      if (d.was === null) d.unit.removeAttribute('data-block-span')
      else d.unit.setAttribute('data-block-span', d.was)
      markGrid(d.unit.parentElement)
      showHeight(d, null)
      return
    }
    be.apply((prev) => {
      const start = fromScreen(prev, id)
      const w = widened ? withSpan(start, [id], d.span) : start
      return to ? withDragHeight(w, [id], to) : w
    }).then(
      () => announce(t('«{name}» — {n}/12 kenglik, balandligi: {h}', { name: title, n: d.span, h: heightLabel(to) ?? t(HEIGHT_LABELS.normal) })),
      failed,
    )
  }
  /** the height a drag is on, drawn on the card at once (null = as it was) */
  const showHeight = (d: { minH0: string; attrH0: string | null }, to: DragHeight | null) => {
    const c = cell.current
    if (!c) return
    c.style.height = to === null ? d.minH0 : to.kind === 'px' ? `${to.px}px` : ''
    // the mark the CSS reads in place of the style attribute (blockedit.css)
    c.toggleAttribute('data-block-sized', !!c.style.height)
    const attr = to === null ? d.attrH0 : to.kind === 'compact' ? 'compact' : null
    if (attr) c.setAttribute('data-block-h', attr)
    else c.removeAttribute('data-block-h')
  }
  /** the block's height as it is before the drag */
  const heightNow = (h: BlockHeight | undefined, px: number | undefined): string => (px && !patch?.off ? `${px}px` : t(HEIGHT_LABELS[h ?? 'normal']))
  const heightLabel = (to: DragHeight | null): string | null =>
    to === null ? null : to.kind === 'px' ? `${to.px}px` : to.kind === 'compact' ? t(HEIGHT_LABELS.compact) : t(HEIGHT_LABELS.normal)

  const handlers = (edge: Edge) => ({
    onPointerDown: onDown(edge),
    onPointerMove: onMove,
    onPointerUp: () => onUp(true),
    onPointerCancel: () => onUp(false),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  })

  const spans = quickSpans(kind, auto)
  const now = sizeOf(kind, span, spans)
  return (
    <span className="block-size-tools">
      <span ref={menu} className="block-size-menu-anchor">
        <button
          type="button"
          className="block-tool"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("«{name}» — o'lcham", { name: title })}
          title={t("O'lcham")}
          onClick={(e) => {
            e.stopPropagation()
            if (!open) {
              const u = unitOfCell()
              setAuto(u ? autoSpanOf(u.container) : undefined)
              const r = e.currentTarget.getBoundingClientRect()
              const rtl = document.documentElement.dir === 'rtl'
              setFlip(rtl ? window.innerWidth - r.left < 220 : r.right < 460)
            }
            setOpen((v) => !v)
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Maximize2 aria-hidden size={14} />
        </button>
        {open && (
          <span role="menu" className={cx('block-size-menu glass-pop', flip && 'block-size-menu-flip')} onClick={(e) => e.stopPropagation()}>
            <span className="block-size-menu-head">{t("O'lcham")}</span>
            {SIZE_NAMES.map((s) => (
              <button key={s} type="button" role="menuitemradio" aria-checked={now === s} onClick={() => setSpan(spans[s])}>
                <span>{t(SIZE_LABELS[s])}</span>
                <span className="num text-ink-3">{spans[s]}/{GRID}</span>
                {now === s && <Check aria-hidden size={14} />}
              </button>
            ))}
            <button type="button" role="menuitemradio" aria-checked={span === undefined} onClick={() => setSpan(undefined)}>
              <span>{t('Avtomatik')}</span>
              {span === undefined && <Check aria-hidden size={14} />}
            </button>
            <span className="block-size-menu-head block-size-menu-sep">{t('Balandligi')}</span>
            {HEIGHTS.map((h) => (
              <button key={h ?? 'normal'} type="button" role="menuitemradio" aria-checked={height === h} onClick={() => setHeight(h)}>
                <span>{t(HEIGHT_LABELS[h ?? 'normal'])}</span>
                {height === h && <Check aria-hidden size={14} />}
              </button>
            ))}
          </span>
        )}
      </span>
      {/* the frame's sides and corners: drag any of them (the bottom-right corner also takes the arrow keys) */}
      {EDGES.filter((edge) => edge !== 'se').map((edge) => (
        <span key={edge} aria-hidden className={`block-resize-edge block-resize-${edge}`} {...handlers(edge)} />
      ))}
      <button
        type="button"
        className="block-resize-edge block-resize-se"
        aria-label={t("«{name}» — o'lchamini o'zgartirish: tortib boring yoki strelka tugmalari", { name: title })}
        title={t("O'lchamini o'zgartirish")}
        {...handlers('se')}
        onKeyDown={(e) => {
          e.stopPropagation()
          const cur = span ?? Number(unitOfCell()?.unit.getAttribute('data-block-span') ?? NaN)
          const base = Number.isFinite(cur) ? cur : SIZE_SPANS[kind].medium
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault()
            const n = Math.max(1, Math.min(GRID, base + (e.key === 'ArrowRight' ? 1 : -1)))
            if (n !== span) setSpan(n)
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const at = HEIGHTS.indexOf(height) + (e.key === 'ArrowDown' ? 1 : -1)
            if (at >= 0 && at < HEIGHTS.length) setHeight(HEIGHTS[at])
          }
        }}
      />
      {live && (
        <span className="block-size-live num" aria-hidden>
          {live.span}/{GRID}
          {live.h && ` · ${live.h}`}
        </span>
      )}
    </span>
  )
}

