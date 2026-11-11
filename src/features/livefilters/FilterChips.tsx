import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, Download, EyeOff, LoaderCircle, MoreHorizontal, Pin, Plus, RotateCcw, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { MultiSelect, customLabel } from '@/kit/filters'
import { dayKey } from '@/data/range'
import { DateRangePicker } from '@/ui/DateRangePicker'
import { DropMenu, Pop } from '@/ui/overlay'
import { Segmented } from '@/ui/glass'
import { useLiveFilters } from './ctx'
import { controlOf, isActive, optionsOf, shortDay, type FieldDef, type FilterValue } from './fields'
import { FieldPicker } from './FieldPicker'
import { fillErrorText, isRunning, missingRows } from './portal'
import type { WaitingField } from './waiting'

/** a "move left / right" entry of a chip's ⋯ menu (BarRow gives them: the bar's order is one for all its filters) */
export interface MoveItem {
  label: string
  onSelect: () => void
}

/**
 * One filter added with "+ Filtr" (DataLens-style chip "Maydon: qiymat" ▾). In edit mode it also shows when viewers
 * will not see it (no value to open with), its ⋯ menu (save the current value as the default everyone opens with, move,
 * remove) and ✕; BarRow puts it in its place in the bar with the ⠿ handle.
 */
export function AddedChip({ field, moves }: { field: string; moves: MoveItem[] }) {
  const lf = useLiveFilters()
  const { t } = useT()
  const f = lf?.byKey.get(field)
  const it = lf?.items.find((i) => i.field === field)
  if (!lf || !f || !it) return null
  const chip = <ValueChip f={f} v={lf.value(f.key)} set={(x) => lf.setValue(f.key, x)} />
  // a viewer arranging their own filters: move and remove (for them only — no default value)
  if (!lf.editing && lf.arranging) {
    return (
      <>
        {chip}
        {moves.length > 0 && (
          <DropMenu
            align="end"
            trigger={
              <button type="button" aria-label={t('Filtr sozlamalari')} className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
                <MoreHorizontal size={15} />
              </button>
            }
            items={[...moves, 'sep' as const, { label: t('Olib tashlash'), icon: X, danger: true, onSelect: () => lf.remove(f.key) }]}
          />
        )}
        <button
          type="button"
          onClick={() => lf.remove(f.key)}
          aria-label={t("«{name}» filtrini olib tashlash", { name: f.literal ? f.label : t(f.label) })}
          className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger"
        >
          <X size={15} />
        </button>
      </>
    )
  }
  if (!lf.editing) return chip
  const v = lf.value(f.key)
  const isDefault = !!it.value && JSON.stringify(it.value) === JSON.stringify(v)
  // no value to open with: a new filter (stored once it gets one) or an empty one from before — viewers see neither
  const unseen = !isActive(f.kind, it.value)
  const unseenText = lf.isDraft(f.key) ? t('Qiymat tanlang — shundan keyin saqlanadi') : t("Qiymati yo'q — ko'ruvchilarga ko'rinmaydi")
  return (
    <>
      {chip}
      {unseen && (
        <span role="img" aria-label={unseenText} title={unseenText} className="grid h-7 w-6 shrink-0 place-items-center text-ink-3">
          <EyeOff size={14} aria-hidden />
        </span>
      )}
      <DropMenu
        align="end"
        trigger={
          <button type="button" aria-label={t('Filtr sozlamalari')} className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
            <MoreHorizontal size={15} />
          </button>
        }
        items={[
          { label: t('Standart qiymat sifatida saqlash'), icon: Pin, onSelect: () => lf.saveDefault(f.key, v ?? null), checked: isDefault },
          ...(it.value ? [{ label: t('Standart qiymatni olib tashlash'), icon: X, onSelect: () => lf.saveDefault(f.key, null) }] : []),
          ...(lf.hideable ? [{ label: t('Yashirin'), icon: EyeOff, checked: false, onSelect: () => lf.setHidden(f.key, true) }] : []),
          'sep' as const,
          ...moves,
          { label: t("Filtrni o'chirish"), icon: X, danger: true, onSelect: () => lf.remove(f.key) },
        ]}
      />
      <button
        type="button"
        onClick={() => lf.remove(f.key)}
        aria-label={t("Filtrni o'chirish")}
        className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger"
      >
        <X size={15} />
      </button>
    </>
  )
}

