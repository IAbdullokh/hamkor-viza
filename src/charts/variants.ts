import type { EChartsCoreOption } from 'echarts/core'
import type { Lang } from '@/lib/settings'
import type { ChartSpec, QueryResult, VisualType } from '@/spec'
import { tooltipHtml } from './EChartCanvas'
import { formatValue } from './format'
import { buildOption } from './options'
import type { ChartColors } from './theme'

/**
 * The chart pencil's extra forms (owner, 2026-10-26: "press it and it shows different variations … any type of
 * charts"), picked after the FT Visual Vocabulary: step (change over time), stacked area / 100% columns (composition
 * over time / per category), nightingale rose, treemap, radial bars and lollipops (ranking, part of a whole), radar
 * (several measures per category). Each one is drawn from the same synthetic spec + result the pencil makes of a chart
 * (switcher.ts frameToResult): one dimension, one or more measures. `buildAny` draws any visual — the standard ones
 * through options.ts buildOption.
 */
export const EXTRA_VISUALS = ['step', 'stackedArea', 'stacked100', 'rose', 'treemap', 'radial', 'lollipop', 'radar'] as const
export type ExtraVisual = (typeof EXTRA_VISUALS)[number]

export const isExtra = (v: VisualType): v is ExtraVisual => (EXTRA_VISUALS as readonly string[]).includes(v)

/** a series' own number format (the table column's / the chart axis' formatter), when the source had one */
export type SeriesFormat = ((v: number) => string) | undefined

/** colour with alpha: #rrggbb, #rgb or rgb(…) */
export function alpha(color: string, a: number): string {
  const s = color.trim()
  const m = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (m) {
    const [r, g, b] = m[1]!.split(/[ ,/]+/).filter(Boolean)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  let h = s.replace('#', '')
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return s
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const vgrad = (color: string, top: number, bottom: number) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: alpha(color, top) }, { offset: 1, color: alpha(color, bottom) }] })
const hgrad = (color: string, from: number, to: number) => ({ type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: alpha(color, from) }, { offset: 1, color: alpha(color, to) }] })

interface Table {
  cats: string[]
  series: { name: string; values: number[]; fmt: (v: number, compact?: boolean) => string }[]
}

/** the result as categories × measures (rows [category, m0, m1 …], as frameToResult makes them) */
function table(res: QueryResult, lang: Lang, fmts: SeriesFormat[] = []): Table {
  const dims = res.columns.filter((c) => c.kind === 'dimension').length
  const meas = res.columns.filter((c) => c.kind === 'measure')
  return {
    cats: res.rows.map((r) => formatValue(r[0], res.columns[0]?.format, lang)),
    series: meas.map((m, j) => {
      const own = fmts[j]
      return {
        name: m.name,
        values: res.rows.map((r) => Number(r[dims + j]) || 0),
        fmt: (v: number, compact = false) => (own ? own(v) : formatValue(v, m.format, lang, compact)),
      }
    }),
  }
}

const pct = (v: number, lang: Lang) => `${(v * 100).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: v < 0.1 ? 1 : 0 })}%`

/** any visual of the pencil: the extra ones here, the standard ones through buildOption */
export function buildAny(spec: ChartSpec, res: QueryResult, c: ChartColors, lang: Lang, t: (s: string) => string, fmts?: SeriesFormat[]): EChartsCoreOption {
  if (!isExtra(spec.visual)) return withFormats(buildOption(spec, res, c, lang, t), spec.visual, fmts)
  return buildExtra(spec.visual, spec, res, c, lang, t, fmts)
}

/** the standard forms with the source's own number format in their tooltip (so'm, %, counts) */
function withFormats(opt: EChartsCoreOption, visual: VisualType, fmts: SeriesFormat[] | undefined): EChartsCoreOption {
  const f = fmts?.[0]
  if (!f || visual === 'heatmap') return opt
  const o = opt as Record<string, unknown>
  const tip = o.tooltip as Record<string, unknown> | undefined
  if (!tip) return opt
  if (tip.trigger === 'item')
    return {
      ...o,
      tooltip: {
        ...tip,
        formatter: (p: { name: string; value: number; color: string; percent?: number; seriesName?: string }) =>
          tooltipHtml(p.name, [{ color: p.color, label: p.seriesName ?? '', value: f(p.value) }], p.percent != null ? `${p.percent.toFixed(1)}%` : undefined),
      },
    }
  return {
    ...o,
    tooltip: {
      ...tip,
      formatter: (ps: { name: string; seriesName: string; value: number; color: string; seriesIndex: number }[]) =>
        ps.length ? tooltipHtml(ps[0]!.name, ps.map((p) => ({ color: p.color, label: p.seriesName, value: (fmts?.[p.seriesIndex] ?? f)(p.value) }))) : '',
    },
  }
}

