import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from '@/lib/storage'
import type { ChartSpec, QueryResult, ResultColumn, VisualType } from '@/spec'

/**
 * Chart pencil (✏️): which visual types fit a chart's data, ranked by the data's shape, and the per-dashboard,
 * per-card choice that survives reloads. Works on ChartSpec + QueryResult (dashboard engine) and on any plain
 * ECharts option (the page charts) through a `ChartFrame` — categories × series pulled out of the option.
 */

/** What the data looks like — enough to decide which visuals make sense. */
export interface DataShape {
  /** visual the chart was built with */
  origin: VisualType
  /** dimensions on the category axis (0 = a single number, 2 = split by colour) */
  dims: 0 | 1 | 2
  measures: number
  /** distinct categories on the first dimension */
  cats: number
  /** first dimension is a date / hour / weekday */
  time: boolean
  /** parts of a whole (pie origin or a percent measure) */
  share: boolean
  /** pipeline stages (funnel origin or a stage-like dimension) */
  stages: boolean
  /** any value below zero (no pie / funnel then) */
  negative: boolean
}

export interface RankedVisual {
  visual: VisualType
  recommended: boolean
}

/** Gallery order + labels (Uzbek keys, ru/en in i18n/dict/chart-pencil.ts). */
export const VISUAL_LABELS: Record<VisualType, string> = {
  line: 'Chiziqli',
  area: 'Maydonli',
  column: 'Ustunli',
  stacked: "Qatlamli ustun",
  bar: 'Gorizontal ustun',
  pie: 'Doiraviy',
  donut: 'Halqa (donut)',
  funnel: 'Voronka shakli',
  kpi: 'KPI + ulush',
  table: 'Jadval ko‘rinishi',
  heatmap: 'Issiqlik xaritasi',
  combo: 'Aralash grafik',
  step: "Pog'onali",
  stackedArea: 'Qatlamli maydon',
  stacked100: '100% ulush ustun',
  rose: 'Atirgul',
  treemap: 'Treemap',
  radial: 'Radial ustun',
  lollipop: 'Lolipop',
  radar: 'Radar',
  scorecard: 'Reyting jadvali',
  matrix: 'Rangli matritsa',
  queue: 'Jonli navbat',
  pacing: 'Maqsad trekeri',
  diagnostic: 'Diagnostika kartasi',
}

/** one line under each tile: what the form is good at (the pencil's gallery) */
export const VISUAL_HINTS: Partial<Record<VisualType, string>> = {
  line: "Vaqt bo'yicha o'zgarish",
  area: 'Hajm va trend',
  step: "Sakrab o'zgaruvchi qiymat",
  column: 'Davrlarni solishtirish',
  stacked: 'Tarkib va jami',
  stackedArea: "Tarkib vaqt bo'yicha",
  stacked100: 'Ulushlar nisbati',
  bar: 'Reyting, uzun nomlar',
  lollipop: 'Toza reyting',
  pie: "Butunning qismlari",
  donut: "Qismlar + jami",
  rose: "Qismlar, ta'sirli",
  treemap: "Ko'p qismlar maydonda",
  radial: 'Reyting doirada',
  funnel: 'Bosqichlar',
  heatmap: 'Jadval rangda',
  radar: "Bir nechta o'lchov",
  kpi: 'Jami va ulushlar',
  table: 'Aniq raqamlar',
  combo: 'Ikki o‘lchov',
}

/** forms that show one measure only (a table's first number column) */
export const SINGLE_MEASURE: ReadonlySet<VisualType> = new Set<VisualType>(['pie', 'donut', 'funnel', 'kpi', 'rose', 'treemap', 'radial', 'lollipop'])

const STAGE_RE = /bosqich|etap|этап|stage|voronka|воронк|funnel|status/i

/**
 * Visuals that can show this data, best first. The first two are "Tavsiya".
 * share → donut, pie, horizontal bar, kpi · time → line, area, column · ranking → bar, column ·
 * stages → funnel, bar · two dimensions → stacked, heatmap.
 */