/**
 * A hidden filter's chip ("Yashirin", only a Studio user ever gets one): 🚫👁 and its value. In edit mode its value can be
 * changed, it can be made visible to everyone again or removed; outside edit mode it only shows what narrows the data.
 */
export function HiddenChip({ field }: { field: string }) {
  const lf = useLiveFilters()
  const { t } = useT()
  const f = lf?.byKey.get(field)
  const it = lf?.hidden.find((i) => i.field === field)
  if (!lf || !f || !it) return null
  const name = f.literal ? f.label : t(f.label)
  return (
    <span data-hidden-filter={field} title={t("Yashirin filtr — mijozlar ko'rmaydi")} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-line pe-0.5">
      <EyeOff size={14} aria-label={t('Yashirin')} className="ms-2 shrink-0 text-ink-3" />
      <ValueChip f={f} v={it.value} set={lf.hideable ? (x) => lf.setHiddenValue(f.key, x) : undefined} />
      {lf.hideable && (
        <DropMenu
          align="end"
          trigger={
            <button type="button" aria-label={t('Filtr sozlamalari')} className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
              <MoreHorizontal size={15} />
            </button>
          }
          items={[
            { label: t('Yashirin'), icon: EyeOff, checked: true, onSelect: () => lf.setHidden(f.key, false) },
            'sep' as const,
            { label: t("Filtrni o'chirish"), icon: X, danger: true, onSelect: () => lf.removeHidden(f.key) },
          ]}
        />
      )}
      {lf.hideable && (
        <button
          type="button"
          onClick={() => lf.removeHidden(f.key)}
          aria-label={t("«{name}» filtrini olib tashlash", { name })}
          className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger"
        >
          <X size={15} />
        </button>
      )}
    </span>
  )
}

/**
 * "+ Filtr": opens «Filtr maydonlari» (FieldPicker — owner, 2026-11-09: "like Bitrix's own filter window"). While a field's
 * data is being read the button shows how far the read is.
 */
export function AddFilter() {
  const lf = useLiveFilters()!
  const { t } = useT()
  const running = (lf.portal?.jobs ?? []).filter(isRunning)
  const filling = running.find((j) => !j.waiting)
  return (
    <>
      <button
        type="button"
        data-add-filter
        aria-haspopup="dialog"
        onClick={() => lf.setPicker(true)}
        className="chip pressable min-h-[34px] cursor-pointer gap-1.5 border-dashed font-semibold text-primary-strong hover:bg-primary-soft"
      >
        <Plus size={15} aria-hidden /> {t('Filtr')}
        {running.length > 0 && (
          <span data-fill-progress className="num inline-flex items-center gap-1 text-[0.75rem] font-medium text-ink-3">
            <LoaderCircle size={12} className="animate-spin" aria-hidden />
            {filling ? `${Math.round(filling.progress * 100)}%` : null}
          </span>
        )}
      </button>
      <FieldPicker />
    </>
  )
}

/**
 * A field ticked in «Filtr maydonlari» whose data is still being read: its name and the read's state — waiting for the
 * running refresh, its share, reloading, or why it failed with ↻ — until the data has it and it becomes a filter; ✕ drops it.
 */
