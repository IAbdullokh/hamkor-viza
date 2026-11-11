import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useDb } from '@/data/db'
import { dayKey, parseDay, rangeOf, useNow, type DateRange, type RangeKey } from '@/data/range'
import { Segmented } from '@/ui/glass'
import { Pop } from '@/ui/overlay'
import { Switch } from '@/ui/controls'
import { markDashBusy } from '@/features/blockedit/busy'
import { useBlockEdit } from '@/features/blockedit/context'
import { memoryKey, readMemory, writeMemory } from './filterMemory'
import { useExtraFilters, type BarEntry } from '@/features/livefilters/slot'
import { barKeyOf, RANGE_KEY } from '@/features/livefilters/bar'
import { usePublishPageScope } from '@/features/addchart/pageScope'
import { DateRangePicker } from '@/ui/DateRangePicker'
import { addDays, formatRange, type DayRange } from '@/ui/dateRange'

/**
 * Standard filter bar of every default-dashboard page (from the inventory):
 * Davr presets (Bugun / 7 kun / 30 kun / 90 kun / Butun davr) + multi-selects with "Istisno" (everything-except) mode.
 */
export interface Multi {
  values: string[]
  exclude: boolean
}

export const EMPTY: Multi = { values: [], exclude: false }

export function matchMulti(v: string | null | undefined, m: Multi): boolean {
  if (!m.values.length) return true
  const hit = v != null && m.values.includes(v)
  return m.exclude ? !hit : hit
}

export const PRESETS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Bugun' },
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: '90d', label: '90 kun' },
  { value: 'all', label: 'Butun davr' },
]

/** the Davr bar's choice: a preset, or the days picked with "Boshqa davr…" (both ends in) */
export type Preset = RangeKey | DayRange

/** a picked period as a page range; it ends at "now" at most, like the presets */
export function customRange(d: DayRange, now = Date.now()): DateRange {
  const from = parseDay(d.from)
  return { key: 'custom', from, to: Math.max(from + 1, Math.min(parseDay(addDays(d.to, 1)), now)) }
}

/** the days a page range covers (the picker opens on them) */
export function daysOfRange(r: DateRange): DayRange {
  return { from: dayKey(r.from), to: dayKey(Math.max(r.from, r.to - 1)) }
}

/** "12-may – 31-may" (the year too when it is not this year) */
export function customLabel(d: DayRange, lang: Parameters<typeof formatRange>[1], now = Date.now()): string {
  const y = String(new Date(now).getFullYear())
  return formatRange(d, lang, !(d.from.startsWith(y) && d.to.startsWith(y)))
}

/** the Davr bar's own option for the picked days ("Boshqa davr…") */
const CUSTOM = 'custom' as const

/**
 * Page filter state: a date preset + any number of named multi-selects. On a dashboard the viewer's last choice is kept
 * in this browser per dashboard page and comes back after a reload (filterMemory.ts); «Tozalash» clears it there too.
 */
export function usePageFilters<K extends string>(keys: readonly K[], initial: Preset = '30d') {
  const now = useNow()
  const { start } = useDb()
  const be = useBlockEdit()
  const memKey = be ? memoryKey(be.scope.kind === 'live' ? `live:${be.scope.slug}` : `demo:${be.scope.id}`, be.page) : null
  const [remembered] = useState(() => (memKey ? readMemory(memKey, keys) : null))
  const [preset, setPresetNow] = useState<Preset>(remembered?.preset ?? initial)
  const [multi, setMultiNow] = useState<Record<K, Multi>>(() => Object.fromEntries(keys.map((k) => [k, remembered?.multi[k] ?? EMPTY])) as Record<K, Multi>)
  // stored once the viewer changes something (an untouched page keeps following the page's own default)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (memKey) writeMemory(memKey, { preset, multi })
  }, [memKey, preset, multi])
  // a change is shown as "updating" (old numbers softly blurred, then the new ones) and computed as a transition
  const [, startTransition] = useTransition()
  const setPreset = (r: Preset) => {
    markDashBusy()
    startTransition(() => setPresetNow(r))
  }
  const setMulti = (f: (x: Record<K, Multi>) => Record<K, Multi>) => {
    markDashBusy()
    startTransition(() => setMultiNow(f))
  }
  const range: DateRange = useMemo(() => (typeof preset === 'string' ? rangeOf(preset, now, start) : customRange(preset, now)), [preset, now, start])
  // charts added with "Grafik qo'shish" follow the same period and choices
  usePublishPageScope(typeof preset === 'string' ? preset : CUSTOM, range, multi)
  return {
    preset,
    setPreset,
    range,
    now,
    multi,
    set: (k: K, m: Multi) => setMulti((x) => ({ ...x, [k]: m })),
    clear: () => setMulti(() => Object.fromEntries(keys.map((k) => [k, EMPTY])) as Record<K, Multi>),
    active: Object.values<Multi>(multi).some((m) => m.values.length > 0),
  }
}