export function rankVisuals(s: DataShape): RankedVisual[] {
  if (s.dims === 0) return s.origin === 'kpi' ? [{ visual: 'kpi', recommended: true }] : []
  // a table's single-measure forms draw its first number column
  const one = s.dims === 1 && (s.measures === 1 || s.origin === 'table')
  const many = s.dims === 2 || s.measures > 1
  const partsOk = one && !s.negative && s.cats >= 2 && s.cats <= 12
  const funnelOk = one && !s.negative && s.cats >= 2 && s.cats <= 10
  const ok: Record<VisualType, boolean> = {
    step: s.time && s.cats >= 2,
    stackedArea: s.time && many && s.cats >= 2 && !s.negative,
    stacked100: many && !s.negative && s.cats >= 2,
    rose: partsOk && s.cats <= 10,
    treemap: one && !s.negative && s.cats >= 2 && s.cats <= 40,
    radial: one && !s.negative && s.cats >= 2 && s.cats <= 12,
    lollipop: one && s.cats >= 2 && s.cats <= 40,
    radar: many && !s.negative && s.cats >= 3 && s.cats <= 12,
    line: s.cats >= 2,
    area: s.cats >= 2,
    column: true,
    stacked: s.dims === 2 || s.measures > 1,
    bar: true,
    pie: partsOk,
    donut: partsOk,
    funnel: funnelOk,
    kpi: one && !s.negative,
    table: true,
    heatmap: s.dims === 2 || (s.origin === 'table' && s.measures > 1 && s.cats >= 2),
    combo: s.origin === 'combo',
    // Bento blocks are chosen in the chart builder / AI tavsiyasi, not offered by the pencil
    scorecard: false,
    matrix: false,
    queue: false,
    pacing: false,
    diagnostic: false,
  }
  let order: VisualType[]
  if (s.dims === 2) order = s.time ? ['stacked', 'heatmap', 'stackedArea', 'stacked100', 'area', 'line', 'step', 'column', 'bar', 'table'] : ['stacked', 'heatmap', 'stacked100', 'column', 'bar', 'radar', 'line', 'area', 'table']
  else if (s.origin === 'table' && s.time) order = ['table', 'line', 'area', 'column', 'step', 'stacked', 'stackedArea', 'heatmap', 'lollipop']
  else if (s.origin === 'table') order = ['table', 'bar', 'lollipop', 'treemap', 'column', 'heatmap', 'stacked100', 'radar', 'radial', 'donut', 'funnel']
  else if (s.stages && funnelOk) order = ['funnel', 'bar', 'lollipop', 'column', 'donut', 'pie', 'kpi', 'table', 'line', 'area']
  else if (s.time) order = ['line', 'area', 'column', 'step', 'stackedArea', 'stacked', 'stacked100', 'bar', 'lollipop', 'table', 'combo', 'kpi', 'donut', 'pie', 'funnel']
  else if (s.share && partsOk) order = ['donut', 'pie', 'bar', 'kpi', 'rose', 'treemap', 'radial', 'lollipop', 'column', 'funnel', 'table', 'line', 'area']
  else if (s.measures > 1) order = ['column', 'stacked', 'stacked100', 'bar', 'radar', 'heatmap', 'combo', 'line', 'area', 'table']
  else order = ['bar', 'column', 'lollipop', 'donut', 'treemap', 'pie', 'radial', 'rose', 'kpi', 'funnel', 'table', 'line', 'area']
  const out = order.filter((v) => ok[v])
  // the chart's own visual always stays in the list, even when the rules would not pick it
  if (!out.includes(s.origin)) out.push(s.origin)
  return out.map((visual, i) => ({ visual, recommended: i < 2 }))
}

/* ---------------- shape from a dashboard chart ---------------- */

const TIME_FORMATS = new Set(['date', 'hour', 'weekday'])

export function shapeFromSpec(spec: ChartSpec, res: QueryResult): DataShape {
  const dimCols = res.columns.filter((c) => c.kind === 'dimension')
  const meaCols = res.columns.filter((c) => c.kind === 'measure')
  const first = dimCols[0]
  const cats = new Set(res.rows.map((r) => String(r[0]))).size
  const vals = res.rows.flatMap((r) => r.slice(dimCols.length)).filter((v): v is number => typeof v === 'number')
  const dims: 0 | 1 | 2 = spec.visual === 'kpi' || !spec.x.length ? 0 : spec.color || (spec.visual === 'table' && spec.x.length > 1) ? 2 : 1
  return {
    origin: spec.visual,
    dims,
    measures: Math.max(1, dims === 2 ? 1 : meaCols.length),
    cats,
    time: !!first && (first.type === 'date' || TIME_FORMATS.has(first.format ?? '')),
    share: spec.visual === 'pie' || spec.visual === 'donut' || meaCols[0]?.format === 'percent',
    stages: spec.visual === 'funnel' || STAGE_RE.test(first?.name ?? ''),
    negative: vals.some((v) => v < 0),
  }
}

