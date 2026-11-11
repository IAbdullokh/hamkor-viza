import type { ChartColors } from '@/charts/theme'

/**
 * ECharts per look, in two layers on top of the Liquid Glass base theme (charts/theme.ts):
 *  - `<look>Chart` (DSVariant.chartTheme): the registered theme — bar width / radius, line weight, grid line visibility,
 *    axis type face. The series colours themselves are the look's --chart-1..8 tokens (looks.css).
 *  - `<look>Option` (DSVariant.option): a pass over each chart's own option right before setOption, for what a theme
 *    cannot override because the chart builders set it explicitly (area fills, bar fills): Minimal drops every area
 *    fill, Midnight paints bars with a neon gradient and gives lines a glow, Bento / Glass Pro deepen the area fills.
 * Both are pure, so the look tests pin them.
 */
type Theme = Record<string, unknown>
type Variant = (c: ChartColors, base: Theme) => Theme
type Opt = Record<string, unknown>
export type OptionPatch = (opt: Opt, c: ChartColors) => Opt

const merge = (base: Theme, key: string, patch: Record<string, unknown>): Record<string, unknown> => ({ ...(base[key] as Record<string, unknown>), ...patch })

const MONO = `ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace`
const SERIF = `'New York', 'Iowan Old Style', Georgia, ui-serif, serif`

/** Bento: chunky fully rounded bars, thick smooth lines, no grid lines at all (the tile is the frame) */
export const bentoChart: Variant = (c, base) => ({
  ...base,
  valueAxis: merge(base, 'valueAxis', { splitLine: { show: false } }),
  bar: { barMaxWidth: 34, itemStyle: { borderRadius: [10, 10, 10, 10] } },
  line: { symbol: 'circle', symbolSize: 7, showSymbol: false, smooth: 0.4, lineStyle: { width: 3 } },
  pie: { itemStyle: { borderColor: c.surface, borderWidth: 3, borderRadius: 10 } },
})

/** Midnight: neon lines with a glow, slim bars, solid dim grid, mono axis labels */
export const midnightChart: Variant = (c, base) => {
  const axis = (k: string) =>
    merge(base, k, {
      axisLabel: { ...(base[k] as { axisLabel?: object }).axisLabel, color: c.ink3, fontFamily: MONO, fontSize: 10.5 },
      splitLine: { lineStyle: { color: c.grid, type: 'solid' } },
    })
  return {
    ...base,
    valueAxis: axis('valueAxis'),
    categoryAxis: { ...axis('categoryAxis'), splitLine: { show: false } },
    line: { symbol: 'circle', symbolSize: 5, showSymbol: false, smooth: 0.25, lineStyle: { width: 2, shadowBlur: 12, shadowColor: 'rgba(34, 211, 238, 0.45)' } },
    bar: { barMaxWidth: 16, itemStyle: { borderRadius: [3, 3, 0, 0] } },
    pie: { itemStyle: { borderColor: c.surface, borderWidth: 2, borderRadius: 3 } },
  }
}

/** Minimal: hairline straight lines, square narrow bars, no grid — only a hairline baseline, serif labels */
export const minimalChart: Variant = (c, base) => ({
  ...base,
  textStyle: { ...(base.textStyle as object), fontFamily: SERIF },
  valueAxis: merge(base, 'valueAxis', { splitLine: { show: false } }),
  categoryAxis: merge(base, 'categoryAxis', { axisLine: { show: true, lineStyle: { color: c.axis, width: 1 } } }),
  line: { symbol: 'circle', symbolSize: 4, showSymbol: false, smooth: false, lineStyle: { width: 1.5 } },
  bar: { barMaxWidth: 18, itemStyle: { borderRadius: 0 } },
  pie: { itemStyle: { borderColor: c.surface, borderWidth: 1.5, borderRadius: 0 } },
})