export function WaitingChip({ w }: { w: WaitingField }) {
  const lf = useLiveFilters()
  const { t } = useT()
  if (!lf) return null
  const portal = lf.portal
  const row = portal ? missingRows([w.field], [], new Set(), portal.jobs, portal.refused)[0] : undefined
  const state = row?.state ?? 'idle'
  const text =
    state === 'waiting'
      ? t('Yangilanish tugagach olinadi')
      : state === 'filling'
        ? `${Math.round((row?.progress ?? 0) * 100)}%`
        : state === 'ready'
          ? t('Yangilanmoqda')
          : state === 'failed'
            ? t(fillErrorText(row?.error))
            : t("Ma'lumoti olinmoqda")
  return (
    <span
      data-waiting-field={w.key}
      data-state={state}
      title={`${w.field.title} — ${text}`}
      className={cx('chip min-h-[34px] max-w-full gap-1.5 border-dashed pe-1', state === 'failed' ? 'text-danger' : 'text-ink-2')}
    >
      {w.hidden && <EyeOff size={13} aria-label={t('Yashirin')} className="shrink-0 text-ink-3" />}
      {state === 'failed' ? <Download size={13} className="shrink-0" aria-hidden /> : <LoaderCircle size={13} className="shrink-0 animate-spin text-ink-3" aria-hidden />}
      <span className="max-w-[160px] truncate text-ink">{w.field.title}</span>
      <span className="num max-w-[220px] truncate text-[0.75rem]">{text}</span>
      {state === 'failed' && (
        <button
          type="button"
          onClick={() => lf.retryFill(w.field)}
          aria-label={t('Qayta urinish')}
          title={t('Qayta urinish')}
          className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full text-primary-strong hover:bg-primary-soft"
        >
          <RotateCcw size={13} />
        </button>
      )}
      <button
        type="button"
        onClick={() => lf.dropWaiting(w.key)}
        aria-label={t("«{name}» filtrini olib tashlash", { name: w.field.title })}
        className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger"
      >
        <X size={13} />
      </button>
    </span>
  )
}

/**
 * one filter's control, by the field's kind (fields.ts controlOf): a list → pick its values (a person field: people),
 * a date → a range, a number → from–to, text → contains, yes / no → Ha / Yo'q. Without `set` it only shows the value.
 */
function ValueChip({ f, v, set }: { f: FieldDef; v: FilterValue | undefined; set?: (x: FilterValue | null) => void }) {
  const lf = useLiveFilters()!
  const { t, lang } = useT()
  const label = f.literal ? f.label : t(f.label)
  const control = controlOf(f.kind)
  const options = useMemo(() => (control === 'values' ? optionsOf(f, lf.raw) : []), [f, lf.raw, control])

  if (control === 'values' && set) {
    const names = f.names
    return (
      <MultiSelect
        // the Uzbek key (translated by the select, as the picker does) or the portal's own name as is
        label={f.label}
        literal={f.literal}
        options={options}
        value={{ values: v?.values ?? [], exclude: v?.exclude ?? false }}
        onChange={(m) => set(m.values.length || m.exclude ? { values: m.values, exclude: m.exclude } : null)}
        format={names ? (o) => t(names[o] ?? o) : undefined}
      />
    )
  }
  const on = isActive(f.kind, v)
  let text = t('Hammasi')
  if (on && v) {
    if (control === 'values') text = (v.exclude ? '≠ ' : '') + v.values!.map((x) => (f.names ? t(f.names[x] ?? x) : x)).join(', ')
    if (f.kind === 'date') text = v.from && v.to ? customLabel({ from: v.from, to: v.to }, lang) : v.from ? t('{d} dan', { d: shortDay(v.from) }) : t('{d} gacha', { d: shortDay(v.to!) })
    if (f.kind === 'number') text = Number.isFinite(v.min) && Number.isFinite(v.max) ? `${fmt(v.min!)} – ${fmt(v.max!)}` : Number.isFinite(v.min) ? `≥ ${fmt(v.min!)}` : `≤ ${fmt(v.max!)}`
    if (f.kind === 'text') text = `«${v.q}»`
    if (f.kind === 'bool') text = v.is ? t('Ha') : t("Yo'q")
  }
  const chip = (
    <button type="button" data-filter-chip={f.key} className={cx('chip pressable min-h-[34px] gap-1.5', set ? 'cursor-pointer hover:bg-[var(--surface-hover)]' : 'cursor-default', on && 'border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft')}>
      <span className="text-ink-3">{label}:</span>
      <span className="max-w-[170px] truncate">{text}</span>
      {set && <ChevronDown size={14} className="text-ink-3" />}
    </button>
  )
  if (!set) return chip
  // a date: the range picker (click the first day, then the last); an old one-sided value opens as far as it goes
  if (control === 'dateRange') {
    const min = dayKey(lf.raw.start)
    const max = dayKey(Date.now())
    const value = v?.from || v?.to ? { from: v.from ?? min, to: v.to ?? max } : null
    return <DateRangePicker trigger={chip} value={value} min={min} max={max} onApply={(d) => set(d ? { from: d.from, to: d.to } : null)} />
  }
  return (
    <Pop align="start" width={280} trigger={chip}>
      <div className="flex flex-col gap-2 p-1">
        {control === 'numberRange' && <NumberRange value={v} onCommit={set} />}
        {control === 'contains' && <TextQuery value={v} onCommit={set} />}
        {control === 'yesNo' && (
          <Segmented<'all' | 'yes' | 'no'>
            size="sm"
            label={label}
            value={v?.is === true ? 'yes' : v?.is === false ? 'no' : 'all'}
            onChange={(x) => set(x === 'all' ? null : { is: x === 'yes' })}
            options={[
              { value: 'all', label: t('Hammasi') },
              { value: 'yes', label: t('Ha') },
              { value: 'no', label: t("Yo'q") },
            ]}
          />
        )}
        {on && (
          <button type="button" onClick={() => set(null)} className="pressable self-start rounded-full px-2.5 py-1 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft">
            {t('Tozalash')}
          </button>
        )}
      </div>
    </Pop>
  )
}