/** The spec drawn as another visual. A table keeps every dimension; heatmap needs the colour split. */
export function withVisual(spec: ChartSpec, visual: VisualType): ChartSpec {
  if (visual === spec.visual) return spec
  if (visual === 'table') return { ...spec, visual, x: [...spec.x, ...(spec.color ? [spec.color] : [])], color: undefined }
  if (spec.visual === 'table' && spec.x.length > 1) return { ...spec, visual, x: spec.x.slice(0, 1), color: spec.x[1] }
  return { ...spec, visual, options: visual === 'combo' && !spec.options?.lineMeasures ? { ...spec.options, lineMeasures: spec.y.slice(1) } : spec.options }
}

/* ---------------- frames: data pulled out of a plain ECharts option ---------------- */

export interface ChartFrame {
  origin: VisualType
  categories: string[]
  /** `format`: the source's own number format (a table column's, a chart axis'), for tooltips and labels */
  series: { name: string; values: (number | null)[]; format?: (v: number) => string }[]
}

type AnyObj = Record<string, unknown>
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v])
const num = (v: unknown): number | null => {
  const raw = v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyObj).value : v
  const n = Array.isArray(raw) ? Number(raw[raw.length - 1]) : raw == null || raw === '' ? NaN : Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * Categories × series from an ECharts option, or null when the chart is not a plain one we can redraw
 * (heatmaps, gauges, scatter, datasets, two value axes, mixed axes).
 */
export function frameFromOption(option: unknown): ChartFrame | null {
  if (!option || typeof option !== 'object') return null
  const o = option as AnyObj
  if (o.dataset) return null
  const series = arr(o.series).filter((s): s is AnyObj => !!s && typeof s === 'object')
  if (!series.length) return null
  const types = new Set(series.map((s) => String(s.type ?? '')))

  if (types.size === 1 && (types.has('pie') || types.has('funnel'))) {
    if (series.length !== 1) return null
    const s = series[0]!
    const data = arr(s.data).filter((d): d is AnyObj => !!d && typeof d === 'object')
    if (!data.length) return null
    const radius = arr(s.radius)
    const inner = radius.length > 1 ? parseFloat(String(radius[0])) : 0
    return {
      origin: types.has('funnel') ? 'funnel' : inner > 0 ? 'donut' : 'pie',
      categories: data.map((d) => String(d.name ?? '—')),
      series: [{ name: String(s.name ?? ''), values: data.map((d) => num(d)) }],
    }
  }

  if ([...types].some((t) => t !== 'bar' && t !== 'line')) return null
  const xs = arr(o.xAxis) as AnyObj[]
  const ys = arr(o.yAxis) as AnyObj[]
  if (xs.length !== 1 || ys.length !== 1) return null
  const horizontal = ys[0]?.type === 'category'
  const cat = horizontal ? ys[0]! : xs[0]!
  if (cat.type !== 'category' || !Array.isArray(cat.data)) return null
  const categories = (cat.data as unknown[]).map((c) => String(c && typeof c === 'object' ? (c as AnyObj).value : c))
  if (!categories.length) return null
  const lines = series.filter((s) => s.type === 'line')
  const stacked = series.length > 1 && series.every((s) => s.stack != null && s.type === 'bar')
  const origin: VisualType = horizontal ? 'bar' : types.size > 1 ? 'combo' : lines.length ? (lines.some((s) => s.areaStyle) && series.length > 1 ? 'area' : 'line') : stacked ? 'stacked' : 'column'
  return {
    origin,
    categories,
    series: series.map((s, i) => ({ name: String(s.name ?? `#${i + 1}`), values: categories.map((_, j) => num(arr(s.data)[j])) })),
  }
}

/**
 * A heatmap (x categories × y categories, data [x, y, value]) as categories × series: one series per row of the map.
 * Null for anything else.
 */
export function frameFromHeatmap(option: unknown): ChartFrame | null {
  if (!option || typeof option !== 'object') return null
  const o = option as AnyObj
  const series = arr(o.series).filter((s): s is AnyObj => !!s && typeof s === 'object')
  if (series.length !== 1 || series[0]!.type !== 'heatmap') return null
  const x = arr(o.xAxis)[0] as AnyObj | undefined
  const y = arr(o.yAxis)[0] as AnyObj | undefined
  if (!x || !y || !Array.isArray(x.data) || !Array.isArray(y.data)) return null
  const label = (c: unknown) => String(c && typeof c === 'object' ? (c as AnyObj).value : c)
  const categories = (x.data as unknown[]).map(label)
  const rows = (y.data as unknown[]).map(label)
  if (categories.length < 2 || rows.length < 1 || rows.length > 12) return null
  const values = rows.map(() => categories.map(() => 0 as number | null))
  for (const d of arr(series[0]!.data)) {
    const v = d && typeof d === 'object' && !Array.isArray(d) ? (d as AnyObj).value : d
    if (!Array.isArray(v) || v.length < 3) continue
    const xi = Number(v[0])
    const yi = Number(v[1])
    const n = Number(v[2])
    if (values[yi] && xi >= 0 && xi < categories.length && Number.isFinite(n)) values[yi]![xi] = n
  }
  return { origin: 'heatmap', categories, series: rows.map((name, i) => ({ name, values: values[i]! })) }
}

