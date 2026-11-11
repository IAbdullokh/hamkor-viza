import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Loader2, LoaderCircle, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { EditableBlock } from '@/features/blockedit/EditableBlock'
import { IconTile, type TileTint } from './glass'
import { tileClass } from '@/features/blockedit/tint'
import { useDesign } from '@/lib/design'
import { useUzbek } from '@/i18n'
import { DS } from '@/ds/registry'
import { SourceMark, useBlockSources } from '@/kit/SourceMark'
import type { TableName } from '@/features/livefilters/fields'

/**
 * Basic controls of the Liquid Glass kit. See docs/DESIGN.md before adding new ones —
 * prefer composing these over writing new styles.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary-fill text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(0_0_0/0.08),0_6px_16px_-6px_rgb(var(--accent-rgb)/0.6)] hover:brightness-110',
  secondary:
    'bg-surface text-ink border border-[var(--glass-line)] shadow-[inset_0_1px_0_var(--glass-rim),0_1px_2px_rgb(0_0_0/0.04)] hover:bg-[var(--surface-hover)]',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-[#c0262d] text-white hover:brightness-110',
  soft: 'bg-primary-soft text-primary-strong hover:brightness-105',
}

const SIZES = {
  xs: 'min-h-[30px] px-3 text-[0.8125rem] gap-1.5',
  sm: 'min-h-[36px] px-3.5 text-[0.875rem] gap-1.5',
  md: 'min-h-[42px] px-4.5 text-[0.9375rem] gap-2',
  lg: 'min-h-[52px] px-6 text-[1.0625rem] gap-2.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof SIZES
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'lg' ? 20 : size === 'xs' ? 14 : 17
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'pressable inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap select-none disabled:opacity-50',
        SIZES[size],
        VARIANTS[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {/* a loader given as a button's icon turns: "Saqlash" with a still loader looked frozen (owner, 2026-11-09) */}
      {Icon && <Icon aria-hidden size={iconSize} strokeWidth={2.2} className={Icon === Loader2 || Icon === LoaderCircle ? 'shrink-0 animate-spin motion-reduce:animate-none' : 'shrink-0'} />}
      {children}
      {IconRight && <IconRight aria-hidden size={iconSize} strokeWidth={2.2} className="shrink-0" />}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'secondary'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'pressable inline-grid shrink-0 place-items-center rounded-full',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        variant === 'ghost' ? 'text-ink-2 hover:bg-surface-2 hover:text-ink' : VARIANTS.secondary,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden size={size === 'sm' ? 16 : 19} strokeWidth={2} />
    </button>
  )
})

/** Small rounded label. tone = neutral | good | warn | bad | accent */
/** `wrap`: a long badge (a requirement list) breaks onto more lines instead of pushing the row wider than a phone */
export function Badge({ tone = 'neutral', children, className, wrap, title }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'; children: ReactNode; className?: string; wrap?: boolean; title?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2',
    good: 'bg-mint/70 text-mint-ink',
    warn: 'bg-warm-soft text-warm',
    bad: 'bg-danger-soft text-danger',
    accent: 'bg-primary-soft text-primary-strong',
  }
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', wrap ? 'max-w-full text-start leading-snug break-words whitespace-normal' : 'whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  )
}

/** Delta pill: green when the change is good, neutral slate when bad (never alarming red — Applekor rule). */
export function Delta({ value, good = 'up', format }: { value: number; good?: 'up' | 'down'; format?: (n: number) => string }) {
  const isGood = value === 0 ? null : (value > 0) === (good === 'up')
  const text = format ? format(Math.abs(value)) : `${Math.abs(value)}`
  return (
    <span
      className={cx(
        'num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold',
        // a bad change is red (with its arrow and sign), never the grey of "no change"
        isGood === null ? 'bg-surface-2 text-ink-2' : isGood ? 'bg-mint/70 text-mint-ink' : 'bg-danger-soft text-danger',
      )}
    >
      {value > 0 ? '↑' : value < 0 ? '↓' : '·'} {text}
    </span>
  )
}

export function TextField({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <input id={id} className="field min-h-[42px] rounded-[14px] px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none" {...rest} />
      {hint && <p className="text-[0.75rem] text-ink-3">{hint}</p>}
    </div>
  )
}

