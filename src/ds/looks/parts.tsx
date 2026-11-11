import type { CSSProperties, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cx } from '@/lib/cx'
import type { CardProps } from '@/ui/controls'
import { IconTile, InfoTip, Odometer, type StatCardProps } from '@/ui/glass'
import { Sparkline } from '@/ui/Sparkline'
import { tileClass } from '@/features/blockedit/tint'

/**
 * Card and KPI card of the newer looks. One component per block, the look decides the arrangement and the spacing
 * (lib/design VARIANT_TRAITS): Bento = tile with a bottom-heavy number, Midnight = instrument cell, Minimal = bare number
 * under a caps label, Glass Pro = dense row with the icon beside the number. Colour, radius, rim, type faces and the KPI
 * grid itself (bento hero, fused strip, hairline cells) come from looks.css (`.look-*` under :root[data-design]).
 */
export type LookId = 'bento' | 'midnight' | 'minimal' | 'glasspro' | 'klassik'

/** header / body padding per look: Midnight is the densest, Minimal the airiest */
const PAD: Record<LookId, { head: string; body: string; top: string }> = {
  bento: { head: 'px-5 pt-5 pb-3', body: 'px-5 pb-5', top: 'pt-5' },
  midnight: { head: 'px-3.5 pt-3 pb-2', body: 'px-3.5 pb-3.5', top: 'pt-3.5' },
  minimal: { head: 'px-0 pt-4 pb-3', body: 'px-0 pb-6 pt-4', top: 'pt-5' },
  glasspro: { head: 'px-4 py-2.5', body: 'px-4 pb-4 pt-3', top: 'pt-4' },
  klassik: { head: 'px-5 pt-4 pb-3', body: 'px-5 pb-5', top: 'pt-5' },
}

