import { Fragment, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Check, GripVertical, MoreHorizontal, Plus, RotateCcw, Settings2, X } from 'lucide-react'
import { useT } from '@/i18n'
import { DropMenu, useToast } from '@/ui/overlay'
import { announce } from '@/features/blockedit/announce'
import { useLiveFilters } from './ctx'
import { arrange, barKeys, canHide, dropKey, moveKey, withHiddenKey } from './bar'
import { AddedChip, AddFilter, HiddenChip, WaitingChip, type MoveItem } from './FilterChips'
import type { BarEntry } from './slot'
import './bar.css'

const NONE: BarEntry[] = []

/** the added filters alone, for a page that draws its own filter row (Hisobot, Reja — FilterScope) */
export function AddedRow() {
  return <BarRow builtins={NONE} />
}

/**
 * A page's filter row in the owner's order (owner, 2026-10-26: "I can't change the place of the filters"): the bar's own
 * filters (the Davr presets as one unit, "Mas'ul", "Bosqich", "Manba" …) and the ones added with "+ Filtr" share one
 * order (bar.ts arrange). In edit mode each has a ⠿ handle (mouse, touch, or the arrow keys on it) and a ⋯ menu: move
 * left / right, and for a built-in one "Ko'rsatmaslik" — viewers no longer see it (it is never deleted; the page's own
 * numbers do not depend on it being shown). "Tartibni tiklash" brings the page's own order back. Outside edit mode the
 * filters are drawn as before (each in a `display: contents` wrapper), the hidden ones left out — and every viewer has
 * "+ Filtr" and "Sozlash" (owner, 2026-10-26: "every person should be able to change the filters they need"): with it on,
 * the same ⠿ / ⋯ / ✕ act on their own filters, kept in their browser (FilterScope, personal.ts); "Asl holiga" goes back
 * to the dashboard's defaults.
 */