export function FilterBar({
  preset,
  onPreset,
  children,
  onClear,
  active,
  period,
}: {
  preset: Preset
  onPreset: (r: Preset) => void
  children?: React.ReactNode
  onClear?: () => void
  active?: boolean
  /** a page whose period is not a range (Hisobot's month grid) draws its own control in the Davr place */
  period?: { label: string; node: ReactNode; summary: string }
}) {
  const { t, lang } = useT()
  const { start } = useDb()
  const [picking, setPicking] = useState(false)
  const custom = typeof preset === 'string' ? null : preset
  // the filters added on this dashboard ("+ Filtr") follow the page's own; "Tozalash" clears both
  const extra = useExtraFilters()
  const own = !!(active && onClear)
  // "Yaratilgan sana" is the date Davr filters by: a range picked there becomes the Davr ("Boshqa davr"), and another
  // Davr picked here clears it — never "30 kun" lit next to a different range (a page with its own period keeps both)
  const created = period ? undefined : extra?.created
  const createdKey = created ? `${created.from ?? ''}~${created.to ?? ''}` : ''
  useEffect(() => {
    if (!created) return
    const from = created.from ?? dayKey(start)
    const to = created.to ?? dayKey(Date.now())
    if (custom && custom.from === from && custom.to === to) return
    onPreset({ from, to })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createdKey is the range
  }, [createdKey])
  const pickPreset = (p: Preset) => {
    onPreset(p)
    if (created && extra?.setCreated && (typeof p === 'string' || p.from !== created.from || p.to !== created.to)) extra.setCreated(null)
  }
  // "Boshqa davr…" after "Butun davr" opens the date range picker; the chosen days then stand in its place
  const davr = period ? (
    period.node
  ) : (
    <DateRangePicker
      open={picking}
      onOpenChange={setPicking}
      required
      value={custom ?? daysOfRange(rangeOf(preset as RangeKey, Date.now(), start))}
      min={dayKey(start)}
      onApply={(d) => d && pickPreset(d)}
      anchor={
        <span className="inline-flex max-w-full min-w-0" data-davr>
          <Segmented<RangeKey | typeof CUSTOM>
            size="sm"
            label={t('Davr')}
            value={custom ? CUSTOM : (preset as RangeKey)}
            onChange={(v) => (v === CUSTOM ? setPicking(true) : pickPreset(v))}
            options={[...PRESETS.map((p) => ({ value: p.value, label: t(p.label) })), { value: CUSTOM, label: custom ? customLabel(custom, lang) : t('Boshqa davr…') }]}
          />
        </span>
      }
    />
  )
  const clear = (own || extra?.active) && (
    <button
      type="button"
      onClick={() => {
        if (own) onClear!()
        extra?.clear()
      }}
      className="pressable rounded-full px-2.5 py-1 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft"
    >
      {t('Tozalash')}
    </button>
  )
  if (!extra?.Row)
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {davr}
        {children}
        {extra && <extra.Chips />}
        {clear}
      </div>
    )
  // on a dashboard the owner arranges the row (features/livefilters/BarRow): the Davr presets and the page's own selects
  // are keyed (bar.ts barKeyOf) and drawn in the saved order with the added filters; the rest (a counter, a search box,
  // a tab switch) stays after them as before
  const { keyed, rest } = splitBarChildren(children, t)
  const davrText = period ? period.summary : custom ? customLabel(custom, lang) : t(PRESETS.find((p) => p.value === preset)?.label ?? 'Davr')
  const builtins: BarEntry[] = [{ key: RANGE_KEY, label: period?.label ?? 'Davr', node: davr, summary: { text: davrText } }, ...keyed]
  // the filter section: a "Filtrlar" bar with the chosen values; the filters themselves in the panel it opens
  if (extra.Section) return <extra.Section builtins={builtins} rest={rest} ownActive={own} onClear={onClear} />
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <extra.Row builtins={builtins} />
      {clear}
      {rest}
    </div>
  )
}