/** a table column as the pencil reads it: its label, its cells, its own number format */
export interface TableColumnData {
  label: string
  values: (string | number | null)[]
  format?: (v: number) => string
  /** a percent / ratio column (its numbers do not add up) */
  percent?: boolean
}

/**
 * A table as categories × series: the first column names the rows, the number columns are the series (counts and
 * sums first, at most 4; percent columns only when there is nothing else). Null when it cannot be drawn: no number
 * column, fewer than 2 or more than 60 rows.
 */
export function frameFromTable(cols: TableColumnData[]): ChartFrame | null {
  const [first, ...rest] = cols
  if (!first || first.values.length < 2 || first.values.length > 60) return null
  const nums = rest.filter((c) => c.values.some((v) => typeof v === 'number') && c.values.every((v) => v === null || typeof v === 'number'))
  const plain = nums.filter((c) => !c.percent)
  const use = (plain.length ? plain : nums).slice(0, 4)
  if (!use.length) return null
  return {
    origin: 'table',
    categories: first.values.map((v) => (v === null || v === '' ? '—' : String(v))),
    series: use.map((c) => ({ name: c.label, values: c.values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)), format: c.format })),
  }
}

const DATEISH = /^(\d{4}-\d{2}(-\d{2})?|\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?|\d{1,2}:\d{2}|\d{1,2}\s+\p{L}{3,}\.?|\p{L}{3,}\.?\s+\d{1,2}|du|se|ch|pa|ju|sh|ya|пн|вт|ср|чт|пт|сб|вс|mon|tue|wed|thu|fri|sat|sun)$/iu

export function shapeFromFrame(f: ChartFrame): DataShape {
  const vals = f.series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  const dateish = f.categories.filter((c) => DATEISH.test(c.trim())).length
  const time = f.origin === 'line' || f.origin === 'area' || dateish >= Math.max(2, f.categories.length * 0.6)
  // several series over time read as several measures (lines); otherwise as a second dimension (stacked, heatmap);
  // a table's number columns are its measures
  const many = f.series.length > 1
  const table = f.origin === 'table'
  return {
    origin: f.origin,
    dims: many && !time && !table ? 2 : 1,
    measures: many && (time || table) ? f.series.length : 1,
    cats: f.categories.length,
    time,
    share: f.origin === 'pie' || f.origin === 'donut',
    stages: f.origin === 'funnel' || STAGE_RE.test(f.series[0]?.name ?? ''),
    negative: vals.some((v) => v < 0),
  }
}

/**
 * A frame as a synthetic spec + result, so `buildOption` draws it in any visual. Each series is a measure; a heatmap
 * reads a colour split instead (one row per category × series).
 */
export function frameToResult(f0: ChartFrame, visual: VisualType, measure?: string): { spec: ChartSpec; res: QueryResult } {
  // a single-measure form of a table (or a multi-series chart) draws the measure chosen for it ("Ko'rsatkich"), else the first
  const one = f0.series.find((s) => s.name === measure) ?? f0.series[0]
  const f = (SINGLE_MEASURE.has(visual) || (f0.origin === 'table' && visual === 'bar')) && one ? { ...f0, series: [one] } : f0
  const split = visual === 'heatmap' && f.series.length > 1
  const dim = (id: string): ResultColumn => ({ id, name: '', kind: 'dimension', type: 'string' })
  const measures: ResultColumn[] = split ? [{ id: 'v', name: '', kind: 'measure', type: 'number' }] : f.series.map((s, i) => ({ id: `m${i}`, name: s.name, kind: 'measure', type: 'number' }))
  const columns: ResultColumn[] = [dim('x'), ...(split ? [dim('s')] : []), ...measures]
  const rows: unknown[][] = split
    ? f.categories.flatMap((c, j) => f.series.map((s) => [c, s.name, s.values[j] ?? 0]))
    : f.categories.map((c, j) => [c, ...f.series.map((s) => s.values[j] ?? 0)])
  // parts of a whole have no order of their own: as bars they read best biggest first
  if (!split && (f.origin === 'pie' || f.origin === 'donut') && (visual === 'bar' || visual === 'column')) rows.sort((a, b) => (b[1] as number) - (a[1] as number))
  // a ranking reads biggest first (not a funnel's stages, not a time axis)
  else if (!split && f.series.length === 1 && (visual === 'lollipop' || (f.origin === 'table' && visual === 'bar')) && !shapeFromFrame(f0).time && !shapeFromFrame(f0).stages)
    rows.sort((a, b) => (b[1] as number) - (a[1] as number))
  const spec: ChartSpec = {
    version: 1,
    id: 'frame',
    title: '',
    dataset: '',
    visual,
    x: ['x'],
    y: measures.map((m) => m.id),
    color: split ? 's' : undefined,
    filters: [],
    options: { labels: visual === 'bar' && f.series.length === 1 && f.categories.length <= 12, lineMeasures: visual === 'combo' ? measures.slice(1).map((m) => m.id) : undefined },
  }
  return { spec, res: { columns, rows, sql: '', scanned: rows.length, ms: 0 } }
}