export function BarRow({ builtins }: { builtins: BarEntry[] }) {
  const lf = useLiveFilters()
  const { t } = useT()
  const toast = useToast()
  const refocus = useRef<string | null>(null)
  const drag = useRef<Drag | null>(null)

  // a keyboard move re-inserts the item in the DOM, which drops the focus: give it back to its handle
  useLayoutEffect(() => {
    const k = refocus.current
    if (!k) return
    refocus.current = null
    document.querySelector<HTMLElement>(`[data-bar-handle="${CSS.escape(k)}"]`)?.focus()
  })

  if (!lf) return builtins.map((b) => <Fragment key={b.key}>{b.node}</Fragment>)

  const own = new Map(builtins.map((b) => [b.key, b]))
  const added = lf.items.map((i) => i.field).filter((k) => !own.has(k))
  const keys = arrange(barKeys(builtins.map((b) => b.key), added), lf.layout?.order)
  const hidden = new Set((lf.layout?.hidden ?? []).filter((k) => own.has(k)))
  const editing = lf.editing && lf.canEdit
  // edit mode (everyone's defaults) or this viewer arranging their own filters
  const framed = editing || (lf.arranging && !lf.editing)
  // a removed built-in filter is gone from the bar for everyone; in edit mode it waits in «Olib tashlanganlar» to come back
  const shown = keys.filter((k) => !hidden.has(k))
  const arranged = !!(lf.layout?.order?.length || lf.layout?.hidden?.length)

  const nameOf = (k: string) => {
    const b = own.get(k)
    if (b) return t(b.label)
    const f = lf.byKey.get(k)
    return f ? (f.literal ? f.label : t(f.label)) : k
  }

  /** stores the new order; says where the filter went */
  const commit = (next: string[] | null, key: string) => {
    if (!next) return
    void lf.setLayout({ ...lf.layout, order: next }).then((ok) => {
      if (ok) announce(t("«{name}» {n}-o'ringa ko'chirildi ({total} tadan)", { name: nameOf(key), n: next.indexOf(key) + 1, total: next.length }))
    })
  }
  const setHidden = (key: string, hide: boolean) => {
    if (!lf.editing) {
      // this viewer's own bar: a removed filter of the page stops narrowing the page too
      if (hide) {
        own.get(key)?.summary?.clear?.()
        lf.remove(key)
      } else lf.restore(key)
      toast(hide ? t("«{name}» filtri olib tashlandi", { name: nameOf(key) }) : t("«{name}» filtri qaytarildi", { name: nameOf(key) }), 'ok')
      return
    }
    void lf.setLayout(withHiddenKey(lf.layout, key, hide)).then((ok) => {
      if (ok) toast(hide ? t("«{name}» filtri olib tashlandi", { name: nameOf(key) }) : t("«{name}» filtri qaytarildi", { name: nameOf(key) }), 'ok')
    })
  }
  const reset = () => {
    void lf.setLayout(null).then((ok) => ok && toast(t('Filtrlar asl tartibiga qaytdi'), 'ok'))
  }

  const movesOf = (i: number, key: string): MoveItem[] => [
    ...(i > 0 ? [{ label: t('Chapga surish'), onSelect: () => commit(moveKey(keys, i, i - 1), key) }] : []),
    ...(i < keys.length - 1 ? [{ label: t("O'ngga surish"), onSelect: () => commit(moveKey(keys, i, i + 1), key) }] : []),
  ]

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const rtl = document.documentElement.dir === 'rtl'
    const back = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')
    const fwd = e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
    if (e.key === 'Escape' && drag.current) {
      e.preventDefault()
      end(false)
      return
    }
    if (!back && !fwd && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const from = keys.indexOf(key)
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : from + (back ? -1 : 1)
    const next = moveKey(keys, from, to)
    if (!next) return
    refocus.current = key
    commit(next, key)
  }

  // ---- dragging with the ⠿ (mouse, pen, a finger): the item follows the pointer, a bar shows where it lands
  const clearDrop = (d: Drag) => {
    if (d.over) delete d.over.dataset.drop
    d.over = null
  }
  const end = (ok: boolean) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    d.item.style.translate = ''
    delete d.item.dataset.dragging
    document.documentElement.removeAttribute('data-block-dragging')
    const over = d.over
    const after = d.after
    clearDrop(d)
    if (ok && over?.dataset.barKey) commit(dropKey(keys, d.key, over.dataset.barKey, after), d.key)
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    const item = e.currentTarget.closest<HTMLElement>('[data-bar-key]')
    if (e.button !== 0 || !item?.parentElement) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // the browser no longer tracks this pointer: the drag still follows it while over the handle
    }
    drag.current = { key, item, row: item.parentElement, x: e.clientX, y: e.clientY, pointer: e.pointerId, over: null, after: false }
    item.dataset.dragging = ''
    document.documentElement.setAttribute('data-block-dragging', '')
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointer) return
    d.item.style.translate = `${e.clientX - d.x}px ${e.clientY - d.y}px`
    let over: HTMLElement | null = null
    for (const hit of document.elementsFromPoint(e.clientX, e.clientY)) {
      const el = (hit as Element).closest<HTMLElement>('[data-bar-key]')
      if (el && el !== d.item && el.parentElement === d.row) {
        over = el
        break
      }
    }
    if (over !== d.over) clearDrop(d)
    if (!over) return
    const r = over.getBoundingClientRect()
    let after = e.clientX > r.left + r.width / 2
    if (document.documentElement.dir === 'rtl') after = !after
    d.over = over
    d.after = after
    over.dataset.drop = after ? 'after' : 'before'
  }

  /** one filter in edit mode: ⠿, the filter, 👁 when viewers do not see it, and the ⋯ of a built-in one (an added chip has its own) */
  const frame = (key: string, i: number, body: ReactNode, builtin: boolean) => {
    const off = hidden.has(key)
    const name = nameOf(key)
    return (
      <span key={key} data-bar-key={key} data-bar-hidden={off || undefined} className="bar-item">
        {keys.length > 1 && (
          <button
            type="button"
            data-bar-handle={key}
            className="bar-grip"
            aria-label={t("«{name}» — joyini o'zgartirish: tortib boring yoki strelka tugmalari", { name })}
            title={t("Joyini o'zgartirish")}
            onPointerDown={(e) => onPointerDown(e, key)}
            onPointerMove={onPointerMove}
            onPointerUp={() => end(true)}
            onPointerCancel={() => end(false)}
            onLostPointerCapture={() => drag.current && end(true)}
            onKeyDown={(e) => onKey(e, key)}
          >
            <GripVertical aria-hidden size={14} />
          </button>
        )}
        <span className="bar-node">{body}</span>
        {builtin && canHide(key) && (
          <button
            type="button"
            onClick={() => setHidden(key, true)}
            aria-label={t("«{name}» filtrini olib tashlash", { name })}
            title={t('Olib tashlash')}
            className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={14} aria-hidden />
          </button>
        )}
        {builtin && (
          <DropMenu
            align="end"
            trigger={
              <button type="button" aria-label={t('Filtr sozlamalari')} className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
                <MoreHorizontal size={15} />
              </button>
            }
            items={[
              ...(canHide(key) ? [{ label: t('Olib tashlash'), icon: X, onSelect: () => setHidden(key, true) }] : []),
              ...(canHide(key) && keys.length > 1 ? ['sep' as const] : []),
              ...movesOf(i, key),
            ]}
          />
        )}
      </span>
    )
  }

  return (
    <>
      {shown.map((k) => {
        const i = keys.indexOf(k)
        const b = own.get(k)
        if (!framed) {
          return (
            <span key={k} data-bar-key={k} className="contents">
              {b ? b.node : <AddedChip field={k} moves={NONE_MOVES} />}
            </span>
          )
        }
        // an added chip brings its own ⋯ (default value, move, remove) and ✕
        return b ? frame(k, i, b.node, true) : frame(k, i, <AddedChip field={k} moves={movesOf(i, k)} />, false)
      })}
      {/* the dashboard's hidden filters: only a Studio user has any (the server gives them to no one else) */}
      {lf.hidden.map((i) => (
        <HiddenChip key={'hidden:' + i.field} field={i.field} />
      ))}
      {/* fields ticked in «Filtr maydonlari» whose data is still being read (this browser's) */}
      {lf.waiting.filter((w) => !lf.byKey.has(w.key)).map((w) => (
        <WaitingChip key={'wait:' + w.key} w={w} />
      ))}
      <AddFilter />
      {(editing ? [...hidden] : lf.arranging ? lf.removedByMe.filter((k) => own.has(k) || lf.byKey.has(k)) : []).map((k) => (
          <button
            key={'back:' + k}
            type="button"
            onClick={() => (editing || own.has(k) ? setHidden(k, false) : lf.restore(k))}
            title={t('Qaytarish')}
            className="pressable inline-flex min-h-[30px] items-center gap-1 rounded-full border border-dashed border-line px-2.5 text-[0.8125rem] text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <Plus size={13} aria-hidden />
            {nameOf(k)}
          </button>
      ))}
      {!lf.editing && (
        <button
          type="button"
          data-my-filters-toggle
          aria-pressed={lf.arranging}
          onClick={() => lf.setArranging(!lf.arranging)}
          title={t("Filtrlarni o'zingiz uchun qo'shing, olib tashlang, joyini o'zgartiring — faqat shu brauzerda saqlanadi")}
          className="pressable inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {lf.arranging ? <Check size={14} aria-hidden /> : <Settings2 size={14} aria-hidden />}
          {lf.arranging ? t('Tayyor') : t('Sozlash')}
        </button>
      )}
      {!lf.editing && lf.mine && (
        <button type="button" data-my-filters-reset onClick={lf.resetMine} className="pressable inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft">
          <RotateCcw size={14} aria-hidden />
          {t('Asl holiga')}
        </button>
      )}
      {editing && arranged && (
        <button type="button" onClick={reset} className="pressable inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          <RotateCcw size={14} aria-hidden />
          {t('Tartibni tiklash')}
        </button>
      )}
    </>
  )
}

const NONE_MOVES: MoveItem[] = []

interface Drag {
  key: string
  item: HTMLElement
  row: HTMLElement
  x: number
  y: number
  pointer: number
  over: HTMLElement | null
  after: boolean
}
