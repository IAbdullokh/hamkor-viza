import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { Button } from './controls'
import {
  DAY_PRESETS,
  addDays,
  addMonths,
  clampDay,
  formatRange,
  longDay,
  monthNames,
  monthTitle,
  monthWeeks,
  parseTypedRange,
  partsOf,
  pickDay,
  presetDays,
  presetOf,
  rangeOfPicking,
  shownRange,
  typedRange,
  weekdayNames,
  ymd,
  type DayRange,
  type Picking,
} from './dateRange'

/**
 * Date range picker: quick picks on the left (Bugun … Butun davr), a two-month calendar on the right (one month and a
 * bottom sheet on a phone). Click a day = the start, the hovered days preview the range, click another = the end (an
 * earlier one swaps). Days before the data starts (`min`) or after today (`max`) are greyed. "Qo'llash" (or Enter)
 * applies, "Tozalash" clears; a power user can type "12.05.2026 – 31.05.2026". Days are 'YYYY-MM-DD', both ends in.
 *
 * Opened by its `trigger` (a button) or, controlled, next to an `anchor` (e.g. the Davr bar's "Boshqa davr…").
 */
export interface DateRangePickerProps {
  value: DayRange | null
  /** null = "Tozalash" */
  onApply: (r: DayRange | null) => void
  /** the data's first day */
  min?: string
  /** default: today */
  max?: string
  trigger?: ReactElement
  anchor?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  /** no "Tozalash" (a page period always has one) */
  required?: boolean
}

const monthOf = (day: string) => `${day.slice(0, 8)}01`

const todayKey = () => ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

function useMedia(q: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia(q)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return on
}

