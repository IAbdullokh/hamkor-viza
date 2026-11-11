import type { EChartsCoreOption } from 'echarts/core'
import type { Lang } from '@/lib/settings'
import type { ChartSpec, QueryResult, ResultColumn } from '@/spec'
import { tooltipHtml } from './EChartCanvas'
import { formatValue, weekdayRank } from './format'
import type { ChartColors } from './theme'

/**
 * Pure mapping: chart spec + query result → ECharts option, in the Liquid Glass style.
 * Rows come as [dims…, measures…] in the order of spec.x (+ spec.color) then spec.y.
 */
export interface SeriesPoint {
  /** dimension values of the clicked point keyed by field id */
  dims: Record<string, unknown>
  measure: string
}

const OTHER = '__other__'

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

type Meaning = 'lost' | 'won' | 'junk' | 'progress' | 'new'
const MEANINGS: Record<Meaning, string[]> = {
  lost: ['bekor qilindi', "bekor bo'ldi", 'muvaffaqiyatsiz', "o'tkazib yuborildi", "o'tkazib yuborilgan"],
  won: ['sotildi', 'muvaffaqiyatli', 'javob berildi', 'javob berilgan', 'zaklad berildi'],
  junk: ['sifatsiz', 'sifatsiz lead', 'sifatsiz lid'],
  progress: ["aloqa o'rnatildi", 'uchrashuv belgilandi', 'jarayonda'],
  new: ['yangi lid', 'yangi'],
}
const MEANING_OF = new Map(Object.entries(MEANINGS).flatMap(([k, names]) => names.map((n) => [n, k as Meaning] as const)))
/** the palette slot each meaning looks like: a plain series skips it, so blue / green / red / amber mean one thing */
const LOOKALIKE: Record<Meaning, number> = { progress: 0, won: 1, new: 2, lost: 3, junk: 4 }

