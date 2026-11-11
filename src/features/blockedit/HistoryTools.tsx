import { useEffect, useSyncExternalStore } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw, Undo2, UserRound } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useBlockEdit } from './context'
import './myview.css'

/**
 * "← Ortga" and "Oldinga →" (owner, 2026-10-26: "like in Chrome: a button to go back and to go forward"): the page's
 * history of changes (history.ts) for the layer in view — the defaults for everyone in edit mode, this viewer's own view
 * outside it. Each arrow's tooltip names the step. Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z do the same (useHistoryKeys).
 */
export function HistoryArrows({ className }: { className?: string }) {
  const { t } = useT()
  const be = useBlockEdit()
  if (!be) return null
  const h = be.history
  const back = h.undoLabel ? t('Ortga: {step}', { step: h.undoLabel }) : t("Ortga — hali o'zgarish yo'q")
  const fwd = h.redoLabel ? t('Oldinga: {step}', { step: h.redoLabel }) : t("Oldinga — qaytariladigan qadam yo'q")
  return (
    <span role="group" aria-label={t("O'zgarishlar tarixi")} className={cx('inline-flex items-center gap-0.5 rounded-full bg-surface-2/80 p-0.5', className)} data-history="">
      <button
        type="button"
        onClick={h.undo}
        disabled={!h.undoLabel}
        title={back}
        aria-label={back}
        data-history-undo=""
        className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-[var(--surface-hover)] hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ArrowLeft aria-hidden size={16} />
      </button>
      <button
        type="button"
        onClick={h.redo}
        disabled={!h.redoLabel}
        title={fwd}
        aria-label={fwd}
        data-history-redo=""
        className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-[var(--surface-hover)] hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ArrowRight aria-hidden size={16} />
      </button>
    </span>
  )
}

/**
 * Outside edit mode, next to "Ko'rinish" / "Filtrlar": "Mening ko'rinishim" when this viewer changed the page for
 * themselves (kept in this browser only, personal.ts), "Asl holiga" back to the dashboard's defaults, and the arrows.
 * Nothing when there is nothing of theirs and nothing to undo.
 */
export function MyViewTools({ where = 'bar' }: { where?: 'bar' | 'header' }) {
  const { t } = useT()
  const be = useBlockEdit()
  // the page header's copy steps aside while the page has a filter section (it shows them there)
  const bars = useSyncExternalStore(subscribeBars, getBars, () => 0)
  useEffect(() => {
    if (where !== 'bar') return
    setBars(1)
    return () => setBars(-1)
  }, [where])
  if (!be || be.editing || (where === 'header' && bars > 0)) return null
  const h = be.history
  if (!be.mine && !h.undoLabel && !h.redoLabel) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" data-my-view="">
      <HistoryArrows />
      {be.mine && (
        <>
          <span
            title={t("Ko'rinishni o'zingiz uchun o'zgartirdingiz — faqat shu brauzerda saqlanadi. «Asl holiga» — dashboard standarti")}
            className="chip min-h-[28px] gap-1 text-[0.75rem] font-semibold text-ink-2"
            data-my-view-badge=""
          >
            <UserRound size={13} aria-hidden />
            {t("Mening ko'rinishim")}
          </span>
          <button
            type="button"
            onClick={be.resetMine}
            data-my-view-reset=""
            className="pressable inline-flex min-h-[28px] items-center gap-1 rounded-full px-2.5 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft"
          >
            <RotateCcw size={13} aria-hidden />
            {t('Asl holiga')}
          </button>
        </>
      )}
    </span>
  )
}

let barCount = 0
const barListeners = new Set<() => void>()
const subscribeBars = (l: () => void) => {
  barListeners.add(l)
  return () => {
    barListeners.delete(l)
  }
}
const getBars = () => barCount
function setBars(d: number) {
  barCount += d
  for (const l of barListeners) l()
}

/** a block's "↶ Bekor qilish": the last change of this block (of the layer in view) is taken back */
export function BlockUndo({ id }: { id: string }) {
  const { t } = useT()
  const be = useBlockEdit()
  const label = be?.history.blockLabel(id)
  if (!be || !label) return null
  const tip = t('Bekor qilish: {step}', { step: label })
  return (
    <button
      type="button"
      className="block-tool block-tool-undo"
      title={tip}
      aria-label={tip}
      data-block-undo=""
      onClick={(e) => {
        e.stopPropagation()
        be.history.undoBlock(id)
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Undo2 aria-hidden size={15} />
    </button>
  )
}