function buildExtra(v: ExtraVisual, _spec: ChartSpec, res: QueryResult, c: ChartColors, lang: Lang, t: (s: string) => string, fmts?: SeriesFormat[]): EChartsCoreOption {
  const d = table(res, lang, fmts)
  const legend = d.series.length > 1
  const pal = (i: number) => c.series[i % c.series.length]!
  const axisTip = (footer?: (i: number) => string | undefined) => ({
    trigger: 'axis',
    axisPointer: { type: v === 'step' || v === 'stackedArea' ? 'line' : 'shadow' },
    formatter: (ps: { dataIndex: number; seriesIndex: number; color: unknown; value: number }[]) => {
      const i = ps[0]?.dataIndex ?? 0
      return tooltipHtml(
        d.cats[i] ?? '',
        ps.filter((p) => d.series[p.seriesIndex]).map((p) => ({ color: typeof p.color === 'string' ? p.color : pal(p.seriesIndex), label: d.series[p.seriesIndex]!.name, value: d.series[p.seriesIndex]!.fmt(d.series[p.seriesIndex]!.values[i] ?? 0) })),
        footer?.(i),
      )
    },
  })
  const itemTip = {
    trigger: 'item',
    formatter: (p: { name: string; value: number; color: unknown; percent?: number }) => {
      const s = d.series[0]
      const total = s ? s.values.reduce((a, x) => a + x, 0) : 0
      return tooltipHtml(p.name, [{ color: typeof p.color === 'string' ? p.color : pal(0), label: s?.name ?? '', value: s ? s.fmt(Number(p.value)) : String(p.value) }], total > 0 ? pct(Number(p.value) / total, lang) : undefined)
    },
  }
  const legendOpt = legend ? { show: true, top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 10, itemHeight: 10 } : { show: false }
  const grid = { left: 4, right: 14, top: legend ? 36 : 14, bottom: 4, containLabel: true }
  const catAxis = (gap: boolean) => ({ type: 'category', data: d.cats, boundaryGap: gap, axisLabel: { hideOverlap: true } })
  const valAxis = (fmt?: (v: number) => string) => ({ type: 'value', axisLabel: { formatter: fmt ?? ((x: number) => d.series[0]?.fmt(x, true) ?? String(x)) } })

  switch (v) {
    case 'step':
      return {
        grid,
        legend: legendOpt,
        tooltip: axisTip(),
        xAxis: catAxis(false),
        yAxis: valAxis(),
        series: d.series.map((s, i) => ({
          name: s.name,
          type: 'line',
          step: 'middle',
          data: s.values,
          showSymbol: false,
          lineStyle: { width: 2.25, color: pal(i) },
          itemStyle: { color: pal(i) },
          areaStyle: d.series.length === 1 ? { color: vgrad(pal(i), 0.22, 0) } : undefined,
          universalTransition: true,
          emphasis: { focus: 'series' },
        })),
      }

    case 'stackedArea': {
      const totals = d.cats.map((_, i) => d.series.reduce((a, s) => a + (s.values[i] ?? 0), 0))
      return {
        grid,
        legend: legendOpt,
        tooltip: axisTip((i) => (d.series.length > 1 ? `${t('Jami')}: ${d.series[0]!.fmt(totals[i] ?? 0)}` : undefined)),
        xAxis: catAxis(false),
        yAxis: valAxis(),
        series: d.series.map((s, i) => ({
          name: s.name,
          type: 'line',
          stack: 'total',
          smooth: 0.35,
          data: s.values,
          showSymbol: false,
          lineStyle: { width: 1.75, color: pal(i) },
          itemStyle: { color: pal(i) },
          areaStyle: { color: vgrad(pal(i), 0.55, 0.12) },
          universalTransition: true,
          emphasis: { focus: 'series' },
        })),
      }
    }

    case 'stacked100': {
      const totals = d.cats.map((_, i) => d.series.reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0))
      const last = d.series.length - 1
      return {
        grid,
        legend: legendOpt,
        tooltip: {
          ...axisTip(),
          formatter: (ps: { dataIndex: number; seriesIndex: number; color: unknown }[]) => {
            const i = ps[0]?.dataIndex ?? 0
            return tooltipHtml(
              d.cats[i] ?? '',
              ps.map((p) => {
                const s = d.series[p.seriesIndex]!
                const raw = s.values[i] ?? 0
                return { color: typeof p.color === 'string' ? p.color : pal(p.seriesIndex), label: s.name, value: `${totals[i] ? pct(raw / totals[i]!, lang) : '—'} · ${s.fmt(raw)}` }
              }),
            )
          },
        },
        xAxis: catAxis(true),
        yAxis: { type: 'value', min: 0, max: 1, interval: 0.25, axisLabel: { formatter: (x: number) => `${Math.round(x * 100)}%` } },
        series: d.series.map((s, i) => ({
          name: s.name,
          type: 'bar',
          stack: 'share',
          data: s.values.map((x, j) => (totals[j] ? Math.max(0, x) / totals[j]! : 0)),
          barMaxWidth: 34,
          itemStyle: { color: pal(i), borderRadius: i === last ? [6, 6, 0, 0] : 0 },
          universalTransition: true,
          emphasis: { focus: 'series' },
        })),
      }
    }

    case 'rose': {
      const s = d.series[0]!
      const data = d.cats.map((name, i) => ({ name, value: s.values[i] ?? 0 })).sort((a, b) => b.value - a.value)
      return {
        tooltip: itemTip,
        // the legend below: a rose often sits in a narrow card, a side legend would run over it
        legend: { show: true, bottom: 0, left: 'center', type: 'plain', itemGap: 8, icon: 'circle', itemWidth: 9, itemHeight: 9, formatter: (n: string) => (n.length > 18 ? `${n.slice(0, 17)}…` : n) },
        series: [
          {
            type: 'pie',
            roseType: 'area',
            radius: ['12%', '80%'],
            center: ['50%', '46%'],
            padAngle: 1.5,
            itemStyle: { borderRadius: 7 },
            label: { show: false },
            labelLine: { show: false },
            emphasis: { scale: true, scaleSize: 5 },
            data: data.map((x, i) => ({ ...x, itemStyle: { color: { type: 'radial', x: 0.5, y: 0.5, r: 0.9, colorStops: [{ offset: 0, color: alpha(pal(i), 0.55) }, { offset: 1, color: pal(i) }] } } })),
            animationType: 'scale',
            animationEasing: 'cubicOut',
            universalTransition: true,
          },
        ],
      }
    }

    case 'treemap': {
      const s = d.series[0]!
      const total = s.values.reduce((a, x) => a + Math.max(0, x), 0)
      const data = d.cats.map((name, i) => ({ name, value: Math.max(0, s.values[i] ?? 0) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)
      return {
        tooltip: itemTip,
        series: [
          {
            type: 'treemap',
            // a little air: a flush card (a table's) has no padding of its own
            left: 6,
            right: 6,
            top: 4,
            bottom: 8,
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            squareRatio: 1.2,
            itemStyle: { borderColor: 'transparent', borderWidth: 0, gapWidth: 3, borderRadius: 10 },
            label: {
              show: true,
              position: 'insideTopLeft',
              padding: [8, 10],
              overflow: 'truncate',
              formatter: (p: { name: string; value: number }) => `{n|${p.name}}\n{v|${s.fmt(p.value, true)}}  {p|${total ? pct(p.value / total, lang) : ''}}`,
              rich: { n: { fontSize: 12, color: '#fff', lineHeight: 17, fontWeight: 500 }, v: { fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 20 }, p: { fontSize: 11, color: 'rgba(255,255,255,0.82)' } },
            },
            upperLabel: { show: false },
            emphasis: { itemStyle: { shadowBlur: 14, shadowColor: alpha(c.primary, 0.35) }, label: { show: true } },
            data: data.map((x, i) => ({ ...x, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: pal(i) }, { offset: 1, color: alpha(pal(i), 0.78) }] } } })),
            animationDurationUpdate: 500,
          },
        ],
      }
    }

    case 'radial': {
      const s = d.series[0]!
      const rows = d.cats.map((name, i) => ({ name, value: s.values[i] ?? 0 })).sort((a, b) => b.value - a.value)
      const max = Math.max(1, ...rows.map((r) => r.value))
      return {
        tooltip: itemTip,
        polar: { radius: ['16%', '92%'], center: ['50%', '54%'] },
        angleAxis: { type: 'value', max: max * 1.08, startAngle: 90, show: false },
        radiusAxis: {
          type: 'category',
          data: rows.map((r) => r.name),
          inverse: true,
          z: 10,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: c.ink2, fontSize: 11, interval: 0, margin: 6, formatter: (n: string) => (n.length > 14 ? `${n.slice(0, 13)}…` : n) },
        },
        series: [
          {
            type: 'bar',
            coordinateSystem: 'polar',
            roundCap: true,
            barWidth: Math.max(6, Math.min(16, 140 / rows.length)),
            showBackground: true,
            backgroundStyle: { color: alpha(c.ink3, c.dark ? 0.16 : 0.09) },
            data: rows.map((r, i) => ({ name: r.name, value: r.value, itemStyle: { color: pal(i) } })),
            label: { show: rows.length <= 8, position: 'end', color: c.ink2, fontSize: 11, formatter: (p: { value: number }) => s.fmt(p.value, true) },
            universalTransition: true,
          },
        ],
      }
    }

    case 'lollipop': {
      const s = d.series[0]!
      const rows = d.cats.map((name, i) => ({ name, value: s.values[i] ?? 0 }))
      const color = pal(0)
      // many rows: smaller dots and names, and a value label that would overlap its neighbour is left out
      const many = rows.length > 12
      return {
        grid: { left: 4, right: 56, top: 10, bottom: 4, containLabel: true },
        tooltip: { ...itemTip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps: { dataIndex: number }[]) => { const r = rows[ps[0]?.dataIndex ?? 0]; return r ? tooltipHtml(r.name, [{ color, label: s.name, value: s.fmt(r.value) }]) : '' } },
        xAxis: valAxis(),
        yAxis: { type: 'category', data: rows.map((r) => r.name), inverse: true, axisLabel: { width: 120, overflow: 'truncate', fontSize: many ? 10 : 11, hideOverlap: true } },
        series: [
          { type: 'bar', data: rows.map((r) => r.value), barWidth: 3, itemStyle: { color: hgrad(color, 0.15, 0.7), borderRadius: 2 }, silent: true, universalTransition: true },
          {
            type: 'scatter',
            name: s.name,
            data: rows.map((r) => r.value),
            symbolSize: rows.length > 24 ? 7 : many ? 10 : 14,
            itemStyle: { color, borderColor: c.surface || '#fff', borderWidth: many ? 1.5 : 2.5, shadowBlur: 6, shadowColor: alpha(color, 0.35) },
            label: { show: rows.length <= 24, position: 'right', distance: many ? 5 : 8, color: c.ink2, fontSize: many ? 10 : 11, fontWeight: 600, formatter: (p: { value: number }) => s.fmt(p.value, true) },
            labelLayout: { hideOverlap: true },
            universalTransition: true,
          },
        ],
      }
    }

    case 'radar': {
      const max = Math.max(1, ...d.series.flatMap((s) => s.values))
      return {
        legend: legend ? { ...legendOpt, left: 'center' } : { show: false },
        tooltip: {
          trigger: 'item',
          formatter: (p: { seriesIndex: number; dataIndex: number; name: string; color: unknown }) => {
            const s = d.series.find((x) => x.name === p.name) ?? d.series[0]!
            return tooltipHtml(s.name, d.cats.map((cat, i) => ({ label: cat, value: s.fmt(s.values[i] ?? 0) })))
          },
        },
        radar: {
          indicator: d.cats.map((name) => ({ name: name.length > 14 ? `${name.slice(0, 13)}…` : name, max: max * 1.1 })),
          radius: legend ? '64%' : '70%',
          center: ['50%', legend ? '57%' : '52%'],
          splitNumber: 4,
          shape: 'circle',
          axisName: { color: c.ink3, fontSize: 11 },
          splitLine: { lineStyle: { color: c.grid } },
          splitArea: { areaStyle: { color: [alpha(c.primary, 0.02), alpha(c.primary, 0.05)] } },
          axisLine: { lineStyle: { color: c.grid } },
        },
        series: [
          {
            type: 'radar',
            symbolSize: 5,
            data: d.series.map((s, i) => ({ name: s.name, value: s.values, lineStyle: { width: 2, color: pal(i) }, itemStyle: { color: pal(i) }, areaStyle: { color: alpha(pal(i), 0.16) } })),
            emphasis: { lineStyle: { width: 3 } },
            universalTransition: true,
          },
        ],
      }
    }
  }
}
