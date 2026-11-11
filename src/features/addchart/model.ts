import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { readLocal, writeLocal } from '@/lib/storage'
import { slug } from '@/data/datasets'
import { VOCAB } from '@/data/domain'
import type { BlockScope } from '@/features/blockedit/context'
import type { ChartSpec, FilterSpec, OwnMeasure, VisualType } from '@/spec'

/**
 * "Grafik qo'shish" (owner, 2026-10-24: "I should be able to add any chart that I want"): a chart added to a dashboard
 * page is a few settings over the page's own data — dataset, measure, one cut, a chart form, a name — turned into a
 * normal ChartSpec (src/spec) and drawn by charts/ChartView with the query engine (data/query.ts). Per dashboard,
 * page id → its charts: a live project keeps them on the server (GET/PUT /api/live/{slug}/charts, LiveCharts.cs —
 * the same field rules are checked there), a demo design in this browser.
 */
export interface AddedChart {
  id: string
  title: string
  /** data/datasets.ts id: leads, deals, calls, payments, ads */
  dataset: string
  /** a measure field id of the dataset (Lidlar soni, Konversiya, Sotuvlar summasi …) */
  measure: string
  /** a dimension field id (Manba, Mas'ul, Bosqich, Sana / Hafta / Oy, UTM …); none = one number */
  dim?: string
  visual: VisualType
  /** at most this many categories (biggest first) */
  top?: number
  /** spans the whole row */
  wide?: boolean
  /** a fixed "only these" filter, e.g. Bosqich = Bekor qilindi for a reasons chart */
  filter?: { field: string; values: string[] }
  /** a second cut for "stacked" / "heatmap" (Manba × Bosqich, Soat × Hafta kuni) */
  color?: string
  /** the line measure of a "combo" (response time bars + conversion line) */
  secondMeasure?: string
  /** a dashed "Maqsad" line in the measure's unit (15 minutes, 0.25 = 25%) */
  goal?: number
  /** rows left out, e.g. integration / bot accounts on a manager chart */
  exclude?: { field: string; values: string[] }
  /** more conditions on the rows ("not in these branches", "only these stages") */
  where?: { field: string; op: 'in' | 'not_in'; values: string[] }[]
  /** a table's further cuts after `dim` */
  dims?: string[]
  /** a table's further columns after `measure` */
  measures?: string[]
  /** a date dimension the period counts by; none = the dataset's own date */
  dateField?: string
  /** this block's own measures: a formula over the dataset's fields (`COUNT_IF([Bosqich] IN ("A", "B"))`) */
  calc?: OwnMeasure[]
  /** a diagnostic / pacing card's insight (an AI card's why) and up to 3 short actions */
  note?: string
  steps?: string[]
}
export type PageCharts = Record<string, AddedChart[]>

export const MAX_CHARTS = 40
export const MAX_TITLE = 80
/** dataset ids the server accepts (LiveCharts.Datasets) */
export const DATASETS = ['leads', 'deals', 'calls', 'payments', 'ads', 'attendance', 'expenses'] as const
/** chart forms offered in the builder (the server accepts the block pencil's whole set) */
export const BUILDER_VISUALS: VisualType[] = [
  'line', 'column', 'bar', 'donut', 'funnel', 'table', 'kpi', 'area', 'pie', 'stacked', 'heatmap', 'combo',
  'scorecard', 'matrix', 'queue', 'pacing', 'diagnostic',
]
/** Bento blocks (charts/BentoViews.tsx): pacing / diagnostic / queue read the whole period, no cut needed */
export const BENTO_VISUALS = new Set<VisualType>(['scorecard', 'matrix', 'queue', 'pacing', 'diagnostic'])
const CUTLESS = new Set<VisualType>(['kpi', 'pacing', 'diagnostic', 'queue'])
/** datasets whose records a "Jonli navbat" lists */
export const QUEUE_DATASETS = new Set(['leads', 'calls', 'deals'])
export const MAX_NOTE = 400
export const MAX_STEP = 140
const FIELD_RE = /^[a-z0-9_]{1,64}$/

export const fieldIdOk = (id: string) => FIELD_RE.test(id)

export const newChartId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/** a time cut draws left → right in date order; others biggest first, cut to `top` */
const TIME_DIMS = new Set(['sana', 'hafta', 'oy', 'vaqt', 'soat', 'hafta_kuni', 'yopilgan_sana'])
export const isTimeDim = (dim?: string) => !!dim && TIME_DIMS.has(dim)

/** a person cut: integration / bot accounts are left out of it (isBotAccount) */
export const PERSON_DIMS = new Set(['masul', 'operator'])

/**
 * An integration / telephony / bot account or the unassigned row (mebelmoizvonki, wazzup, telegram_bot, sip, admin,
 * Biriktirilmagan): its hundreds-of-minutes "response times" crush real managers' bars. "Botir" stays — "bot" counts
 * only as a word of its own. The server's ChartRecommend.IsBotAccount is the same rule.
 */