export function DateRangePicker({ value, onApply, min, max, trigger, anchor, open: openProp, onOpenChange, align = 'start', required }: DateRangePickerProps) {
  const { t } = useT()
  const phone = useMedia('(max-width: 639px)')
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  const setOpen = (o: boolean) => {
    if (openProp === undefined) setOwn(o)
    onOpenChange?.(o)
  }
  const apply = (r: DayRange | null) => {
    onApply(r)
    setOpen(false)
  }
  const panel = (sheet: boolean) => <RangePanel value={value} min={min} max={max ?? todayKey()} months={sheet ? 1 : 2} sheet={sheet} onApply={apply} onCancel={() => setOpen(false)} required={required} />

  if (phone) {
    const opener = trigger && isValidElement<{ onClick?: () => void }>(trigger) ? cloneElement(trigger, { onClick: () => setOpen(!open) }) : trigger
    return (
      <>
        {opener}
        {anchor}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[60] bg-[rgb(12_14_20/0.32)]" />
            <Dialog.Content className="sheet-bottom glass-pop fixed inset-x-2 bottom-2 z-[61] flex max-h-[92dvh] flex-col overflow-hidden rounded-[28px] focus:outline-none" aria-describedby={undefined}>
              <header className="flex items-center gap-3 px-4 pt-4 pb-1">
                <Dialog.Title className="min-w-0 flex-1 text-[1.0625rem] font-bold text-ink">{t('Davrni tanlang')}</Dialog.Title>
                <Dialog.Close className="pressable grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={t('Yopish')}>
                  <X size={18} />
                </Dialog.Close>
              </header>
              {panel(true)}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    )
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {trigger && <Popover.Trigger asChild>{trigger}</Popover.Trigger>}
      {anchor && <Popover.Anchor asChild>{anchor}</Popover.Anchor>}
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          aria-label={t('Davrni tanlang')}
          className="pop-in glass-pop z-[65] max-w-[calc(100vw-24px)] rounded-[22px] focus:outline-none"
        >
          {panel(false)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function RangePanel({
  value,
  min,
  max,
  months,
  sheet,
  onApply,
  onCancel,
  required,
}: {
  value: DayRange | null
  min?: string
  max: string
  months: 1 | 2
  sheet: boolean
  onApply: (r: DayRange | null) => void
  onCancel: () => void
  required?: boolean
}) {
  const { t, lang } = useT()
  const today = todayKey()
  const [pick, setPick] = useState<Picking>(() => ({ start: value?.from ?? null, end: value?.to ?? null }))
  const [hover, setHover] = useState<string | null>(null)
  // the last month shown holds the range's end (or today); with two months the one before it is on the left
  const firstMonth = (r: DayRange | null) => addMonths(monthOf(r?.to ?? max), 1 - months)
  const [view, setView] = useState(() => firstMonth(value))
  const [focus, setFocus] = useState(() => clampDay(value?.to ?? today, min, max))
  const [mode, setMode] = useState<'days' | 'months'>('days')
  const [typed, setTyped] = useState<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  const range = rangeOfPicking(pick)
  const shown = shownRange(pick, hover)
  const preset = presetOf(range, clampDay(today, undefined, max), min)
  const shownMonths = useMemo(() => Array.from({ length: months }, (_, i) => addMonths(view, i)), [view, months])
  const off = (d: string) => (!!min && d < min) || d > max

  // keyboard focus follows the focused day (after an arrow key, not on the first render)
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    grid.current?.querySelector<HTMLElement>(`[data-day="${focus}"]`)?.focus()
  }, [focus, view])

  const showDay = (d: string) => {
    const first = view
    const last = addMonths(view, months)
    if (d < first) setView(monthOf(d))
    else if (d >= last) setView(addMonths(monthOf(d), 1 - months))
  }
  const choose = (d: string) => {
    if (off(d)) return
    setPick((p) => pickDay(p, d))
    setFocus(d)
    setTyped(null)
  }
  const setRange = (r: DayRange) => {
    setPick({ start: r.from, end: r.to })
    setHover(null)
    setTyped(null)
    setFocus(r.to)
    setView(firstMonth(r))
  }
  const doApply = (r: DayRange | null = range) => {
    if (!r) return
    onApply({ from: clampDay(r.from, min, max), to: clampDay(r.to, min, max) })
  }

  const onDayKey = (e: KeyboardEvent<HTMLButtonElement>, d: string) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    let next: string | null = null
    if (e.key in step) next = addDays(d, step[e.key]!)
    else if (e.key === 'PageUp') next = addMonths(d, -1).slice(0, 8) + d.slice(8)
    else if (e.key === 'PageDown') next = addMonths(d, 1).slice(0, 8) + d.slice(8)
    else if (e.key === 'Home') next = addDays(d, -((new Date(...(partsOf(d) as [number, number, number])).getDay() + 6) % 7))
    else if (e.key === 'End') next = addDays(d, 6 - ((new Date(...(partsOf(d) as [number, number, number])).getDay() + 6) % 7))
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      return doApply()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      // Enter on the day that is already the end: apply
      if (pick.start && pick.end && (d === pick.end || d === pick.start) && !off(d) && e.key === 'Enter') return doApply()
      return choose(d)
    }
    if (!next) return
    e.preventDefault()
    // a PageUp from the 31st lands on the month's last day
    const [y, m, dd] = partsOf(next)
    if (ymd(y, m, dd) !== next) next = ymd(y, m + 1, 0)
    next = clampDay(next, min, max)
    moved.current = true
    setFocus(next)
    if (pick.start && !pick.end) setHover(next)
    showDay(next)
  }

  const typedValue = typed ?? (range ? typedRange(range) : '')
  const typedOk = typed == null || !!parseTypedRange(typed)
  const commitTyped = (applyNow: boolean) => {
    if (typed == null) return
    const r = parseTypedRange(typed)
    if (!r) return
    const c = { from: clampDay(r.from, min, max), to: clampDay(r.to, min, max) }
    setRange(c)
    if (applyNow) doApply(c)
  }

  const hint = !pick.start ? t('Boshlanish kunini tanlang') : !pick.end ? t('Tugash kunini tanlang') : null
  const label = range ? formatRange(pick.end ? range : { from: pick.start!, to: pick.start! }, lang) : ''

  const presets = (
    <div
      role="listbox"
      aria-label={t('Tez tanlash')}
      className={cx(sheet ? 'scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]' : 'flex w-[156px] shrink-0 flex-col gap-0.5 border-e border-line p-2')}
    >
      {DAY_PRESETS.map((p) => {
        const r = presetDays(p.key, clampDay(today, undefined, max), min)
        const on = preset === p.key
        return (
          <button
            key={p.key}
            type="button"
            role="option"
            aria-selected={on}
            data-preset={p.key}
            onClick={() => setRange(r)}
            onDoubleClick={() => doApply(r)}
            className={cx(
              'pressable shrink-0 rounded-[10px] text-start text-[0.875rem] whitespace-nowrap transition-colors',
              sheet ? 'chip min-h-[34px] px-3' : 'min-h-[32px] px-2.5',
              on ? 'bg-primary-soft font-semibold text-primary-strong' : 'text-ink hover:bg-surface-2',
            )}
          >
            {t(p.label)}
          </button>
        )
      })}
    </div>
  )

  const nav = (dir: -1 | 1) => (
    <button
      type="button"
      aria-label={t(mode === 'months' ? (dir < 0 ? 'Oldingi yil' : 'Keyingi yil') : dir < 0 ? 'Oldingi oy' : 'Keyingi oy')}
      onClick={() => setView((v) => addMonths(v, mode === 'months' ? dir * 12 : dir))}
      className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      {dir < 0 ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
    </button>
  )

  const [vy] = partsOf(view)
  const monthPicker = (
    <div className="grid grid-cols-3 gap-1.5 p-1 sm:grid-cols-4">
      {monthNames(lang).map((name, m) => {
        const first = ymd(vy, m, 1)
        const lastDay = ymd(vy, m + 1, 0)
        const dead = first > max || (!!min && lastDay < min)
        const cur = view === first
        return (
          <button
            key={m}
            type="button"
            disabled={dead}
            onClick={() => {
              setView(months === 2 && addMonths(first, 1) > max ? addMonths(first, -1) : first)
              setMode('days')
            }}
            className={cx('pressable min-h-[40px] rounded-[12px] text-[0.875rem] disabled:opacity-35', cur ? 'bg-primary-fill font-semibold text-white' : 'text-ink hover:bg-surface-2')}
          >
            {name}
          </button>
        )
      })}
    </div>
  )

  const calendar = (
    <div ref={grid} className={cx('flex min-w-0 flex-col gap-2', sheet ? 'px-3' : 'p-3')} onMouseLeave={() => setHover(null)}>
      <div className="flex items-center gap-1">
        {nav(-1)}
        <div className={cx('flex min-w-0 flex-1', months === 2 && mode === 'days' ? 'justify-around' : 'justify-center')}>
          {(mode === 'months' ? [view] : shownMonths).map((mk) => {
            const [y, m] = partsOf(mk)
            return (
              <button
                key={mk}
                type="button"
                aria-label={t('Oy va yilni tanlash')}
                aria-expanded={mode === 'months'}
                onClick={() => setMode((x) => (x === 'days' ? 'months' : 'days'))}
                className="pressable inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.9375rem] font-bold text-ink hover:bg-surface-2"
              >
                {mode === 'months' ? y : monthTitle(lang, y, m)}
                <ChevronDown size={14} className={cx('text-ink-3 transition-transform', mode === 'months' && 'rotate-180')} />
              </button>
            )
          })}
        </div>
        {nav(1)}
      </div>
      {mode === 'months' ? (
        monthPicker
      ) : (
        <div className={cx('flex gap-5', sheet && 'justify-center')}>
          {shownMonths.map((mk) => (
            <Month key={mk} month={mk} lang={lang} today={today} shown={shown} pick={pick} focus={focus} off={off} onPick={choose} onHover={(d) => pick.start && !pick.end && setHover(d)} onKey={onDayKey} />
          ))}
        </div>
      )}
    </div>
  )

  const footer = (
    <div className={cx('flex flex-wrap items-center gap-2 border-t border-line', sheet ? 'px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]' : 'px-3 py-2.5')}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p data-range-label className={cx('truncate text-[0.875rem]', hint && !label ? 'text-ink-3' : 'font-semibold text-ink')} aria-live="polite">
          {label || hint}
          {label && hint && <span className="ms-2 font-normal text-ink-3">· {hint}</span>}
        </p>
        <input
          value={typedValue}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={() => commitTyped(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (typed == null) doApply()
              else commitTyped(true)
            }
          }}
          placeholder="dd.mm.yyyy – dd.mm.yyyy"
          aria-label={t('Sana yoki davrni yozing')}
          aria-invalid={!typedOk}
          inputMode="numeric"
          spellCheck={false}
          className={cx(
            'num h-8 w-full max-w-[230px] rounded-[10px] bg-surface-2 px-2.5 text-[0.8125rem] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.35)]',
            !typedOk && 'ring-2 ring-[rgb(192_38_45/0.45)]',
          )}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {required ? (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t('Bekor qilish')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onApply(null)}>
            {t('Tozalash')}
          </Button>
        )}
        <Button size="sm" variant="primary" disabled={!range} onClick={() => doApply()} data-apply>
          {t("Qo'llash")}
        </Button>
      </div>
    </div>
  )

  if (sheet)
    return (
      <div className="flex min-h-0 flex-col gap-2" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName === 'DIV' && doApply()}>
        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-1">
          {presets}
          {calendar}
        </div>
        {footer}
      </div>
    )
  return (
    <div className="flex flex-col" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName === 'DIV' && doApply()}>
      <div className="flex">
        {presets}
        {calendar}
      </div>
      {footer}
    </div>
  )
}

