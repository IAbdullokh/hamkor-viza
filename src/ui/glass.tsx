import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Check, CircleHelp, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { EditableBlock } from '@/features/blockedit/EditableBlock'
import { tileClass, type HexColor } from '@/features/blockedit/tint'
import type { Accent } from '@/lib/settings'
import { useT, useUzbek } from '@/i18n'
import { Sparkline } from './Sparkline'
import { useDesign } from '@/lib/design'
import { DS } from '@/ds/registry'
import { SourceMark, useBlockSources } from '@/kit/SourceMark'
import type { TableName } from '@/features/livefilters/fields'

/** Liquid Glass building blocks shared by every screen (ported from WordGarden / Applekor). */

export type TileColor =
  | 'blue'
  | 'orange'
  | 'green'
  | 'indigo'
  | 'purple'
  | 'teal'
  | 'mint'
  | 'pink'
  | 'yellow'
  | 'gray'
  | 'red'
  | 'cyan'
  | 'accent'

/** a tile colour, or a block's custom one as "#rrggbb" (features/blockedit/tint: its `.tile-x…` class) */
export type TileTint = TileColor | HexColor

/** Rounded-square coloured icon chip, like an app icon. */
export function IconTile({ icon: Icon, color, size = 'md', className }: { icon: LucideIcon; color: TileTint; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const dims = { xs: 'h-6 w-6 rounded-[7px]', sm: 'h-7 w-7 rounded-[9px]', md: 'h-9 w-9 rounded-[11px]', lg: 'h-12 w-12 rounded-[15px]', xl: 'h-16 w-16 rounded-[20px]' }[size]
  const icon = { xs: 13, sm: 15, md: 18, lg: 24, xl: 32 }[size]
  return (
    <span aria-hidden className={cx('icon-tile tile-wiggle', tileClass(color), dims, className)}>
      <Icon size={icon} strokeWidth={2.3} />
    </span>
  )
}

/**
 * Rolling digits (iPhone-counter style). The first time every digit rolls into place; after that only the digits that
 * changed tick over, from their old value (owner, 2026-10-24: a ticking countdown re-rolled every digit from zero each second).
 */
export function Odometer({ value, format }: { value: number; format?: (n: number) => string }) {
  const text = format ? format(value) : String(value)
  const shown = useRef<string | null>(null)
  const ticks = useRef(0)
  const prev = shown.current
  if (prev !== null && prev !== text) ticks.current++
  useEffect(() => {
    shown.current = text
  }, [text])
  let digitIndex = 0
  return (
    <span className="inline-block whitespace-nowrap tabular-nums" aria-label={text} role="img">
      <span aria-hidden>
        {[...text].map((ch, i) => {
          if (!/[0-9]/.test(ch)) return <span key={`c${text.length - i}`}>{ch}</span>
          // digits are matched from the right, so 10:00 → 9:59 compares minutes with minutes
          const from = i - text.length + (prev?.length ?? 0)
          const old = prev === null ? null : (prev[from] ?? '')
          if (prev === null) {
            const style = { '--d': Number(ch), '--i': digitIndex++ } as React.CSSProperties
            return (
              <span key={`r${text.length - i}`} className="odo-d" style={style}>
                {ch}
              </span>
            )
          }
          if (old === ch) return <span key={`s${text.length - i}`}>{ch}</span>
          return (
            <span key={`t${text.length - i}-${ticks.current}`} className="odo-t">
              {ch}
            </span>
          )
        })}
      </span>
    </span>
  )
}

/** Small (?) button with an explanation bubble, portaled so card clipping never cuts it. */
export function InfoTip({ text, label }: { text: ReactNode; label?: string }) {
  const { t } = useT()
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const open = pos !== null
  const WIDTH = 264

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.min(Math.max(12, r.right - WIDTH), window.innerWidth - WIDTH - 12)
    const above = r.bottom > window.innerHeight - 180
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onDoc = (e: Event) => {
      const target = e.target as Node
      if (btn.current?.contains(target) || bubble.current?.contains(target)) return
      close()
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        btn.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label ?? t("Batafsil")}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (open) setPos(null)
          else place()
        }}
        className="pressable inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <CircleHelp aria-hidden size={15} />
      </button>
      {pos &&
        createPortal(
          <span
            ref={bubble}
            id={id}
            role="note"
            className="glass-pop fade-in fixed z-[70] rounded-[18px] px-3.5 py-3 text-start text-[0.8125rem] leading-snug font-normal text-ink"
            style={{ top: pos.top, left: pos.left, width: WIDTH, transform: pos.above ? 'translateY(-100%)' : undefined }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

export interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tile: TileTint
  format?: (n: number) => string
  sub?: ReactNode
  /** Change vs previous period. `text` is what is shown inside the pill (e.g. "12%"). */
  delta?: { value: number; text: string; label?: string; good?: 'up' | 'down' }
  /** Small trend line under the number. */
  spark?: number[]
  info?: ReactNode
  onClick?: () => void
  className?: string
  /** the label in Uzbek as written in the code (what `t()` was given): the card's id in every language (EditableBlock idTitle) */
  uz?: string
  /**
   * How the number is computed (built next to the computation itself, e.g. pages/lead/explain.ts): sent to Nova as the
   * block's `metric` so it can say exactly where the number comes from. Never drawn.
   */
  explain?: () => unknown
  /** the data tables the number comes from (its page's own when absent, kit/SourceMark PAGE_TABLES) */
  tables?: readonly TableName[]
  /** the connected systems' marks (StatCard fills it from `tables`; a dashboard UI's own card draws it beside the info tip) */
  marks?: ReactNode
}

/** KPI card — hands over to the active dashboard UI's own KPI card when it has one. */
export function StatCard({ uz, explain, tables, ...props }: StatCardProps) {
  const design = useDesign()
  const uzbek = useUzbek()
  const V = design ? DS[design]?.StatCard : undefined
  const sources = useBlockSources(tables)
  if (sources.length) props = { ...props, marks: <SourceMark sources={sources} /> }
  const draw = (p: StatCardProps) => (V ? <V {...p} /> : <GlassStatCard {...p} />)
  if (typeof props.label !== 'string') return draw(props)
  const label = props.label
  return (
    <EditableBlock
      kind="stat"
      title={label}
      idTitle={uz !== undefined ? uzbek(uz) : undefined}
      className={props.className}
      explain={explain}
      render={(patch) => draw({ ...props, label: patch.title ?? label, tile: patch.color ?? props.tile })}
    />
  )
}

/**
 * Liquid Glass KPI card: coloured label and tile, a big rolling number, optional sparkline, a faint large icon in the corner
 * over the card's own tint (owner, 2026-11-04: "you took off the effects — add them"). A row of them lines up: the label keeps
 * two lines' room, the sparkline sits at the bottom, the info tip shows on hover.
 */
export function GlassStatCard({ label, value, icon: Icon, tile, format, sub, delta, spark, info, marks, onClick, className }: StatCardProps) {
  const isGood = delta && delta.value !== 0 ? (delta.value > 0) === ((delta.good ?? 'up') === 'up') : null
  // long formatted values ("1 soat 47 daq") get a smaller size so they fit the card
  const shown = format ? format(value) : String(value)
  const long = shown.length > 9
  const body = (
    <>
      <span className="kpi-glow" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="kpi-label line-clamp-2 min-h-[2.5em] text-[0.875rem] leading-tight font-semibold" title={label}>
          {label}
        </p>
        <div className="-me-1 -mt-1 flex items-center gap-0.5">
          {marks && <span className="me-1 inline-flex">{marks}</span>}
          {info && (
            // the tip is its own control: a click on it must not open the card's drill-down
            <span className="kpi-info hidden sm:inline-flex" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <InfoTip text={info} label={label} />
            </span>
          )}
          <IconTile icon={Icon} color={tile} size="sm" />
        </div>
      </div>
      {/* the number never runs out of a narrow tile: its size is also capped by the tile's width (kpi-num, blockedit.css) */}
      <p
        className={cx('kpi-num num mt-2 leading-none font-bold tracking-[-0.025em] text-ink', long ? 'text-[1.375rem] sm:text-[1.5rem]' : 'text-[1.75rem] sm:text-[2rem]')}
        style={{ '--kpi-ch': shown.length } as React.CSSProperties}
      >
        <Odometer value={value} format={format} />
      </p>
      {(sub || delta) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-ink-2">
          {delta && (
            <span
              className={cx(
                'num inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold',
                // a bad change is red, not the grey of "no change" (the arrow and sign say it without the colour too)
                isGood === null ? 'bg-surface-2 text-ink-2' : isGood ? 'bg-mint/70 text-mint-ink' : 'bg-danger-soft text-danger',
              )}
            >
              {delta.value > 0 ? '↑' : delta.value < 0 ? '↓' : '·'} {delta.text}
            </span>
          )}
          {delta?.label && <span className="text-ink-3">{delta.label}</span>}
          {sub}
        </div>
      )}
      {spark && spark.length > 1 && (
        // at the bottom: the sparklines of a row line up whatever is above them
        <div className="mt-auto pt-3">
          <div className="kpi-spark -mb-1 h-9">
            <Sparkline values={spark} color="var(--kpi-spark, rgb(var(--tile)))" />
          </div>
        </div>
      )}
      <Icon aria-hidden className="kpi-mark" strokeWidth={1.6} />
      {onClick && <ArrowUpRight aria-hidden size={16} className="absolute end-3 bottom-3 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />}
    </>
  )
  const cls = cx('glass-kpi panel group relative flex flex-col overflow-hidden p-4 text-start', tileClass(tile), onClick && 'card-hover', className)
  if (onClick)
    return (
      // a div with the button role, not a <button>: the card holds the info tip's own button
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          onClick()
        }}
        className={cx(cls, 'w-full cursor-pointer')}
      >
        {body}
      </div>
    )
  return <div className={cls}>{body}</div>
}

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
}