export function makeCard(look: LookId) {
  const pad = PAD[look]
  return function LookCard({ title, subtitle, icon: Icon, tile = 'accent', actions, children, className, bodyClassName, dense, flush }: CardProps) {
    const head = !!(title || actions)
    return (
      <section className={cx('look-card flex min-w-0 flex-col', tileClass(tile), dense && 'look-card-dense', className)}>
        {head && (
          <header className={cx('look-card-head flex items-center gap-3', pad.head)}>
            {Icon && look === 'midnight' && (
              <span aria-hidden className="look-icon grid h-6 w-6 shrink-0 place-items-center rounded-[7px]">
                <Icon size={14} strokeWidth={2.2} />
              </span>
            )}
            {Icon && look === 'bento' && <IconTile icon={Icon} color={tile} size="sm" />}
            {Icon && look === 'glasspro' && <IconTile icon={Icon} color={tile} size="xs" />}
            {Icon && look === 'klassik' && <Icon aria-hidden size={17} strokeWidth={2} className="look-icon shrink-0" />}
            <div className="min-w-0 flex-1">
              {title && <h2 className="look-card-title truncate">{title}</h2>}
              {subtitle && <p className="look-card-sub truncate">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
          </header>
        )}
        <div className={cx('min-h-0 flex-1', !flush && pad.body, !flush && !head && pad.top, flush && 'overflow-clip rounded-b-[inherit]', flush && !head && 'rounded-t-[inherit]', bodyClassName)}>{children}</div>
      </section>
    )
  }
}

export function makeStatCard(look: LookId) {
  return function LookStatCard(p: StatCardProps) {
    const { label, value, icon: Icon, tile, format, sub, delta, spark, info, marks, onClick, className } = p
    const isGood = delta && delta.value !== 0 ? (delta.value > 0) === ((delta.good ?? 'up') === 'up') : null
    // long formatted values ("1 soat 47 daq") get the smaller size so they fit the tile; the length also caps the size by
    // the tile's own width (--kpi-ch, looks.css), so a number in a narrow tile is never cut off
    const shown = format ? format(value) : String(value)
    const long = shown.length > 9
    // the systems' marks (kit/SourceMark) sit with the tip, in every look's own corner
    const tip = (info || marks) && (
      <span className="inline-flex shrink-0 items-center gap-1">
        {marks}
        {info && (
          // the tip is its own control: a click on it must not open the card's drill-down
          <span className="kpi-info hidden sm:inline-flex" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <InfoTip text={info} label={label} />
          </span>
        )}
      </span>
    )
    const arrow = delta ? (delta.value > 0 ? '↑' : delta.value < 0 ? '↓' : '·') : null
    const tone = isGood === null ? 'flat' : isGood ? 'good' : 'bad'
    const num = (
      <p className={cx('look-kpi-num leading-none', long && 'look-kpi-num-long')} style={{ '--kpi-ch': shown.length } as CSSProperties}>
        <Odometer value={value} format={format} />
      </p>
    )
    const foot = (sub || delta?.label) && (
      <div className="look-kpi-foot flex flex-wrap items-center gap-1.5">
        {delta?.label && <span>{delta.label}</span>}
        {sub}
      </div>
    )
    const pill = delta && (
      <span className={cx('look-delta num inline-flex items-center gap-0.5 whitespace-nowrap', `look-delta-${tone}`)}>
        {arrow} {delta.text}
      </span>
    )
    const line = (h: string, extra?: string, color = 'rgb(var(--tile))', values = spark) =>
      values && values.length > 1 ? (
        <div className={cx('look-kpi-spark', h, extra)}>
          <Sparkline values={values} color={color} />
        </div>
      ) : null

    let body: ReactNode
    if (look === 'bento') {
      // a tile: small-caps label on top, a huge number pushed to the bottom, the trend bleeding off the edge; the first
      // tile of a KPI row is the hero (2 × 2 cells, dark fill, looks.css)
      body = (
        <>
          <div className="flex items-center gap-2">
            <IconTile icon={Icon} color={tile} size="xs" />
            <p className="look-kpi-label min-w-0 flex-1" title={label}>
              {label}
            </p>
            {tip}
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-4">
            {num}
            {pill}
          </div>
          {foot && <div className="mt-1.5">{foot}</div>}
          {line('h-12', '-mx-4 -mb-4 mt-3 sm:-mx-5 sm:-mb-5')}
        </>
      )
    } else if (look === 'midnight') {
      // one cell of the instrument strip: mono caps label, glowing mono number, the trend as a thin neon trace
      body = (
        <>
          <div className="flex items-start justify-between gap-2">
            {/* two lines at most: a long label ("Sifatli → Qabulga yozildi") reads whole instead of ending in "…" */}
            <p className="look-kpi-label line-clamp-2 min-w-0" title={label}>
              {label}
            </p>
            <div className="flex items-center gap-1">
              {tip}
              <Icon aria-hidden size={14} className="look-kpi-icon" />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {num}
            {pill}
          </div>
          {foot && <div className="mt-1.5">{foot}</div>}
          {line('h-7', 'mt-auto pt-2')}
        </>
      )
    } else if (look === 'minimal') {
      // no tile at all: a caps label, a big light number, one hairline, the delta as plain text, a 1.5px ink trace
      body = (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="look-kpi-label min-w-0" title={label}>
              {label}
            </p>
            {tip}
          </div>
          <div className="mt-3">{num}</div>
          {(delta || foot) && (
            <div className="look-kpi-rule mt-3 flex flex-wrap items-center gap-2 pt-2">
              {pill}
              {foot}
            </div>
          )}
          {line('h-6', 'mt-auto pt-3', 'var(--ink-2)')}
        </>
      )
    } else if (look === 'klassik') {
      // the earlier Data365 dashboard's card: the icon in a soft coloured circle, the title, a big heavy number in the
      // card's colour, the footnote, and a full-width wave along the bottom edge
      body = (
        <>
          <div className="flex items-start justify-between gap-2">
            <span aria-hidden className="look-kpi-circle grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Icon size={19} strokeWidth={2} />
            </span>
            {tip}
          </div>
          <p className="look-kpi-label mt-2 line-clamp-2" title={label}>
            {label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {num}
            {pill}
          </div>
          {foot && <div className="mt-1">{foot}</div>}
          {line('h-20', 'look-kpi-wave -mx-4 mt-auto pt-3 sm:-mx-5', undefined, spark && smoothWave(spark))}
        </>
      )
    } else {
      // Glass Pro: a dense frosted row — a coloured strip down the side, the icon tile beside the label and the number,
      // the trend as a small inline chart next to the footnote when the tile is wide enough (a container query); in a
      // narrow tile the footnote gets the full width and the trend sits under it, so the two never run into each other
      body = (
        <>
          <span className="look-kpi-strip" aria-hidden />
          <span className="kpi-glow" aria-hidden />
          <div className="flex items-center gap-3">
            <IconTile icon={Icon} color={tile} size="md" className="look-kpi-tile shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1">
                {/* three lines: beside the icon the label is narrow, and a hyphenated Russian label ("Качествен-ные → Запись
                    на приём") needs the third line to read whole */}
                <p className="look-kpi-label line-clamp-3 min-w-0 flex-1" title={label}>
                  {label}
                </p>
                {tip}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {num}
                {pill}
              </div>
            </div>
          </div>
          {(foot || (spark && spark.length > 1)) && (
            <div className="@container mt-auto pt-2">
              <div className="flex flex-col gap-1.5 @min-[18rem]:flex-row @min-[18rem]:items-end @min-[18rem]:justify-between @min-[18rem]:gap-3">
                {foot && <div className="min-w-0 flex-1 break-words">{foot}</div>}
                {line('h-7 w-full shrink-0 @min-[18rem]:w-[42%] @min-[18rem]:max-w-28 @min-[18rem]:ms-auto')}
              </div>
            </div>
          )}
        </>
      )
    }

    const pad =
      look === 'midnight'
        ? 'p-3 sm:p-3.5'
        : look === 'minimal'
          ? 'px-1 py-5 sm:px-5 sm:py-6'
          : look === 'glasspro'
            ? 'p-3 sm:p-3.5'
            : look === 'klassik'
              ? // the wave runs to the bottom edge; a card without one keeps its bottom padding
                cx('px-4 pt-4 sm:px-5 sm:pt-5', !(spark && spark.length > 1) && 'pb-4 sm:pb-5')
              : 'p-4 sm:p-5'
    const cls = cx('look-kpi group relative flex flex-col overflow-hidden text-start', pad, tileClass(tile), onClick && 'look-kpi-click', className)
    const content = (
      <>
        {body}
        {onClick && <ArrowUpRight aria-hidden size={16} className="absolute end-3 bottom-3 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />}
      </>
    )
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
          {content}
        </div>
      )
    return <div className={cls}>{content}</div>
  }
}

/**
 * Klassik's wave: the daily values averaged into a few points (9 at most), so the line keeps the real trend but flows like
 * the original dashboard's smooth waves instead of a spiky day-by-day trace.
 */
export function smoothWave(values: number[], points = 9): number[] {
  if (values.length <= points) return values
  const size = values.length / points
  return Array.from({ length: points }, (_, i) => {
    const part = values.slice(Math.floor(i * size), Math.max(Math.floor(i * size) + 1, Math.floor((i + 1) * size)))
    return part.reduce((a, b) => a + b, 0) / part.length
  })
}