const CELL = 38

/**
 * One day on Studio's own calendar (the range picker's month, a single day chosen): for a "from which day" choice, in place
 * of the browser's grey <input type="date"> (owner, 2026-11-07). Arrows move a month, the double arrows a year; days after
 * `max` (default today) or before `min` are greyed; the arrow keys walk the days.
 */
export function DayCalendar({ value, onChange, min, max: given }: { value: string | null; onChange: (day: string) => void; min?: string; max?: string }) {
  const { t, lang } = useT()
  const today = todayKey()
  const max = given ?? today
  const [view, setView] = useState(() => monthOf(value ?? max))
  const [focus, setFocus] = useState(() => clampDay(value ?? max, min, max))
  const box = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const off = (d: string) => (!!min && d < min) || d > max
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    box.current?.querySelector<HTMLElement>(`[data-day="${focus}"]`)?.focus()
  }, [focus, view])
  const go = (n: number) => setView((v) => addMonths(v, n))
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, d: string) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!off(d)) onChange(d)
      return
    }
    if (!(e.key in step)) return
    e.preventDefault()
    const next = clampDay(addDays(d, step[e.key]!), min, max)
    moved.current = true
    setFocus(next)
    setView(monthOf(next))
  }
  const arrow = (n: number, label: string, Icon: typeof ChevronLeft) => (
    <button type="button" aria-label={t(label)} onClick={() => go(n)} className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink">
      <Icon size={17} />
    </button>
  )
  const [y, m] = partsOf(view)
  return (
    <div ref={box} className="grid gap-1.5">
      <div className="flex items-center gap-0.5">
        {arrow(-12, 'Oldingi yil', ChevronsLeft)}
        {arrow(-1, 'Oldingi oy', ChevronLeft)}
        <span className="min-w-0 flex-1 text-center text-[0.9375rem] font-bold text-ink">{monthTitle(lang, y, m)}</span>
        {arrow(1, 'Keyingi oy', ChevronRight)}
        {arrow(12, 'Keyingi yil', ChevronsRight)}
      </div>
      <Month
        month={view}
        lang={lang}
        today={today}
        shown={value ? { from: value, to: value } : null}
        pick={{ start: value, end: value }}
        focus={focus}
        off={off}
        onPick={(d) => !off(d) && onChange(d)}
        onHover={() => {}}
        onKey={onKey}
      />
    </div>
  )
}