function meaningOf(name: string): Meaning | undefined {
  return MEANING_OF.get(name.trim().toLowerCase().replace(/[ʻ’`]/g, "'"))
}

const meaningColors = (c: ChartColors): Record<Meaning, string> => ({ lost: c.series[3]!, won: c.good || '#1f9d6b', junk: c.series[4]!, progress: c.primary, new: c.series[2]! })

/** a stage / status name's colour by meaning (lost red, won green, junk amber, in progress the accent, new indigo), else undefined */
export function meaningColor(name: string, c: ChartColors): string | undefined {
  const k = meaningOf(name)
  return k && meaningColors(c)[k]
}

/** the chart colours as CSS variables, for charts drawn as HTML (charts/NativeViews.tsx): theme and accent switches apply */
export const CSS_COLORS: ChartColors = {
  series: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--chart-${i})`),
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  primary: 'var(--primary)',
  good: 'var(--good)',
  surface: 'var(--surface-solid)',
  dark: false,
}

/**
 * Colours for series / slices by name: a stage or status reads by meaning (lost red, won green, junk amber, in progress
 * the accent), every other name takes the palette in order. Plain palette when no name means anything.
 */
export function seriesColors(names: string[], c: ChartColors): string[] {
  const kinds = names.map(meaningOf)
  if (!kinds.some(Boolean)) return names.map((_, i) => c.series[i % c.series.length]!)
  const of = meaningColors(c)
  const taken = new Set(kinds.filter((k): k is Meaning => !!k).map((k) => LOOKALIKE[k]))
  const free = c.series.filter((_, i) => !taken.has(i))
  let n = 0
  return kinds.map((k) => (k ? of[k] : free[n++ % free.length]!))
}

/**
 * The rows a bar / column ranking draws (campaigns, managers, sources): a category with no value at all is a blank row,
 * left out once more than two have one. Dates, hours and weekdays keep their gaps. pointFromClick reads the same rows.
 */
function chartRows(spec: ChartSpec, res: QueryResult): unknown[][] {
  const dimCols = res.columns.filter((col) => col.kind === 'dimension')
  const x = dimCols[0]
  if ((spec.visual !== 'bar' && spec.visual !== 'column') || x?.type !== 'string' || x.format === 'weekday' || x.format === 'hour') return res.rows
  const filled = res.rows.filter((r) => r.slice(dimCols.length).some((v) => typeof v === 'number' && v !== 0))
  return filled.length > 2 ? filled : res.rows
}

export function buildOption(spec: ChartSpec, res: QueryResult, c: ChartColors, lang: Lang, t: (s: string) => string): EChartsCoreOption {
  const nx = spec.x.length ? 1 : 0
  const hasColor = !!spec.color
  const dimCols = res.columns.filter((col) => col.kind === 'dimension')
  const meaCols = res.columns.filter((col) => col.kind === 'measure')
  const xi = 0
  const ci = hasColor ? dimCols.length - 1 : -1
  const fmtM = (col: ResultColumn | undefined, v: unknown, compact = false) => formatValue(v, col?.format, lang, compact)
  const xCol = dimCols[0]
  const legend = spec.options?.legend ?? (meaCols.length > 1 || hasColor)
  const labels = spec.options?.labels ?? false
  const grid = { left: 4, right: 12, top: legend ? 36 : 14, bottom: 4, containLabel: true }
  const legendOpt = legend ? { show: true, top: 0, left: 0, type: 'scroll' } : { show: false }

  // ---------- pie / donut ----------
  if (spec.visual === 'pie' || spec.visual === 'donut') {
    const m = meaCols[0]
    const vi = dimCols.length
    const sorted = [...res.rows].sort((a, b) => (b[vi] as number) - (a[vi] as number))
    const top = sorted.slice(0, 7)
    const rest = sorted.slice(7).reduce((s, r) => s + ((r[vi] as number) ?? 0), 0)
    const data = top.map((r) => ({ name: String(r[0] ?? '—'), value: r[vi] as number }))
    if (rest > 0) data.push({ name: t('Boshqalar'), value: rest })
    const total = data.reduce((s, d) => s + (d.value ?? 0), 0)
    const colors = seriesColors(data.map((d) => d.name), c)
    return {
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; color: string; percent: number }) => tooltipHtml(p.name, [{ color: p.color, label: m?.name ?? '', value: fmtM(m, p.value) }], `${p.percent.toFixed(1)}%`) },
      legend: { show: true, orient: 'vertical', right: 0, top: 'middle', type: 'scroll', formatter: (name: string) => name.length > 18 ? `${name.slice(0, 17)}…` : name },
      series: [
        {
          type: 'pie',
          radius: spec.visual === 'donut' ? ['56%', '82%'] : ['0%', '80%'],
          center: ['34%', '50%'],
          avoidLabelOverlap: true,
          label: spec.visual === 'donut' ? { show: true, position: 'center', formatter: () => `{v|${fmtM(m, total, true)}}\n{l|${m?.name ?? ''}}`, rich: { v: { fontSize: 20, fontWeight: 700, color: c.ink, lineHeight: 26 }, l: { fontSize: 11, color: c.ink3 } } } : { show: labels, color: c.ink2 },
          labelLine: { show: false },
          emphasis: { scale: true, scaleSize: 6, label: spec.visual === 'donut' ? { show: true } : undefined },
          data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i] } })),
          universalTransition: true,
        },
      ],
    }
  }

  // ---------- funnel ----------
  if (spec.visual === 'funnel') {
    let data: { name: string; value: number }[]
    if (nx && meaCols.length === 1) data = res.rows.map((r) => ({ name: String(r[0]), value: r[1] as number }))
    else data = meaCols.map((col, i) => ({ name: col.name, value: (res.rows[0]?.[dimCols.length + i] as number) ?? 0 }))
    // one cut (Bosqich, Manba …) holds parts of one whole: each slice is its share of the total. Measures in a row
    // (lids → qualified → sold) are steps: each is a share of the first.
    const ofTotal = nx === 1 && meaCols.length === 1
    const base = (ofTotal ? data.reduce((s, d) => s + (d.value ?? 0), 0) : data[0]?.value) || 1
    const pctShown = (i: number) => ofTotal || i > 0
    return {
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; color: string; dataIndex: number }) => tooltipHtml(p.name, [{ color: p.color, label: t('Soni'), value: fmtM(meaCols[0], p.value) }], pctShown(p.dataIndex) ? `${((p.value / base) * 100).toFixed(1)}% ${t(ofTotal ? 'jamidan' : 'birinchi bosqichdan')}` : undefined) },
      series: [
        {
          type: 'funnel',
          left: '2%',
          width: '46%',
          top: 6,
          bottom: 6,
          minSize: '22%',
          sort: 'none',
          gap: 3,
          label: {
            show: true,
            position: 'right',
            formatter: (p: { name: string; value: number; dataIndex: number }) => `{n|${p.name}}\n{v|${fmtM(meaCols[0], p.value, true)}}${pctShown(p.dataIndex) ? ` {p|${((p.value / base) * 100).toFixed(0)}%}` : ''}`,
            rich: { n: { color: c.ink2, fontSize: 11, lineHeight: 16 }, v: { color: c.ink, fontSize: 14, fontWeight: 700, lineHeight: 18 }, p: { color: c.ink3, fontSize: 11 } },
          },
          labelLine: { show: true, length: 10, lineStyle: { color: c.grid } },
          itemStyle: { borderRadius: 8 },
          data: data.map((d, i) => ({ ...d, itemStyle: { color: c.series[i % c.series.length], opacity: 1 - i * 0.06 } })),
          universalTransition: true,
        },
      ],
    }
  }

  // ---------- heatmap: x dim × color dim, first measure ----------
  if (spec.visual === 'heatmap') {
    const ord = (a: unknown, b: unknown) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)))
    // weekday labels run Du → Ya, not alphabetically (Ch, Du, Ju …)
    const sortAxis = (vals: unknown[]) => (vals.length && vals.every((v) => weekdayRank(v) >= 0) ? vals.sort((a, b) => weekdayRank(a) - weekdayRank(b)) : vals.sort(ord))
    const xs = sortAxis([...new Set(res.rows.map((r) => r[0]))])
    // reversed: the first value (Du) at the top of the y axis
    const ys = sortAxis([...new Set(res.rows.map((r) => r[1]))]).reverse()
    const vi = dimCols.length
    const data = res.rows.map((r) => [xs.indexOf(r[0]), ys.indexOf(r[1]), r[vi] as number])
    const max = Math.max(1, ...data.map((d) => d[2] as number))
    return {
      tooltip: { position: 'top', formatter: (p: { data: [number, number, number] }) => tooltipHtml(`${formatValue(xs[p.data[0]], xCol?.format, lang)} · ${formatValue(ys[p.data[1]], dimCols[1]?.format, lang)}`, [{ label: meaCols[0]?.name ?? '', value: fmtM(meaCols[0], p.data[2]) }]) },
      grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: xs.map((v) => formatValue(v, xCol?.format, lang)), splitArea: { show: false } },
      yAxis: { type: 'category', data: ys.map((v) => formatValue(v, dimCols[1]?.format, lang)) },
      // no scale bar under the cells: the tooltip gives the number, the cells get the height
      visualMap: { show: false, min: 0, max, calculable: false, inRange: { color: c.dark ? [hexA(c.primary, 0.16), hexA(c.primary, 0.58), c.primary] : [hexA(c.primary, 0.06), hexA(c.primary, 0.45), c.primary] } },
      series: [{ type: 'heatmap', data, itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: hexA(c.primary, 0.4) } } }],
    }
  }

  // ---------- cartesian: line / area / column / stacked / bar / combo ----------
  const horizontal = spec.visual === 'bar'
  const rows = chartRows(spec, res)
  const categories: unknown[] = []
  const catIndex = new Map<string, number>()
  for (const r of rows) {
    const k = String(r[xi])
    if (!catIndex.has(k)) {
      catIndex.set(k, categories.length)
      categories.push(r[xi])
    }
  }
  type S = { name: string; measure: ResultColumn; colorValue?: unknown; data: (number | null)[] }
  const series: S[] = []
  if (hasColor) {
    // pivot: one series per colour value (top 6 by total, rest = "Boshqalar")
    const m = meaCols[0]!
    const vi = dimCols.length
    const totals = new Map<string, number>()
    for (const r of rows) totals.set(String(r[ci]), (totals.get(String(r[ci])) ?? 0) + ((r[vi] as number) ?? 0))
    const keep = new Set([...totals].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k))
    const byKey = new Map<string, S>()
    for (const r of rows) {
      const raw = String(r[ci])
      const k = keep.has(raw) ? raw : OTHER
      let s = byKey.get(k)
      if (!s) byKey.set(k, (s = { name: k === OTHER ? t('Boshqalar') : formatValue(r[ci], dimCols[ci]?.format, lang), measure: m, colorValue: k === OTHER ? undefined : r[ci], data: categories.map(() => null) }))
      const idx = catIndex.get(String(r[xi]))!
      s.data[idx] = (s.data[idx] ?? 0) + ((r[vi] as number) ?? 0)
    }
    const sum = (x: S) => x.data.reduce<number>((a, v) => a + (v ?? 0), 0)
    // biggest series first (legend reads in order of importance), "Boshqalar" always last
    series.push(...[...byKey.values()].sort((a, b) => (a.colorValue === undefined ? 1 : b.colorValue === undefined ? -1 : sum(b) - sum(a))))
  } else {
    meaCols.forEach((m, mi) => {
      const vi = dimCols.length + mi
      const data = categories.map(() => null as number | null)
      for (const r of rows) data[catIndex.get(String(r[xi]))!] = r[vi] as number
      series.push({ name: m.name, measure: m, data })
    })
  }

  const lineSet = new Set(spec.options?.lineMeasures ?? [])
  const isCombo = spec.visual === 'combo'
  const catLabels = categories.map((v) => formatValue(v, xCol?.format, lang))
  // a share (percent measure: qualified ÷ all, ≤ 100%) ends at 100%, not at the rounded 120% (owner 2026-10-26); a
  // percent above 1 (a growth rate) keeps the automatic end
  const shareMax = (col: ResultColumn | undefined) => {
    if (col?.format !== 'percent') return {}
    const mine = series.filter((x) => x.measure.id === col.id)
    const stacked = spec.visual === 'stacked' || (hasColor && spec.visual !== 'combo')
    const peak = categories.reduce<number>((top, _, i) => {
      const vs = mine.map((x) => x.data[i] ?? 0)
      return Math.max(top, stacked ? vs.reduce((a, v) => a + v, 0) : Math.max(0, ...vs))
    }, 0)
    return peak <= 1 && mine.every((x) => x.data.every((v) => v === null || v >= 0)) ? { min: 0, max: 1, interval: 0.25 } : {}
  }
  const valueAxis = (col: ResultColumn | undefined, extra: object = {}) => ({ type: 'value', axisLabel: { formatter: (v: number) => fmtM(col, v, true) }, ...shareMax(col), ...extra })
  // under columns a long name ("Instagram Direct - Открытая линия") is cut, or ECharts hides its neighbours' names
  const cut = (v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)
  const catAxis = { type: 'category', data: catLabels, boundaryGap: spec.visual !== 'line' && spec.visual !== 'area', axisLabel: { hideOverlap: true, formatter: cut } }
  const rightMeasure = isCombo ? meaCols.find((m) => lineSet.has(m.id)) : undefined
  // one series of bars (no colour split): a soft Liquid Glass fill, and a horizontal bar shows its number at the end
  const singleBar = series.length === 1 && !hasColor && (spec.visual === 'bar' || spec.visual === 'column')
  const barLabels = spec.options?.labels ?? (singleBar && horizontal)

  // a stage / status split (Manba × Bosqich) reads by meaning: Bekor qilindi red, Sotildi green
  const palette = hasColor ? seriesColors(series.map((x) => x.name), c) : series.map((_, i) => c.series[i % c.series.length]!)

  // the dashed goal line; its "Maqsad" only when the goal sits clear of the bottom (under 8% of the peak it would cover the bars)
  const goal = spec.options?.goal
  const peak = Math.max(0, ...(series[0]?.data ?? []).map((v) => Math.abs(v ?? 0)))
  const goalLine = goal
    ? {
        symbol: 'none',
        lineStyle: { color: c.ink3, type: [4, 4] },
        label: { show: !(peak > 0 && Math.abs(goal) < peak * 0.08), position: 'insideEndTop', formatter: t('Maqsad'), color: c.ink2, fontSize: 11, distance: 4 },
        data: [{ yAxis: goal }],
      }
    : undefined

  const asLineLabels = (x: S) => (spec.visual === 'line' || spec.visual === 'area' || (isCombo && lineSet.has(x.measure.id)) ? labels : barLabels)

  return {
    grid,
    legend: legendOpt,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: spec.visual === 'line' || spec.visual === 'area' ? 'line' : 'shadow' },
      formatter: (ps: { seriesName: string; value: number; color: string; dataIndex: number; seriesIndex: number }[]) => {
        const first = ps[0]
        if (!first) return ''
        const total = ps.reduce((s, p) => s + (typeof p.value === 'number' ? p.value : 0), 0)
        return tooltipHtml(
          catLabels[first.dataIndex] ?? '',
          ps.map((p) => ({ color: typeof p.color === 'string' ? p.color : c.primary, label: p.seriesName, value: fmtM(series[p.seriesIndex]?.measure, p.value) })),
          (spec.visual === 'stacked' || hasColor) && ps.length > 1 ? `${t('Jami')}: ${fmtM(series[0]?.measure, total)}` : undefined,
        )
      },
    },
    xAxis: horizontal ? valueAxis(meaCols[0]) : catAxis,
    yAxis: horizontal
      ? { ...catAxis, inverse: true, axisLabel: { width: 120, overflow: 'truncate' } }
      : rightMeasure
        ? [valueAxis(meaCols.find((m) => !lineSet.has(m.id))), valueAxis(rightMeasure, { splitLine: { show: false } })]
        : valueAxis(meaCols[0]),
    series: series.map((s, i) => {
      const color = palette[i]!
      const asLine = spec.visual === 'line' || spec.visual === 'area' || (isCombo && lineSet.has(s.measure.id))
      const base = {
        name: s.name,
        data: s.data,
        universalTransition: true,
        emphasis: { focus: 'series' },
        label: { show: asLineLabels(s), position: horizontal ? 'right' : 'top', color: c.ink2, fontSize: 11, formatter: (p: { value: number }) => fmtM(s.measure, p.value, true) },
        animationDelay: (idx: number) => idx * 14,
      }
      if (asLine) {
        return {
          ...base,
          type: 'line',
          yAxisIndex: isCombo && lineSet.has(s.measure.id) ? 1 : 0,
          lineStyle: { width: 2.25, color },
          itemStyle: { color },
          areaStyle: spec.visual === 'area' || (spec.visual === 'line' && series.length === 1) ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: hexA(color, 0.24) }, { offset: 1, color: hexA(color, 0) }] } } : undefined,
          stack: spec.visual === 'area' && hasColor ? 'total' : undefined,
          markLine: i === 0 ? goalLine : undefined,
        }
      }
      return {
        ...base,
        type: 'bar',
        stack: spec.visual === 'stacked' || (hasColor && spec.visual !== 'combo') ? 'total' : undefined,
        itemStyle: {
          color: singleBar
            ? { type: 'linear', x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1, colorStops: horizontal ? [{ offset: 0, color: hexA(color, 0.58) }, { offset: 1, color: hexA(color, 0.95) }] : [{ offset: 0, color: hexA(color, 0.95) }, { offset: 1, color: hexA(color, 0.58) }] }
            : color,
          borderRadius: horizontal ? [2, 6, 6, 2] : spec.visual === 'stacked' || hasColor ? 3 : [6, 6, 2, 2],
        },
        barMaxWidth: horizontal ? 18 : 28,
        markLine: i === 0 ? goalLine : undefined,
      }
    }),
  }
}

