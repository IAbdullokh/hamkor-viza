import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Pencil, RotateCcw } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import type { Lang } from '@/lib/settings'
import type { ChartSpec, QueryResult, VisualType } from '@/spec'
import { Badge, Button, Meter } from '@/ui/controls'
import { Sheet } from '@/ui/overlay'
import { EChartCanvas } from './EChartCanvas'
import { formatValue } from './format'
import { miniOption, VISUAL_HINTS, VISUAL_LABELS, type RankedVisual } from './switcher'
import type { ChartColors } from './theme'
import { buildAny, type SeriesFormat } from './variants'
import './pen.css'

/**
 * The chart pencil: a ✏️ button (on hover on desktop, always on touch) that opens a gallery of live mini previews —
 * the same data in every visual that fits. Popover on desktop, bottom sheet on phones. One click switches.
 */
const PHONE = '(max-width: 639px)'

function isPhone(): boolean {
  try {
    return window.matchMedia(PHONE).matches
  } catch {
    return false
  }
}

export function PencilButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { t } = useT()
  return (
    <button
      type="button"
      // stays clickable in edit mode (blockedit.css lets clicks through only to [data-block-keep])
      data-block-keep=""
      aria-label={t("Grafik turini o'zgartirish")}
      title={t("Grafik turini o'zgartirish")}
      className={cx(
        'chart-pencil pressable grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--lens-bg)] text-ink-2 shadow-[var(--lens-shadow)] transition-opacity hover:text-ink focus-visible:opacity-100',
        className,
      )}
      {...rest}
    >
      <Pencil aria-hidden size={15} strokeWidth={2.1} />
    </button>
  )
}