const BOT_RE = /moizvonki|wazzup|(^|[^\p{L}])(bot|sip|admin)([^\p{L}]|$)|^biriktirilmagan$|^unassigned$/iu
export const isBotAccount = (name: unknown): boolean => typeof name === 'string' && name.trim() !== '' && BOT_RE.test(name.trim())

/** a chart that changes which rows count or how they are counted: drawn as asked, never adjusted by the chart checks */
export const hasLogic = (c: Pick<AddedChart, 'where' | 'dims' | 'measures' | 'dateField' | 'calc'>): boolean =>
  !!(c.where?.length || c.dims?.length || c.measures?.length || c.dateField || c.calc?.length)

/** the added chart as a ChartSpec for charts/ChartView */
export function toSpec(c: AddedChart): ChartSpec {
  const filters: FilterSpec[] = c.filter ? [{ field: c.filter.field, op: 'in', values: c.filter.values }] : []
  if (c.exclude?.values.length) filters.push({ field: c.exclude.field, op: 'not_in', values: c.exclude.values })
  for (const w of c.where ?? []) if (w.values.length) filters.push({ field: w.field, op: w.op, values: w.values })
  // a block that needs no cut keeps its own form without one; anything else without a cut is one number
  const kpi = c.visual === 'kpi' || (!c.dim && !CUTLESS.has(c.visual))
  // a second cut only where the form draws one; a line measure only on a combo (and a diagnostic card's second tile)
  const color = !kpi && (c.visual === 'stacked' || c.visual === 'heatmap' || c.visual === 'matrix') && c.color && c.color !== c.dim ? c.color : undefined
  const combo = !kpi && c.visual === 'combo' && !!c.secondMeasure && c.secondMeasure !== c.measure
  const second = combo || (c.visual === 'diagnostic' && !!c.secondMeasure && c.secondMeasure !== c.measure)
  const options: ChartSpec['options'] = {
    ...(combo ? { lineMeasures: [c.secondMeasure!] } : {}),
    ...(!kpi && typeof c.goal === 'number' && Number.isFinite(c.goal) ? { goal: c.goal } : {}),
    ...(c.note ? { note: c.note } : {}),
    ...(c.steps?.length ? { steps: c.steps } : {}),
  }
  return {
    version: 1,
    id: c.id,
    title: c.title,
    dataset: c.dataset,
    visual: kpi ? 'kpi' : c.visual,
    x: kpi || !c.dim ? [] : c.visual === 'table' ? [c.dim, ...(c.dims ?? [])] : [c.dim],
    y: second ? [c.measure, c.secondMeasure!] : c.visual === 'table' ? [c.measure, ...(c.measures ?? [])] : [c.measure],
    color,
    filters,
    ...(c.dateField ? { dateField: c.dateField } : {}),
    ...(c.calc?.length ? { calc: c.calc } : {}),
    options: Object.keys(options).length ? options : undefined,
    // a two-cut chart needs all its rows (the cut × the colour); a time cut keeps every day
    limit: kpi || !c.dim || isTimeDim(c.dim) || color ? undefined : hasLogic(c) ? c.top : (c.top ?? (c.visual === 'table' ? 50 : 12)),
  }
}

/** a block's note / steps as stored: plain text, short, no markup */
export function cleanText(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.trim() && !/[<>]/.test(v) ? v.trim().slice(0, max) : undefined
}
export function cleanSteps(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.map((x) => cleanText(x, MAX_STEP)).filter((x): x is string => !!x).slice(0, 3)
  return out.length ? out : undefined
}

/** a stored list made safe to draw: unknown shapes dropped (old or hand-edited data never breaks a page) */
export function cleanCharts(raw: unknown): PageCharts {
  const out: PageCharts = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [page, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const ok = list.filter(
      (c): c is AddedChart =>
        !!c &&
        typeof c === 'object' &&
        typeof (c as AddedChart).id === 'string' &&
        typeof (c as AddedChart).title === 'string' &&
        (DATASETS as readonly string[]).includes((c as AddedChart).dataset) &&
        typeof (c as AddedChart).measure === 'string' &&
        typeof (c as AddedChart).visual === 'string',
    )
    // a note / steps only as plain short text (a hand-edited or old store never breaks a card)
    if (ok.length) out[page] = ok.slice(0, MAX_CHARTS).map((c) => ({ ...c, note: cleanText(c.note, MAX_NOTE), steps: cleanSteps(c.steps) }))
  }
  return out
}

/* ---------------- storage ---------------- */

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const localKey = (id: string) => `d365.charts.${id}`