/** Map an ECharts click back to dimension values (for drill-down / cross-filter). */
export function pointFromClick(spec: ChartSpec, res: QueryResult, p: { dataIndex: number; seriesIndex?: number; name?: string; seriesName?: string }): SeriesPoint | null {
  const dimCols = res.columns.filter((c) => c.kind === 'dimension')
  if (!dimCols.length) return null
  const dims: Record<string, unknown> = {}
  if (spec.visual === 'pie' || spec.visual === 'donut' || spec.visual === 'funnel') {
    const row = res.rows.find((r) => String(r[0]) === p.name)
    if (!row) return null
    dims[dimCols[0]!.id] = row[0]
    return { dims, measure: spec.y[0] ?? '' }
  }
  const cats: unknown[] = []
  for (const r of chartRows(spec, res)) if (!cats.some((x) => String(x) === String(r[0]))) cats.push(r[0])
  dims[dimCols[0]!.id] = cats[p.dataIndex]
  if (spec.color && dimCols.length > 1) {
    const row = res.rows.find((r) => String(r[0]) === String(cats[p.dataIndex]) && formatValueLoose(r[dimCols.length - 1]) === p.seriesName)
    if (row) dims[dimCols[dimCols.length - 1]!.id] = row[dimCols.length - 1]
  }
  return { dims, measure: spec.y[0] ?? '' }
}

function formatValueLoose(v: unknown): string {
  return String(v)
}