/** Trigger + container. `children` is the gallery body; it mounts only while open, so previews cost nothing until then. */
export function VisualPicker({
  title,
  className,
  children,
  openRef,
}: {
  title: string
  className?: string
  children: (close: () => void) => ReactNode
  /** set to a function that opens the gallery (the block's corner ✏️ in edit mode) */
  openRef?: { current: (() => void) | null }
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const onOpen = () => {
    setPhone(isPhone())
    setOpen(true)
  }
  if (openRef) openRef.current = onOpen
  if (phone)
    return (
      <>
        <PencilButton className={className} onClick={onOpen} aria-expanded={open} aria-haspopup="dialog" data-nodrag />
        <Sheet open={open} onOpenChange={setOpen} side="bottom" title={t('Grafik turi')} subtitle={title}>
          {/* React bubbles portal clicks to the block: don't let a tile click open the block editor in edit mode */}
          <div className="p-4" data-block-keep="" onClick={(e) => e.stopPropagation()}>
            {open && children(close)}
          </div>
        </Sheet>
      </>
    )
  return (
    <Popover.Root open={open} onOpenChange={(v) => (v ? onOpen() : setOpen(false))}>
      <Popover.Trigger asChild>
        <PencilButton className={className} data-nodrag />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t('Grafik turi')}
          // React bubbles portal clicks to the block: a tile click must not open the block editor in edit mode
          data-block-keep=""
          onClick={(e) => e.stopPropagation()}
          className="pop-in glass-pop scroll-thin z-[65] max-h-[var(--radix-popover-content-available-height)] w-[min(520px,calc(100vw-24px))] overflow-y-auto rounded-[22px] p-3 focus:outline-none"
          onOpenAutoFocus={(e) => {
            // focus the chosen tile, not the first one
            e.preventDefault()
            requestAnimationFrame(() => (document.querySelector('[data-visual-tile][aria-pressed="true"]') as HTMLElement | null)?.focus())
          }}
        >
          <p className="px-1 pb-2 text-[0.875rem] font-semibold text-ink">
            {t('Grafik turi')} <span className="font-normal text-ink-3">· {title}</span>
          </p>
          {open && children(close)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The tiles. Arrow keys move between them, Enter/Space picks. */
export function VisualGrid({
  ranked,
  current,
  overridden,
  onPick,
  onReset,
  preview,
  note,
  extra,
}: {
  ranked: RankedVisual[]
  current: VisualType
  overridden: boolean
  onPick: (v: VisualType) => void
  onReset: () => void
  /** a live preview of one form, `height` px high (the tiles, and the bigger spotlight of the form under the pointer) */
  preview: (v: VisualType, height?: number) => ReactNode
  /** where the choice is kept (the footer) */
  note?: string
  /** more variations of the same form under the tiles (a table's "Rangli chiziqli jadval", kit/DataTable) */
  extra?: ReactNode
}) {
  const { t, lang } = useT()
  const grid = useRef<HTMLDivElement>(null)
  // the form under the pointer / keyboard focus, shown big above the tiles
  const [hover, setHover] = useState<VisualType | null>(null)
  const spot = hover ?? current
  useEffect(() => {
    // the sheet has no auto-focus hook of ours: focus the chosen tile once it is there
    const id = requestAnimationFrame(() => {
      const el = grid.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (el && !grid.current?.contains(document.activeElement)) el.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [])
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tiles = [...(grid.current?.querySelectorAll<HTMLElement>('[data-visual-tile]') ?? [])]
    const i = tiles.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    const cols = Math.max(1, Math.round((grid.current?.clientWidth ?? 1) / (tiles[0]?.offsetWidth || 1)))
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols, Home: -i, End: tiles.length - 1 - i }[e.key]
    if (step === undefined) return
    e.preventDefault()
    tiles[Math.max(0, Math.min(tiles.length - 1, i + step))]?.focus()
  }
  return (
    <div>
      <div aria-hidden className="mb-2.5 overflow-hidden rounded-[16px] border border-line bg-surface-2/50 px-2 pt-2 pb-1">
        <div className="flex items-baseline gap-2 px-1 pb-1">
          <span className="text-[0.8125rem] font-semibold text-ink">{t(VISUAL_LABELS[spot])}</span>
          {VISUAL_HINTS[spot] && <span className="min-w-0 truncate text-[0.75rem] text-ink-3">{t(VISUAL_HINTS[spot]!)}</span>}
        </div>
        <div key={spot} className="pen-spot pointer-events-none h-[148px]">
          {preview(spot, 148)}
        </div>
      </div>
      <div ref={grid} role="group" aria-label={t('Grafik turi')} onKeyDown={onKey} onMouseLeave={() => setHover(null)} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ranked.map(({ visual, recommended }) => {
          const on = visual === current
          return (
            <button
              key={visual}
              type="button"
              data-visual-tile={visual}
              aria-pressed={on}
              onClick={() => onPick(visual)}
              onMouseEnter={() => setHover(visual)}
              onFocus={() => setHover(visual)}
              className={cx(
                'pen-tile pressable relative flex min-w-0 flex-col gap-1 rounded-[16px] border p-2 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
                on ? 'border-[var(--primary)] bg-primary-soft' : 'border-line bg-surface-2/60 hover:bg-surface-2',
              )}
            >
              <div aria-hidden className="pointer-events-none h-[64px] overflow-hidden rounded-[10px]">
                {preview(visual, 64)}
              </div>
              <span className="flex min-w-0 items-center gap-1">
                <span className={cx('min-w-0 flex-1 truncate text-[0.8125rem] font-semibold', on ? 'text-primary-strong' : 'text-ink')}>{t(VISUAL_LABELS[visual])}</span>
                {on && <Check aria-hidden size={14} className="shrink-0 text-primary-strong" />}
              </span>
              {recommended && (
                <Badge tone="good" className="absolute top-1.5 end-1.5 !px-1.5 !text-[0.6875rem]">
                  {/* "Tavsiya" alone already means "referral" in the page dictionaries */}
                  {lang === 'uz' ? 'Tavsiya' : t('Tavsiya etiladi')}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
      {extra}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <p className="min-w-0 truncate text-[0.75rem] text-ink-3">{note ?? t("Tanlov shu dashbordda saqlanadi")}</p>
        <Button size="xs" variant="ghost" icon={RotateCcw} disabled={!overridden} onClick={onReset}>
          {t('Asl holiga qaytarish')}
        </Button>
      </div>
    </div>
  )
}

/** A live mini preview of one visual from a spec + result already in hand. */
export function MiniPreview({ spec, res, lang, t, height = 76, fmts }: { spec: ChartSpec; res: QueryResult; lang: Lang; t: (s: string) => string; height?: number; fmts?: SeriesFormat[] }) {
  if (spec.visual === 'kpi') return <ShareKpi res={res} compact />
  if (spec.visual === 'table') return <MiniTable res={res} rows={height > 100 ? 7 : 4} />
  // the spotlight is a real small chart (axes, labels); the tiles are bare shapes
  const big = height > 100
  return <EChartCanvas height={height} notMerge option={(c: ChartColors) => { const o = buildAny(spec, res, c, lang, t, fmts) as Record<string, unknown>; return big ? { ...o, animationDuration: 420, tooltip: { show: false } } : miniOption(o) }} />
}

/** KPI + share: the total of the first measure and each category's part of it. */
export function ShareKpi({ res, compact, height }: { res: QueryResult; compact?: boolean; height?: number | string }) {
  const { t, lang } = useT()
  const dims = res.columns.filter((c) => c.kind === 'dimension').length
  const m = res.columns[dims]
  const rows = res.rows.map((r) => ({ name: formatValue(r[0], res.columns[0]?.format, lang), value: Number(r[dims]) || 0 }))
  const total = rows.reduce((s, r) => s + r.value, 0)
  const top = [...rows].sort((a, b) => b.value - a.value).slice(0, compact ? 3 : 6)
  return (
    <div className={cx('flex h-full flex-col', compact ? 'gap-1 px-1.5 py-1' : 'gap-3')} style={compact ? undefined : { minHeight: height }}>
      <p className={cx('num leading-none font-bold tracking-[-0.03em] text-ink', compact ? 'text-[1.125rem]' : 'text-[2rem] sm:text-[2.25rem]')}>{formatValue(total, m?.format, lang, true)}</p>
      {!compact && m?.name && <p className="-mt-2 text-[0.8125rem] text-ink-3">{t(m.name)}</p>}
      <ul className={cx('flex flex-col', compact ? 'gap-1' : 'gap-2.5')}>
        {top.map((r, i) => (
          <li key={i} className="min-w-0">
            {!compact && (
              <div className="mb-1 flex items-center gap-2 text-[0.8125rem]">
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.name}</span>
                <span className="num font-semibold text-ink">{formatValue(r.value, m?.format, lang, true)}</span>
                <span className="num w-12 text-end text-ink-3">{total ? `${((r.value / total) * 100).toFixed(1)}%` : '—'}</span>
              </div>
            )}
            <Meter value={total ? r.value / total : 0} color={`var(--chart-${(i % 8) + 1})`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function MiniTable({ res, rows = 4 }: { res: QueryResult; rows?: number }) {
  const { lang } = useT()
  return (
    <div className="flex flex-col gap-[3px] px-1 py-1 text-[0.625rem] leading-[0.875rem] text-ink-2">
      {res.rows.slice(0, rows).map((r, i) => (
        <div key={i} className="flex gap-2 border-b border-line pb-[3px] last:border-0">
          <span className="min-w-0 flex-1 truncate">{formatValue(r[0], res.columns[0]?.format, lang)}</span>
          <span className="num font-semibold text-ink">{formatValue(r[r.length - 1], res.columns[r.length - 1]?.format, lang, true)}</span>
        </div>
      ))}
    </div>
  )
}
