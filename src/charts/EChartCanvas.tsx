import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, FunnelChart, GaugeChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart, TreemapChart } from 'echarts/charts'
import { DataZoomComponent, DatasetComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, PolarComponent, RadarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption, ECharts } from 'echarts/core'
import { useSettings } from '@/lib/settings'
import { useDesign, type DesignId } from '@/lib/design'
import { useLookMix } from '@/lib/lookMix'
import { usePageBg } from '@/lib/pageBg'
import { useViewLook } from '@/lib/viewLook'
import { DS } from '@/ds/registry'
import { useResolvedTheme } from '@/shell/ThemeController'
import { buildTheme, readChartColors, type ChartColors } from './theme'
import { midnightOption } from '@/ds/looks/charts'
import { BlockChartCtx } from '@/features/blockedit/context'
import { tintChart, tintPalette } from '@/features/blockedit/patch'

echarts.use([
  BarChart, LineChart, PieChart, FunnelChart, HeatmapChart, ScatterChart, GaugeChart,
  GridComponent, TooltipComponent, LegendComponent, DatasetComponent, DataZoomComponent, VisualMapComponent,
  MarkLineComponent, MarkAreaComponent, MarkPointComponent,
  // the chart pencil's extra forms (variants.ts): treemap, radar, radial bars
  TreemapChart, RadarChart, RadarComponent, PolarComponent,
  LabelLayout, UniversalTransition, CanvasRenderer,
])

export type { EChartsCoreOption }

/**
 * The bare ECharts canvas in the Liquid Glass theme (EChart.tsx adds the chart pencil on top). Re-themes on light/dark + accent changes, resizes with its box,
 * animates data changes (UniversalTransition morphs between chart types).
 *
 *   <EChartCanvas height={260} option={(c) => ({ xAxis: {...}, series: [...] })} onClick={(p) => …} />
 *
 * `option` can be a function of the current colours (use c.series[i], c.primary, c.ink3 …).
 */
export function EChartCanvas({
  option,
  height = 260,
  className,
  onClick,
  notMerge = false,
}: {
  option: EChartsCoreOption | ((c: ChartColors) => EChartsCoreOption)
  height?: number | string
  className?: string
  onClick?: (params: echarts.ECElementEvent) => void
  /** true = replace the whole option (use when series count changes) */
  notMerge?: boolean
}) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  const theme = useResolvedTheme()
  const { accent: ownAccent, lang } = useSettings()
  // a viewer's own Rang (Ko'rinish) and a plain page (Fon: Ko'k tun, Shifer…) bring their own chart tokens: re-read them
  const accent = useViewLook()?.accent ?? ownAccent
  const pageBg = usePageBg() ?? ''
  const design = useDesign()
  // an "Aralash" mood changes the chart tokens without changing the theme (dark → neon): re-read them then too
  const mood = useLookMix()?.mood ?? ''
  const [colors, setColors] = useState<ChartColors | null>(null)
  const clickRef = useRef(onClick)
  clickRef.current = onClick
  // a colour chosen for the block around (edit mode / Nova): the chart draws its series in shades of it
  const tint = useContext(BlockChartCtx)?.color
  const tinted = useRef(false)
  const drawn = useMemo(() => {
    if (!colors || !tint) return colors
    const series = tintPalette(tintChart(tint, colors.dark), colors.dark)
    return { ...colors, series, primary: series[0]! }
  }, [colors, tint])

  // (re)create on theme / accent change — ECharts themes are fixed at init
  useEffect(() => {
    if (!el.current) return
    // wait a frame so ThemeController has written data-theme / data-accent
    const id = requestAnimationFrame(() => {
      if (!el.current) return
      const c = readChartColors()
      const name = `d365-${theme}-${design ?? 'glass'}${mood && `-${mood}`}${pageBg && `-${pageBg}`}-${c.primary}`
      const base = buildTheme(c)
      const variant = design ? DS[design]?.chartTheme : undefined
      echarts.registerTheme(name, variant ? variant(c, base) : base)
      chart.current?.dispose()
      chart.current = echarts.init(el.current, name, { renderer: 'canvas' })
      chart.current.on('click', (p) => clickRef.current?.(p as echarts.ECElementEvent))
      setColors(c)
    })
    return () => cancelAnimationFrame(id)
  }, [theme, accent, design, mood, pageBg])

  useEffect(() => () => chart.current?.dispose(), [])

  useEffect(() => {
    if (!chart.current || !drawn) return
    let raw = typeof option === 'function' ? option(drawn) : option
    // the theme's palette was fixed at init: a tinted block gives the option its own (series without a colour of their own)
    if (tint) raw = { ...raw, color: drawn.series }
    // replaced whole while tinted and once after (the tint's palette must not stay merged in)
    const replace = notMerge || !!tint || tinted.current
    tinted.current = !!tint
    chart.current.setOption(lookOption(raw, drawn, design, mood), { notMerge: replace, lazyUpdate: true })
  }, [option, drawn, tint, notMerge, lang, design, mood])

  useEffect(() => {
    if (!el.current) return
    const ro = new ResizeObserver(() => chart.current?.resize({ animation: { duration: 0 } }))
    ro.observe(el.current)
    return () => ro.disconnect()
  }, [])

  // data-chart-box: a block's height (blockedit.css [data-block-h]) can make the chart shorter or taller
  return <div ref={el} data-chart-box="" className={className} style={{ height, width: '100%', cursor: onClick ? 'pointer' : undefined }} />
}

/** Glass tooltip body helper: rows of [colour, label, value]. */
export function tooltipHtml(title: string, rows: { color?: string; label: string; value: string }[], footer?: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
  return `<div class="et-title">${esc(title)}</div>${rows
    .map(
      (r) =>
        `<div class="et-row">${r.color ? `<span class="et-dot" style="background:${r.color}"></span>` : ''}<span class="et-label">${esc(r.label)}</span><span class="et-val">${esc(r.value)}</span></div>`,
    )
    .join('')}${footer ? `<div class="et-foot">${esc(footer)}</div>` : ''}`
}

/** the active look's pass over a chart option (ds/looks/charts.ts); an "Aralash" neon mood adds the neon bars and glow */
function lookOption(opt: EChartsCoreOption, c: ChartColors, design: DesignId | null, mood: string): EChartsCoreOption {
  const own = design ? DS[design]?.option : undefined
  let o = opt as Record<string, unknown>
  if (own) o = own(o, c)
  if (mood === 'neon' && own !== midnightOption) o = midnightOption(o, c)
  return o as EChartsCoreOption
}