/** Segmented control with a sliding glass lens. Radio-group semantics; arrow keys move the selection. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  block,
  className,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: 'xs' | 'sm' | 'md'
  block?: boolean
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [lens, setLens] = useState<{ x: number; w: number; h: number; y: number } | null>(null)
  const place = () => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!el) return setLens(null)
    setLens({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
  }
  useLayoutEffect(place, [value, options.length])
  useEffect(() => {
    const ro = new ResizeObserver(() => place())
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % options.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length
    if (next < 0) return
    e.preventDefault()
    onChange(options[next]!.value)
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }
  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cx(
        'relative isolate grid max-w-full grid-flow-col gap-0.5 overflow-x-auto rounded-full bg-surface-2 p-[3px] [scrollbar-width:none]',
        block ? 'w-full auto-cols-fr' : 'inline-grid auto-cols-max',
        className,
      )}
    >
      {lens && <span aria-hidden className="lens" style={{ width: lens.w, height: lens.h, transform: `translate(${lens.x}px, ${lens.y}px)` }} />}
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cx(
              'pressable relative z-[1] inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap',
              size === 'xs' ? 'min-h-[28px] px-2.5 text-[0.75rem]' : size === 'sm' ? 'min-h-[32px] px-3 text-[0.8125rem]' : 'min-h-[40px] px-4 text-[0.9375rem]',
              on ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.icon && <o.icon aria-hidden size={size === 'md' ? 16 : 14} className="shrink-0" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export const ACCENTS: { name: Accent; color: string }[] = [
  { name: 'blue', color: '#4a6de4' },
  { name: 'violet', color: '#7367f0' },
  { name: 'teal', color: '#21a595' },
  { name: 'green', color: '#10b981' },
  { name: 'orange', color: '#f97316' },
  { name: 'pink', color: '#ec4899' },
  { name: 'graphite', color: '#71717a' },
]

/** Glossy accent colour dots (radio group). */
export function AccentPicker({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  const { t } = useT()
  return (
    <div role="radiogroup" aria-label={t("Rang")} className="flex flex-wrap items-center gap-2.5 px-1 py-1.5">
      {ACCENTS.map((a) => (
        <button
          key={a.name}
          type="button"
          role="radio"
          aria-checked={value === a.name}
          aria-label={a.name}
          onClick={() => onChange(a.name)}
          className="ap-dot"
          style={{ '--dot': a.color } as React.CSSProperties}
        >
          <Check strokeWidth={3.5} />
        </button>
      ))}
    </div>
  )
}

/** "Liquid Glass" amount slider, 0-100%. */
export function GlassSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useT()
  const id = useId()
  const pct = Math.round(value * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[0.8125rem]">
        <label htmlFor={id} className="font-semibold text-ink">
          Liquid Glass
        </label>
        <span className="tabular-nums text-ink-2">{pct}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-7 w-full accent-[var(--primary-fill)]"
      />
      <div className="flex justify-between text-[0.75rem] text-ink-3">
        <span>{t("Xira")}</span>
        <span>{t("Tiniq")}</span>
      </div>
    </div>
  )
}

/** Initial in a soft gradient circle. `hue` lets lists of people get different colours. */
export function Avatar({ name, size = 34, hue }: { name: string; size?: number; hue?: number }) {
  const initial = (name.trim()[0] ?? 'N').toLocaleUpperCase()
  const bg =
    hue === undefined
      ? 'linear-gradient(140deg, var(--primary), color-mix(in srgb, var(--primary) 30%, #2bb5a0))'
      : `linear-gradient(140deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 65% 48%))`
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_4px_10px_-4px_rgb(0_0_0/0.35)]"
      style={{ width: size, height: size, fontSize: size * 0.42, background: bg }}
    >
      {initial}
    </span>
  )
}