/** Glass Pro: soft glowing lines, pill bars, dashed grid of the base */
export const glassProChart: Variant = (c, base) => ({
  ...base,
  line: { symbol: 'circle', symbolSize: 6, showSymbol: false, smooth: 0.45, lineStyle: { width: 2.5, shadowBlur: 8, shadowColor: c.dark ? 'rgba(0,0,0,0.4)' : 'rgba(80, 70, 200, 0.22)' } },
  bar: { barMaxWidth: 26, itemStyle: { borderRadius: [12, 12, 4, 4] } },
  pie: { itemStyle: { borderColor: c.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)', borderWidth: 2, borderRadius: 8 } },
})

/* ── option passes ─────────────────────────────────────────────────────────────────────────────────────── */

/** #rgb / #rrggbb + alpha → rgba(); anything else (rgb(), names, gradients) comes back as is */
export function withAlpha(color: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const h = m[1]!.length === 3 ? [...m[1]!].map((x) => x + x).join('') : m[1]!
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const vGradient = (top: string, bottom: string) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }] })

/** each series object through `f` (with the palette colour it gets by its index); `series` may be one object or a list */
function mapSeries(opt: Opt, c: ChartColors, f: (s: Opt, color: string) => Opt): Opt {
  const raw = opt.series
  if (!raw || typeof raw !== 'object') return opt
  const list = (Array.isArray(raw) ? raw : [raw]) as unknown[]
  const out = list.map((s, i) => {
    if (!s || typeof s !== 'object') return s
    const so = s as Opt
    const own = (so.itemStyle as Opt | undefined)?.color ?? (so.lineStyle as Opt | undefined)?.color ?? so.color
    return f(so, typeof own === 'string' ? own : (c.series[i % c.series.length] ?? c.primary))
  })
  return { ...opt, series: Array.isArray(raw) ? out : out[0] }
}

/** a bar series that colours its own data items (one colour per bar) keeps its colours */
const ownItemColors = (s: Opt) => Array.isArray(s.data) && s.data.some((d) => !!d && typeof d === 'object' && !!(d as Opt).itemStyle)

/** Minimal: lines only — no area fill under any line, 1.5px strokes */
export const minimalOption: OptionPatch = (opt, c) =>
  mapSeries(opt, c, (s) => (s.type === 'line' ? { ...s, areaStyle: undefined, lineStyle: { ...(s.lineStyle as Opt | undefined), width: 1.5 } } : s))

/** Midnight: bars fade from the neon colour into the night, lines glow in their own colour */
export const midnightOption: OptionPatch = (opt, c) =>
  mapSeries(opt, c, (s, color) => {
    if (s.type === 'bar' && !ownItemColors(s) && typeof (s.itemStyle as Opt | undefined)?.color !== 'object')
      return { ...s, itemStyle: { ...(s.itemStyle as Opt | undefined), color: vGradient(color, withAlpha(color, 0.18)), shadowBlur: 10, shadowColor: withAlpha(color, 0.35) } }
    if (s.type === 'line') return { ...s, lineStyle: { ...(s.lineStyle as Opt | undefined), shadowBlur: 14, shadowColor: withAlpha(color, 0.7) } }
    return s
  })

/** Bento / Glass Pro: a fuller area under a filled line (the builders' fill is a faint 24% fade) */
const deepArea =
  (top: number): OptionPatch =>
  (opt, c) =>
    mapSeries(opt, c, (s, color) => (s.type === 'line' && s.areaStyle ? { ...s, areaStyle: { color: vGradient(withAlpha(color, top), withAlpha(color, 0.02)) } } : s))
export const bentoOption = deepArea(0.42)
export const glassProOption = deepArea(0.32)

/**
 * Klassik (the earlier Data365 dashboard): Manrope axis labels, smooth 2.5px lines over a deep fill (52% → 3%, as its
 * own wave cards), bars with softly rounded tops, a dashed light grid.
 */
export const klassikChart: Variant = (c, base) => {
  const axis = (k: string) =>
    merge(base, k, { axisLabel: { ...(base[k] as { axisLabel?: object }).axisLabel, color: c.ink3, fontFamily: `'Manrope', 'Inter', system-ui, sans-serif`, fontSize: 11 } })
  return {
    ...base,
    categoryAxis: axis('categoryAxis'),
    valueAxis: { ...axis('valueAxis'), splitLine: { show: true, lineStyle: { color: c.grid, type: 'dashed' } } },
    bar: { barMaxWidth: 26, itemStyle: { borderRadius: [6, 6, 0, 0] } },
    line: { symbol: 'circle', symbolSize: 6, showSymbol: false, smooth: 0.45, lineStyle: { width: 2.5 } },
  }
}
export const klassikOption = deepArea(0.5)