export async function loadCharts(scope: BlockScope, signal?: AbortSignal): Promise<PageCharts> {
  if (scope.kind === 'demo') return cleanCharts(readLocal<unknown>(localKey(scope.id), {}))
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/charts`, { headers: { Accept: 'application/json' }, signal })
  return res.ok ? cleanCharts(await res.json()) : {}
}

export async function storeCharts(scope: BlockScope, charts: PageCharts): Promise<void> {
  if (scope.kind === 'demo') return writeLocal(localKey(scope.id), charts)
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/charts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(charts),
  })
  if (!res.ok) throw new Error(`charts ${res.status}`)
}

const CHARTS_EVENT = 'd365:charts-changed'

/** the added charts were stored from outside the page's own list (the project chat, features/novaedit): it shows them */
export function announceCharts(charts: PageCharts): void {
  window.dispatchEvent(new CustomEvent(CHARTS_EVENT, { detail: charts }))
}

export function onChartsChanged(f: (charts: PageCharts) => void): () => void {
  const h = (e: Event) => f((e as CustomEvent<PageCharts>).detail ?? {})
  window.addEventListener(CHARTS_EVENT, h)
  return () => window.removeEventListener(CHARTS_EVENT, h)
}

/* ---------------- quick picks ---------------- */

export type Preset = Omit<AddedChart, 'id'>

const s = slug
const STAGES = VOCAB.sales.stages
const lead = (title: string, measure: string, dim: string | undefined, visual: VisualType, extra?: Partial<Preset>): Preset => ({ title, dataset: 'leads', measure: s(measure), dim: dim && s(dim), visual, ...extra })
const deal = (title: string, measure: string, dim: string | undefined, visual: VisualType, extra?: Partial<Preset>): Preset => ({ title, dataset: 'deals', measure: s(measure), dim: dim && s(dim), visual, ...extra })
const call = (title: string, measure: string, dim: string | undefined, visual: VisualType, extra?: Partial<Preset>): Preset => ({ title, dataset: 'calls', measure: s(measure), dim: dim && s(dim), visual, ...extra })
const pay = (title: string, measure: string, dim: string | undefined, visual: VisualType, extra?: Partial<Preset>): Preset => ({ title, dataset: 'payments', measure: s(measure), dim: dim && s(dim), visual, ...extra })

const LEAD_PICKS: Preset[] = [
  lead("Lidlar kunlar bo'yicha", 'Lidlar soni', 'Sana', 'line', { wide: true }),
  lead("Lidlar manbalar bo'yicha", 'Lidlar soni', 'Manba', 'donut'),
  lead("Mas'ul bo'yicha konversiya", 'Konversiya', "Mas'ul", 'bar'),
  lead('Bosqichlar voronkasi', 'Lidlar soni', 'Bosqich', 'funnel'),
  lead("Bekor bo'lish sabablari grafigi", 'Lidlar soni', 'Sabab', 'bar', { filter: { field: 'bosqich', values: [STAGES.lost] } }),
  lead("Sifatli lidlar haftalar bo'yicha", 'Sifatli lidlar', 'Hafta', 'column'),
  lead("Mas'ul bo'yicha javob vaqti", "O'rtacha javob vaqti", "Mas'ul", 'bar'),
  lead("UTM source bo'yicha", 'Lidlar soni', 'UTM source', 'bar'),
  lead('Konversiya', 'Konversiya', undefined, 'kpi'),
]
const DEAL_PICKS: Preset[] = [
  deal("Sotuvlar summasi oylar bo'yicha", 'Sotuvlar summasi', 'Oy', 'column', { wide: true }),
  deal("Mas'ul bo'yicha sotuv", 'Sotuvlar summasi', "Mas'ul", 'bar'),
  deal("Sdelkalar holati", 'Sdelkalar soni', 'Holat', 'donut'),
  deal("Manba bo'yicha sdelkalar", 'Sdelkalar soni', 'Manba', 'bar'),
  deal("O'rtacha chek", "O'rtacha chek", undefined, 'kpi'),
  deal('Yutish ulushi', 'Yutish ulushi', "Mas'ul", 'bar'),
]
const CALL_PICKS: Preset[] = [
  call("Qo'ng'iroqlar kunlar bo'yicha", "Qo'ng'iroqlar soni", 'Sana', 'line', { wide: true }),
  call("Operator bo'yicha qo'ng'iroqlar", "Qo'ng'iroqlar soni", 'Operator', 'bar'),
  call("Operator bo'yicha javob ulushi", 'Javob ulushi', 'Operator', 'bar'),
  call("Soat bo'yicha qo'ng'iroqlar", "Qo'ng'iroqlar soni", 'Soat', 'column'),
  call("Yo'nalish bo'yicha", "Qo'ng'iroqlar soni", "Yo'nalish", 'donut'),
  call('Propushenniy', 'Propushenniy', undefined, 'kpi'),
]
const PAY_PICKS: Preset[] = [
  pay("Tushum kunlar bo'yicha", 'Tushum', 'Sana', 'column', { wide: true }),
  pay("To'lov usuli bo'yicha", 'Tushum', "To'lov usuli", 'donut'),
]

/** ready charts for a page: its own data first, then the rest of what the snapshot has */
export function quickPicks(page: string): Preset[] {
  const first: Record<string, Preset[]> = { lead: LEAD_PICKS, deal: DEAL_PICKS, calls: CALL_PICKS, hisobot: [...LEAD_PICKS.slice(0, 3), ...DEAL_PICKS.slice(0, 3)] }
  const own = first[page] ?? []
  const rest = [LEAD_PICKS, DEAL_PICKS, CALL_PICKS, PAY_PICKS].flat().filter((p) => !own.includes(p))
  return [...own, ...rest]
}
