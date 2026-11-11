import { useCallback, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { readLocal, writeLocal } from '@/lib/storage'
import { Sheet } from '@/ui/overlay'
import { ViewLookButton } from '@/features/viewlook/ViewLook'
import { MyViewTools } from '@/features/blockedit/HistoryTools'
import { useLiveFilters } from './ctx'
import { BarRow } from './BarRow'
import { isActive, shortDay, type FieldDef, type FilterValue } from './fields'
import type { BarEntry } from './slot'
import './bar.css'

/** the panel open or closed, per viewer (this browser) */
const OPEN_KEY = 'd365.filters.panel'
const PHONE = '(max-width: 639px)'

function subscribePhone(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(PHONE)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE).matches

/**
 * A dashboard page's filter section (owner, 2026-10-26: "instead of the page tabs we should have a filter section; if I
 * press it, the filters come up, and I can place the filters and hide them"): a bar with "Filtrlar (N faol)", what is
 * chosen now as chips (each with ✕) and "Tozalash"; pressing "Filtrlar" opens the panel with every filter of the page —
 * the Davr presets, the page's own selects and the ones added with "+ Filtr" — in the owner's order (BarRow: in edit mode
 * ⠿ to move, 👁 to hide from viewers, ✕ for an added one). On a phone the panel is a bottom sheet. Open / closed is
 * remembered in this browser; in edit mode the panel stays open on a computer so the filters can be arranged.
 */
export function FilterSection({ builtins, rest, ownActive, onClear }: { builtins: BarEntry[]; rest: ReactNode[]; ownActive: boolean; onClear?: () => void }) {
  const lf = useLiveFilters()
  const { t } = useT()
  const panelId = useId()
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const [open, setOpenNow] = useState(() => readLocal<boolean>(OPEN_KEY, false) === true)
  const setOpen = useCallback((v: boolean) => {
    setOpenNow(v)
    if (!isPhone()) writeLocal(OPEN_KEY, v) // a sheet closed on a phone does not close the panel on the computer
  }, [])

  const editing = !!(lf?.editing && lf.canEdit)
  const hidden = new Set(lf?.layout?.hidden ?? [])
  // what is chosen now: the built-in selects (not the ones hidden from viewers unless editing) and the added filters
  const own = builtins.filter((b) => b.summary?.clear && (editing || !hidden.has(b.key)))
  const range = builtins.find((b) => b.key === 'range' && (editing || !hidden.has(b.key)))
  // "Yaratilgan sana" is the Davr's own date (kit/filters keeps them one): with the Davr chip shown it is not a second
  // chip with the same days, nor counted twice (owner, 2026-11-03: "two identical things — that should be one")
  const added = (lf?.items ?? [])
    .map((i) => lf!.byKey.get(i.field))
    .filter((f): f is FieldDef => !!f && isActive(f.kind, lf!.value(f.key)) && !(range?.summary && f.key === 'created'))
  const count = own.length + added.length
  const clearAll = () => {
    if (ownActive && onClear) onClear()
    lf?.clear()
  }
  const shown = phone ? open : open || editing

  const panel = (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3" data-filter-panel="">
      <BarRow builtins={builtins} />
    </div>
  )

  return (
    <section aria-label={t('Filtrlar')} className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={phone ? undefined : panelId}
          onClick={() => setOpen(!shown)}
          className={cx(
            'pressable inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3.5 text-[0.875rem] font-semibold',
            shown || count ? 'border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft text-primary-strong' : 'glass border-transparent text-ink',
          )}
        >
          <SlidersHorizontal size={16} aria-hidden />
          {t('Filtrlar')}
          {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-fill px-1.5 text-[0.6875rem] font-bold text-white tabular-nums">{count}</span>}
          <span className="sr-only">{count > 0 ? t('{n} faol', { n: count }) : ''}</span>
          <ChevronDown size={15} aria-hidden className={cx('transition-transform', shown && !phone && 'rotate-180')} />
        </button>
        {range?.summary && (
          <button type="button" onClick={() => setOpen(true)} className="chip pressable min-h-[32px] gap-1.5 hover:bg-[var(--surface-hover)]">
            <span className="text-ink-3">{t('Davr')}:</span>
            {range.summary.text}
          </button>
        )}
        {own.map((b) => (
          <SummaryChip key={b.key} text={b.summary!.text} onClear={b.summary!.clear!} />
        ))}
        {added.map((f) => (
          <SummaryChip key={f.key} text={`${f.literal ? f.label : t(f.label)}: ${valueText(f, lf!.value(f.key), t)}`} onClear={() => lf!.setValue(f.key, null)} />
        ))}
        {lf?.mine && (
          <span
            data-my-filters
            title={t("Filtrlarni o'zingiz uchun o'zgartirdingiz — faqat shu brauzerda saqlanadi. «Asl holiga» — dashboard standarti")}
            className="chip min-h-[28px] gap-1 text-[0.75rem] font-semibold text-ink-2"
          >
            <UserRound size={13} aria-hidden />
            {t('Mening filtrlarim')}
          </span>
        )}
        {count > 0 && (
          <button type="button" onClick={clearAll} className="pressable rounded-full px-2.5 py-1 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft">
            {t('Tozalash')}
          </button>
        )}
        {/* `rest` (a counter, a search box) and, at the right edge, every viewer's own "Ko'rinish" (features/viewlook) */}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {rest}
          {/* outside edit mode: "Mening ko'rinishim", "Asl holiga" and ← → for this viewer's own view (blockedit) */}
          <MyViewTools />
          <ViewLookButton where="bar" />
        </div>
      </div>

      {!phone && shown && (
        <div id={panelId} className="glass mt-2.5 rounded-[22px] p-3.5 sm:p-4">
          {!editing && lf?.arranging && <p className="mb-3 text-[0.8125rem] text-ink-3">{t("Faqat siz uchun: ⠿ — joyini o'zgartiring, ✕ — olib tashlang, «+ Filtr» — qo'shing. Shu brauzerda saqlanadi")}</p>}
          {panel}
        </div>
      )}
      {phone && (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          title={t('Filtrlar')}
          subtitle={count > 0 ? t('{n} faol', { n: count }) : undefined}
          footer={
            <>
              {count > 0 && (
                <button type="button" onClick={clearAll} className="pressable me-auto rounded-full px-3 py-2 text-[0.875rem] font-medium text-primary-strong hover:bg-primary-soft">
                  {t('Tozalash')}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="pressable min-h-[40px] rounded-full bg-primary-fill px-5 text-[0.9375rem] font-semibold text-white">
                {t('Tayyor')}
              </button>
            </>
          }
        >
          <div className="px-4 py-4">{panel}</div>
        </Sheet>
      )}
    </section>
  )
}

function SummaryChip({ text, onClear }: { text: string; onClear: () => void }) {
  const { t } = useT()
  return (
    <span className="chip min-h-[32px] gap-1 border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft pe-1">
      <span className="max-w-[220px] truncate">{text}</span>
      <button type="button" onClick={onClear} aria-label={t('«{name}» filtrini olib tashlash', { name: text })} className="pressable grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
        <X size={13} aria-hidden />
      </button>
    </span>
  )
}

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

/** an added filter's value in words (as its chip says it) */
export function valueText(f: FieldDef, v: FilterValue | undefined, t: ReturnType<typeof useT>['t']): string {
  if (!v) return t('Hammasi')
  if (f.kind === 'list') {
    const vals = v.values ?? []
    const show = (o: string) => t(f.names?.[o] ?? o)
    const what = vals.length <= 2 ? vals.map(show).join(', ') : t('{n} ta tanlandi', { n: vals.length })
    return v.exclude ? `≠ ${what}` : what
  }
  if (f.kind === 'date') return v.from && v.to ? `${shortDay(v.from)} – ${shortDay(v.to)}` : v.from ? t('{d} dan', { d: shortDay(v.from) }) : t('{d} gacha', { d: shortDay(v.to ?? '') })
  if (f.kind === 'number') return Number.isFinite(v.min) && Number.isFinite(v.max) ? `${fmt(v.min!)} – ${fmt(v.max!)}` : Number.isFinite(v.min) ? `≥ ${fmt(v.min!)}` : `≤ ${fmt(v.max!)}`
  if (f.kind === 'text') return `«${v.q ?? ''}»`
  return v.is ? t('Ha') : t("Yo'q")
}
