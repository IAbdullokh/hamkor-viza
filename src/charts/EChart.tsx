import { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ECElementEvent } from 'echarts/core'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import type { VisualType } from '@/spec'
import { EChartCanvas, tooltipHtml, type EChartsCoreOption } from './EChartCanvas'
import { TableVisual } from './ChartView'
import { frameFromHeatmap, frameFromOption, frameToResult, rankVisuals, shapeFromFrame, useVisualChoice, VISUAL_LABELS, writeVisual, type ChartFrame, type RankedVisual } from './switcher'
import { readChartColors, type ChartColors } from './theme'
import { buildAny } from './variants'
import { MiniPreview, ShareKpi, VisualGrid, VisualPicker } from './VisualPicker'
import { BlockChartCtx } from '@/features/blockedit/context'

export { EChartCanvas, tooltipHtml, type EChartsCoreOption }

/**
 * ECharts in the Liquid Glass theme, with the chart pencil (✏️): when the option is a plain chart (categories × series,
 * one pie / funnel, or a heatmap) the viewer can redraw the same data as any fitting visual. The choice is kept per
 * dashboard (the route) and per chart (`chartKey`, else the chart's original type + series names).
 *
 *   <EChart height={260} option={(c) => ({ xAxis: {...}, series: [...] })} onClick={(p) => …} />
 *
 * `option` can be a function of the current colours (use c.series[i], c.primary, c.ink3 …).
 * `switchable={false}` hides the pencil (sparklines, charts with custom overlays).
 * A small chart with its own look around it (a donut with its legend) goes in `ChartPen` instead: the whole look is
 * the original form, and another form takes its place.
 */
type Option = EChartsCoreOption | ((c: ChartColors) => EChartsCoreOption)

export function EChart({
  option,
  height = 260,
  className,
  onClick,
  notMerge = false,
  switchable = true,
  chartKey,
}: {
  option: Option
  height?: number | string
  className?: string
  onClick?: (params: ECElementEvent) => void
  /** true = replace the whole option (use when series count changes) */
  notMerge?: boolean
  switchable?: boolean
  /** stable id of this chart on its page (for the remembered visual) */
  chartKey?: string
}) {
  // small charts (inline donuts with an overlay, sparklines) keep their hand-made look
  const big = typeof height === 'string' || height >= 200
  const frame = useMemo(() => (switchable && big ? safeFrame(option) : null), [option, switchable, big])
  const canvas = <EChartCanvas option={option} height={height} className={className} onClick={onClick} notMerge={notMerge} />
  if (!frame) return canvas
  return (
    <PenSwitch frame={frame} height={height} className={className} onClick={onClick} chartKey={chartKey}>
      {canvas}
    </PenSwitch>
  )
}

/**
 * The pencil around a chart that has its own look (a small donut with a legend beside it): `option` is read for the
 * data only, `children` stay the original form, another form is drawn `height` high in its place.
 */
export function ChartPen({ option, height = 260, chartKey, onClick, children }: { option: Option; height?: number; chartKey?: string; onClick?: (params: ECElementEvent) => void; children: ReactNode }) {
  const frame = useMemo(() => safeFrame(option), [option])
  if (!frame) return <>{children}</>
  return (
    <PenSwitch frame={frame} height={height} chartKey={chartKey} onClick={onClick}>
      {children}
    </PenSwitch>
  )
}

/** at most this many forms in the gallery: the best ones (the chart's own form always stays) */
const MAX_FORMS = 9

export function topForms(ranked: RankedVisual[], origin: VisualType): RankedVisual[] {
  const top = ranked.slice(0, MAX_FORMS)
  if (top.some((r) => r.visual === origin) || !ranked.some((r) => r.visual === origin)) return top
  return [...top.slice(0, MAX_FORMS - 1), ranked.find((r) => r.visual === origin)!]
}

/**
 * The pencil over any data drawn as a frame (categories × series): `children` is the original form; a chosen form is
 * drawn from the same data. The owner / an editor of a dashboard saves the form for everyone (the block's
 * BlockPatch.visual, like edit mode); a viewer's choice stays in their browser (per dashboard and chart) and wins for
 * them over the saved one.
 */