/** Option tweaks for the gallery's mini previews: no legend, axes, labels, tooltip or animation. */
export function miniOption(opt: Record<string, unknown>): Record<string, unknown> {
  const axis = (a: unknown) => arr(a).map((x) => ({ ...(x as AnyObj), axisLabel: { show: false }, splitLine: { show: false }, axisTick: { show: false }, axisLine: { show: false } }))
  const out: Record<string, unknown> = { ...opt, legend: { show: false }, tooltip: { show: false }, animation: false }
  if (opt.xAxis) out.xAxis = axis(opt.xAxis)
  if (opt.yAxis) out.yAxis = axis(opt.yAxis)
  if (opt.grid) out.grid = { left: 2, right: 2, top: 4, bottom: 2, containLabel: false }
  if (opt.visualMap) out.visualMap = { ...(opt.visualMap as AnyObj), show: false }
  if (opt.radar) out.radar = { ...(opt.radar as AnyObj), axisName: { show: false }, radius: '84%', center: ['50%', '52%'] }
  if (opt.polar) out.polar = { ...(opt.polar as AnyObj), radius: ['10%', '96%'], center: ['50%', '50%'] }
  if (opt.radiusAxis) out.radiusAxis = { ...(opt.radiusAxis as AnyObj), axisLabel: { show: false } }
  out.series = arr(opt.series).map((s) => {
    const x = s as AnyObj
    const base = { ...x, label: { show: false }, labelLine: { show: false }, markLine: undefined, emphasis: { disabled: true } }
    if (x.type === 'pie') return { ...base, center: ['50%', '50%'], radius: x.roseType ? ['8%', '94%'] : arr(x.radius)[0] === '0%' ? ['0%', '88%'] : ['52%', '88%'] }
    if (x.type === 'funnel') return { ...base, left: '10%', width: '80%', top: 2, bottom: 2 }
    if (x.type === 'treemap') return { ...base, itemStyle: { ...(x.itemStyle as AnyObj), gapWidth: 2, borderRadius: 5 } }
    if (x.type === 'scatter') return { ...base, symbolSize: 7, itemStyle: { ...(x.itemStyle as AnyObj), borderWidth: 1.5, shadowBlur: 0 } }
    return base
  })
  return out
}

/* ---------------- persistence: per dashboard, per card ---------------- */

const PREFIX = 'nazar.visual.'
const listeners = new Set<() => void>()
const mem = new Map<string, VisualType | null>()

export const visualKey = (dashboard: string, card: string) => `${PREFIX}${dashboard}::${card}`

export function readVisual(dashboard: string, card: string): VisualType | null {
  const k = visualKey(dashboard, card)
  if (!mem.has(k)) mem.set(k, readLocal<VisualType | null>(k, null))
  return mem.get(k)!
}

/** null = back to the chart's own visual ("Asl holiga qaytarish"). */
export function writeVisual(dashboard: string, card: string, visual: VisualType | null): void {
  const k = visualKey(dashboard, card)
  mem.set(k, visual)
  if (visual) writeLocal(k, visual)
  else
    try {
      localStorage.removeItem(k)
    } catch {
      // storage blocked: the choice lives for this tab only
    }
  listeners.forEach((l) => l())
}

/** Forget the in-memory copy (tests; a reload does the same). */
export function _resetVisualCache(): void {
  mem.clear()
}

export function useVisualChoice(dashboard: string, card: string): [VisualType | null, (v: VisualType | null) => void] {
  const v = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => readVisual(dashboard, card),
    () => readVisual(dashboard, card),
  )
  return [v, (next) => writeVisual(dashboard, card, next)]
}