function Month({
  month,
  lang,
  today,
  shown,
  pick,
  focus,
  off,
  onPick,
  onHover,
  onKey,
}: {
  month: string
  lang: ReturnType<typeof useT>['lang']
  today: string
  shown: DayRange | null
  pick: Picking
  focus: string
  off: (d: string) => boolean
  onPick: (d: string) => void
  onHover: (d: string) => void
  onKey: (e: KeyboardEvent<HTMLButtonElement>, d: string) => void
}) {
  const { t } = useT()
  const [y, m] = partsOf(month)
  const weeks = useMemo(() => monthWeeks(y, m), [y, m])
  const names = useMemo(() => weekdayNames(lang), [lang])
  // the focusable day of this month: the focused one when it is here, else the first open day
  const days = weeks.flat().filter((d): d is string => !!d)
  const tabDay = days.includes(focus) ? focus : null
  return (
    <table role="grid" aria-label={monthTitle(lang, y, m)} className="border-separate border-spacing-0" style={{ width: CELL * 7 }}>
      <thead>
        <tr>
          {names.map((n, i) => (
            <th key={i} scope="col" className={cx('pb-1 text-center text-[0.6875rem] font-semibold text-ink-3', i >= 5 && 'text-ink-3/70')} style={{ width: CELL }}>
              {n}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((w, wi) => (
          <tr key={wi}>
            {w.map((d, i) => {
              if (!d) return <td key={i} role="gridcell" style={{ height: CELL }} />
              const dead = off(d)
              const inR = !!shown && d >= shown.from && d <= shown.to
              const isFrom = !!shown && d === shown.from
              const isTo = !!shown && d === shown.to
              const end = isFrom || isTo
              const settled = !!pick.end
              const isToday = d === today
              const single = isFrom && isTo
              // the band is rounded where a week row or the month breaks it
              const rowStart = i === 0 || d.endsWith('-01')
              const rowEnd = i === 6 || addDays(d, 1).endsWith('-01')
              return (
                <td key={i} role="gridcell" aria-selected={inR} aria-disabled={dead || undefined} className="relative p-0" style={{ height: CELL }}>
                  {inR && !single && (
                    <span
                      aria-hidden
                      className={cx(
                        'absolute inset-y-[3px] bg-primary-soft',
                        !settled && 'opacity-70',
                        isFrom ? 'start-1/2' : rowStart ? 'start-[3px] rounded-s-full' : 'start-0',
                        isTo ? 'end-1/2' : rowEnd ? 'end-[3px] rounded-e-full' : 'end-0',
                      )}
                    />
                  )}
                  <button
                    type="button"
                    data-day={d}
                    tabIndex={d === tabDay ? 0 : -1}
                    disabled={dead}
                    aria-label={longDay(lang, d) + (isToday ? ` (${t('Bugun')})` : '') + (dead ? ` — ${t("Ma'lumot yo'q")}` : '')}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => onPick(d)}
                    onMouseEnter={() => !dead && onHover(d)}
                    onFocus={() => !dead && onHover(d)}
                    onKeyDown={(e) => onKey(e, d)}
                    className={cx(
                      'num relative z-[1] mx-auto grid place-items-center rounded-full text-[0.875rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb)/0.55)] focus-visible:ring-offset-1',
                      dead ? 'cursor-default text-ink-3/45' : 'text-ink',
                      !dead && !end && 'hover:bg-surface-2',
                      end && !dead && 'bg-primary-fill font-semibold text-white shadow-[0_4px_12px_-4px_rgb(var(--accent-rgb)/0.6)]',
                      end && !settled && pick.start !== d && 'opacity-80',
                      isToday && !end && 'font-bold text-primary-strong',
                    )}
                    style={{ width: CELL - 4, height: CELL - 4 }}
                  >
                    {Number(d.slice(8))}
                    {isToday && <span aria-hidden className={cx('absolute bottom-[4px] h-[4px] w-[4px] rounded-full', end ? 'bg-white' : 'bg-primary-fill')} />}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