export function PenSwitch({
  frame,
  height,
  className,
  onClick,
  chartKey,
  children,
  variations,
}: {
  frame: ChartFrame
  height: number | string
  className?: string
  onClick?: (params: ECElementEvent) => void
  chartKey?: string
  children: ReactNode
  /** looks of the original form offered under the tiles (a table's progress look); `done` shows the original and closes */
  variations?: (done: () => void) => ReactNode
}) {
  const { t, lang } = useT()
  const ranked = useMemo(() => topForms(rankVisuals(shapeFromFrame(frame)), frame.origin), [frame])
  const card = chartKey ?? `${frame.origin}:${frame.series.length}:${frame.series.map((s) => s.name).join('|')}`
  const dash = dashboardKey()
  const [choice, setChoice] = useVisualChoice(dash, card)
  const block = useContext(BlockChartCtx)
  const report = block?.report
  // edit mode: the gallery opens from the block's corner ✏️ (next to ⤢ ⠿ ✕), not from a pencil inside the chart
  const cornerPen = !!block?.registerPen && !block.mine && !block.pick
  const openPen = useRef<(() => void) | null>(null)
  const registerPen = block?.registerPen
  useEffect(() => {
    if (!cornerPen || !registerPen) return
    registerPen(() => openPen.current?.())
    return () => registerPen(null)
  }, [cornerPen, registerPen])
  const visualsKey = ranked.map((r) => r.visual).join()
  // the measures a one-measure form may draw (the zoomed editor's "Ko'rsatkich" picker)
  const measuresKey = frame.series.length > 1 ? frame.series.map((s) => s.name).join('\u0001') : ''
  useEffect(() => {
    report?.(frame.origin, visualsKey.split(',') as VisualType[], measuresKey ? measuresKey.split('\u0001') : undefined)
  }, [report, frame.origin, visualsKey, measuresKey])
  // the zoomed editor (it picks a column, `pick`) draws its draft; an owner sees the saved form; a viewer their own
  const shared = !!block?.setVisual || !!block?.pick
  // a viewer's own form is in their layer of the block (personal.ts); one picked before that layer still shows
  const wanted = shared ? (block?.mine && !block.pick ? (block.visual ?? choice) : block?.visual) : (choice ?? block?.visual)
  const visual: VisualType = wanted && wanted !== frame.origin && ranked.some((r) => r.visual === wanted) ? wanted : frame.origin
  const switched = visual !== frame.origin
  const fmts = useMemo(() => frame.series.map((s) => s.format), [frame])
  const measure = block?.measure
  const data = useMemo(() => (switched ? frameToResult(frame, visual, measure) : null), [frame, visual, switched, measure])
  const switchedOption = useCallback((c: ChartColors) => (data ? buildAny(data.spec, data.res, c, lang, t, fmts) : {}), [data, lang, t, fmts])
  // clicks keep meaning the same category as in the original chart (drill-downs index into the page's own arrays)
  const onSwitchedClick = useCallback(
    (p: ECElementEvent) => {
      const i = frame.categories.indexOf(String(p.name))
      onClick?.({ ...p, dataIndex: i >= 0 ? i : p.dataIndex, name: i >= 0 ? frame.categories[i]! : p.name } as ECElementEvent)
    },
    [frame, onClick],
  )
  const pick = (v: VisualType | null) => {
    const next = v === frame.origin ? null : v
    if (block?.setVisual) {
      block.setVisual(next)
      // the owner's own browser choice would hide what everyone sees
      if (choice) writeVisual(dash, card, null)
    } else setChoice(next)
  }

  let body
  if (!data) body = children
  else if (visual === 'kpi') body = <div className="overflow-auto pe-10" style={{ height }}><ShareKpi res={data.res} height={height} /></div>
  else if (visual === 'table') body = <TableVisual res={data.res} height={height} className={className} />
  else body = <EChartCanvas key={visual} option={switchedOption} height={height} className={className} onClick={onClick ? onSwitchedClick : undefined} notMerge />

  return (
    <div className={cx('group/chart relative h-full min-w-0', !block?.pick && 'has-pen')}>
      <div key={visual} className="pen-swap h-full">{body}</div>
      {!block?.pick && (
        <div className="absolute top-0 end-0 z-[6]">
          <VisualPicker
            title={t(VISUAL_LABELS[visual])}
            openRef={openPen}
            className={cornerPen ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/chart:opacity-100 group-focus-within/chart:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100'}
          >
            {(close) => (
              <VisualGrid
                ranked={ranked}
                current={visual}
                overridden={switched}
                note={t(block?.setVisual && !block.mine ? 'Hamma uchun saqlanadi' : block ? 'Faqat sizda saqlanadi' : 'Tanlov shu dashbordda saqlanadi')}
                extra={variations?.(() => {
                  if (switched) pick(null)
                  close()
                })}
                onPick={(v) => {
                  pick(v)
                  close()
                }}
                onReset={() => {
                  pick(null)
                  close()
                }}
                preview={(v, h) => {
                  const d = frameToResult(frame, v)
                  return <MiniPreview spec={d.spec} res={d.res} lang={lang} t={t} height={h} fmts={fmts} />
                }}
              />
            )}
          </VisualPicker>
        </div>
      )}
    </div>
  )
}

/** The page the chart is on: hash route without the query (/d/glass/taqsimot, /l/<slug>/calls …). */
function dashboardKey(): string {
  try {
    return window.location.hash.replace(/^#/, '').split('?')[0] || '/'
  } catch {
    return '/'
  }
}

const PROBE: ChartColors = { series: Array(8).fill('#888888'), ink: '#000', ink2: '#333', ink3: '#666', grid: '#ddd', axis: '#ccc', primary: '#4466ff', surface: '#fff', dark: false }

function safeFrame(option: Option): ChartFrame | null {
  try {
    let colors = PROBE
    try {
      colors = readChartColors()
    } catch {
      // no document (tests): neutral colours are enough to read the data
    }
    const opt = typeof option === 'function' ? option(colors) : option
    const frame = frameFromOption(opt) ?? frameFromHeatmap(opt)
    return frame ? withAxisFormat(frame, opt) : null
  } catch {
    return null
  }
}

/** the chart's own value-axis formatter (so'm, %, minutes) as the frame's number format */
function withAxisFormat(frame: ChartFrame, opt: unknown): ChartFrame {
  const o = opt as Record<string, unknown>
  const axes = [o.yAxis, o.xAxis].flatMap((a) => (Array.isArray(a) ? a : a ? [a] : [])) as Record<string, unknown>[]
  const value = axes.find((a) => a.type === 'value')
  const f = (value?.axisLabel as Record<string, unknown> | undefined)?.formatter
  if (typeof f !== 'function') return frame
  const format = (v: number) => {
    try {
      return String((f as (v: number, i: number) => unknown)(v, 0))
    } catch {
      return String(v)
    }
  }
  return { ...frame, series: frame.series.map((s) => (s.format ? s : { ...s, format })) }
}