const INPUT = 'h-9 w-full min-w-0 rounded-[12px] bg-surface-2 px-2.5 text-[0.875rem] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.35)]'
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

/** null when nothing is left set */
function clean(v: FilterValue): FilterValue | null {
  const out: FilterValue = {}
  if (v.from) out.from = v.from
  if (v.to) out.to = v.to
  if (Number.isFinite(v.min)) out.min = v.min
  if (Number.isFinite(v.max)) out.max = v.max
  return Object.keys(out).length ? out : null
}

/**
 * What is typed stays here (a draft) and goes to the page together — 300 ms after the last key, on Enter, on leaving the
 * field or closing the popover. The page's value updates in a transition, so sending every key (each one built on the
 * value before it) lost fast keys and the "Dan" typed just before "Gacha". A change from outside ("Tozalash") shows
 * when nothing is being typed.
 */
function useDraft<T>(value: T, commit: (d: T) => void) {
  const [draft, setDraft] = useState(value)
  const latest = useRef(value)
  const dirty = useRef(false)
  const timer = useRef(0)
  const send = useRef(commit)
  send.current = commit
  const outside = JSON.stringify(value)
  useEffect(() => {
    if (dirty.current) return
    latest.current = value
    setDraft(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `outside` is the value
  }, [outside])
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    send.current(latest.current)
  }, [])
  const change = useCallback(
    (d: T) => {
      latest.current = d
      dirty.current = true
      setDraft(d)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 300)
    },
    [flush],
  )
  // the popover closed with a key just typed: it still counts
  useEffect(() => flush, [flush])
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') flush()
  }
  return { draft, change, flush, onKeyDown }
}

const numText = (n?: number) => (Number.isFinite(n) ? String(n) : '')
const numOf = (s: string): number | undefined => {
  const n = s.trim() === '' ? NaN : Number(s)
  return Number.isFinite(n) ? n : undefined
}

function NumberRange({ value, onCommit }: { value?: FilterValue; onCommit: (v: FilterValue | null) => void }) {
  const { t } = useT()
  const d = useDraft({ min: numText(value?.min), max: numText(value?.max) }, (x) => onCommit(clean({ min: numOf(x.min), max: numOf(x.max) })))
  const box = (k: 'min' | 'max') => (
    <input type="number" inputMode="decimal" value={d.draft[k]} onChange={(e) => d.change({ ...d.draft, [k]: e.target.value })} onBlur={d.flush} onKeyDown={d.onKeyDown} className={cx(INPUT, 'num')} />
  )
  return (
    <Pair>
      <Labeled label={t('Dan')}>{box('min')}</Labeled>
      <Labeled label={t('Gacha')}>{box('max')}</Labeled>
    </Pair>
  )
}

function TextQuery({ value, onCommit }: { value?: FilterValue; onCommit: (v: FilterValue | null) => void }) {
  const { t } = useT()
  const d = useDraft(value?.q ?? '', (q) => onCommit(q.trim() ? { q } : null))
  return (
    <Labeled label={t('Matnda bor')}>
      <input value={d.draft} maxLength={80} placeholder={t('Qidirish')} onChange={(e) => d.change(e.target.value)} onBlur={d.flush} onKeyDown={d.onKeyDown} className={INPUT} />
    </Labeled>
  )
}

const Pair = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-2">{children}</div>
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[0.75rem] font-semibold text-ink-3">{label}</span>
      {children}
    </label>
  )
}