/** the bar's own selects (kit MultiSelect) with their keys, and the other children in their order */
function splitBarChildren(children: ReactNode, t: TFn): { keyed: BarEntry[]; rest: ReactNode[] } {
  const keyed: BarEntry[] = []
  const rest: ReactNode[] = []
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (isValidElement<Partial<MultiProps>>(node) && node.type === MultiSelect && typeof node.props.label === 'string') {
      const key = barKeyOf(node.props.label, typeof node.key === 'string' ? node.key : null)
      if (key && key !== RANGE_KEY && !keyed.some((k) => k.key === key)) {
        keyed.push({ key, label: node.props.label, node, summary: multiSummary(node.props as MultiProps, t) })
        return
      }
    }
    if (node != null && typeof node !== 'boolean') rest.push(isValidElement(node) && node.key == null ? cloneElement(node, { key: `rest-${rest.length}` }) : node)
  }
  walk(children)
  return { keyed, rest }
}

type TFn = ReturnType<typeof useT>['t']

interface MultiProps {
  label: string
  options: string[]
  value: Multi
  onChange: (m: Multi) => void
  format?: (o: string) => string
  literal?: boolean
}

/** a select's choice for the filter section's summary ("Mas'ul: Ali, Vali" / "Manba ≠ 3 ta"); none when nothing is chosen */
function multiSummary(p: MultiProps, t: TFn): BarEntry['summary'] {
  const vals = p.value?.values ?? []
  if (!vals.length) return undefined
  const show = p.format ?? ((o: string) => t(o))
  const name = p.literal ? p.label : t(p.label)
  const what = vals.length <= 2 ? vals.map(show).join(', ') : t('{n} ta tanlandi', { n: vals.length })
  return { text: `${name}${p.value.exclude ? ' ≠' : ':'} ${what}`, clear: () => p.onChange(EMPTY) }
}

/** `label` is an Uzbek key (translated here); `literal` shows it as is — a portal's own field name, or a label already translated */
export function MultiSelect({ label, options, value, onChange, format, literal }: MultiProps) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const chosen = new Set(value.values)
  const shown = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  const toggle = (o: string) => {
    const next = new Set(chosen)
    if (next.has(o)) next.delete(o)
    else next.add(o)
    onChange({ ...value, values: options.filter((x) => next.has(x)) })
  }
  const show = format ?? ((o: string) => t(o))
  const text = !chosen.size ? t('Hammasi') : chosen.size === 1 ? show([...chosen][0]!) : t('{n} ta tanlandi', { n: chosen.size })
  return (
    <Pop
      align="start"
      width={280}
      trigger={
        <button type="button" className={cx('chip pressable min-h-[34px] cursor-pointer gap-1.5 hover:bg-[var(--surface-hover)]', chosen.size > 0 && 'border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft')}>
          <span className="text-ink-3">
            {literal ? label : t(label)}
            {value.exclude && chosen.size ? ' ≠' : ':'}
          </span>
          <span className="max-w-[150px] truncate">{text}</span>
          <ChevronDown size={14} className="text-ink-3" />
        </button>
      }
    >
      <div className="flex items-center gap-2 rounded-[12px] bg-surface-2 px-2.5">
        <Search size={14} className="text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Qidirish')} className="h-9 w-full bg-transparent text-[0.875rem] text-ink outline-none placeholder:text-ink-3" />
      </div>
      <div className="scroll-thin mt-1.5 max-h-[260px] overflow-y-auto">
        {shown.map((o) => {
          const on = chosen.has(o)
          return (
            <button key={o} type="button" onClick={() => toggle(o)} className="flex min-h-[34px] w-full items-center gap-2.5 rounded-[10px] px-2 text-start text-[0.875rem] text-ink hover:bg-surface-2">
              <span className={cx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors', on ? 'border-transparent bg-primary-fill text-white' : 'border-line-strong')}>
                {on && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="truncate">{show(o)}</span>
            </button>
          )
        })}
        {!shown.length && <p className="px-2 py-3 text-[0.8125rem] text-ink-3">{t('Hech narsa topilmadi')}</p>}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-line px-1.5 pt-2">
        <span className="text-[0.8125rem] text-ink-2">{t('Istisno (tanlanganlardan tashqari)')}</span>
        <Switch checked={value.exclude} label={t('Istisno')} onChange={(x) => onChange({ ...value, exclude: x })} />
      </div>
    </Pop>
  )
}