export function SelectField({ label, children, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <select id={id} className="field select-chevron min-h-[42px] rounded-[14px] px-3.5 text-[0.9375rem] text-ink focus:outline-none" {...rest}>
        {children}
      </select>
    </div>
  )
}

/** iOS-style switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('pressable relative h-[28px] w-[46px] shrink-0 rounded-full transition-colors', checked ? 'bg-[#34c759]' : 'bg-[rgb(120_120_128/0.24)]')}
    >
      <span
        className="absolute top-[2px] left-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-300 ease-[var(--ease-spring)]"
        style={{ transform: checked ? 'translateX(18px)' : undefined }}
      />
    </button>
  )
}

/** Page title block: optional eyebrow, big title, subtitle and actions on the right. */
export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[0.875rem] font-medium text-ink-2">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.022em] text-ink sm:text-[2.125rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[0.9375rem] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * Glass card with an optional header (icon tile + title + subtitle + actions).
 * `dense` = more opaque glass for tables and long lists.
 */
export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  tile?: TileTint
  actions?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  dense?: boolean
  /** No body padding (tables that touch the edges). */
  flush?: boolean
  /** the title in Uzbek as written in the code (what `t()` was given): the block's id in every language (EditableBlock idTitle) */
  uz?: string
  /**
   * the data tables the block's numbers come from (its page's own when absent, kit/SourceMark PAGE_TABLES): the connected
   * systems' marks show among its header actions, the name on hover. Only on a dashboard page, only on a titled card.
   */
  tables?: readonly TableName[]
}

/** Glass card — hands over to the active dashboard UI's own card when it has one. */
export function Card({ uz, tables, ...props }: CardProps) {
  const design = useDesign()
  const uzbek = useUzbek()
  const V = design ? DS[design]?.Card : undefined
  const sources = useBlockSources(tables)
  if (props.title && sources.length)
    props = {
      ...props,
      actions: (
        <>
          {props.actions}
          <SourceMark sources={sources} />
        </>
      ),
    }
  const draw = (p: CardProps) => (V ? <V {...p} /> : <GlassCard {...p} />)
  // a titled card on a dashboard can be edited by pointing at it (features/blockedit); elsewhere this is a no-op
  if (typeof props.title !== 'string') return draw(props)
  const title = props.title
  // a colour chosen for the block (edit mode / Nova) recolours its icon tile, a strip on top and its charts (EChartCanvas)
  return (
    <EditableBlock
      kind="card"
      title={title}
      idTitle={uz !== undefined ? uzbek(uz) : undefined}
      className={props.className}
      render={(patch) =>
        draw({ ...props, title: patch.title ?? title, ...(patch.color ? { tile: patch.color, className: cx(props.className, 'block-tinted', tileClass(patch.color)) } : {}) })
      }
    />
  )
}

export function GlassCard({
  title,
  subtitle,
  icon,
  tile = 'accent',
  actions,
  children,
  className,
  bodyClassName,
  dense,
  flush,
}: CardProps) {
  return (
    <section className={cx('panel flex min-w-0 flex-col', dense && 'panel-dense', className)}>
      {(title || actions) && (
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5">
          {icon && <IconTile icon={icon} color={tile} size="sm" />}
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-[0.9375rem] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="truncate text-[0.8125rem] text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      {/* flush: a table to the card's edges is clipped to its rounded corners (its sticky first column has a solid fill) */}
      <div className={cx('min-h-0 flex-1', !flush && 'px-4 pb-4 sm:px-5 sm:pb-5', !flush && !(title || actions) && 'pt-4 sm:pt-5', flush && 'overflow-clip rounded-b-[inherit]', flush && !(title || actions) && 'rounded-t-[inherit]', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 grid h-14 w-14 place-items-center rounded-[18px] bg-primary-soft text-primary-strong">
        <Icon aria-hidden size={26} />
      </span>
      <p className="text-[1.0625rem] font-semibold text-ink">{title}</p>
      {text && <p className="max-w-sm text-[0.875rem] text-ink-2">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />
}

/** Thin progress/share bar. value 0..1 */
export function Meter({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx('meter', className)} role="presentation">
      <span style={{ '--v': Math.max(0, Math.min(1, value)), '--bar': color } as React.CSSProperties} />
    </div>
  )
}

/** Small uppercase section label. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('eyebrow', className)}>{children}</p>
}
