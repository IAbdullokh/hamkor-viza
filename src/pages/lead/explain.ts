import { dayKey, type DateRange } from '@/data/range'
import type { Lead } from '@/data/types'
import type { Multi } from '@/kit/filters'
import type { FieldDef, FilterItem, FilterValue } from '@/features/livefilters/fields'
import type { LeadModel, MetricKey } from './model'

/**
 * How a lead page KPI card's number is computed (owner, 2026-11-09: «Sifatli ariza 3 311 — where do we take this number?»
 * and Nova guessed): built from the SAME predicates the card counts with (leadModel TEST / count) over the SAME leads the
 * card got, so the definition can never drift from the number. KpiGrid hands it to the card (StatCard `explain`), the
 * block chat sends it as the block's `metric` and Nova's metric_definition reads it. The words are for the model (English).
 */

export interface MetricFilter {
  field: string
  label: string
  values: string[]
  exclude?: boolean
}

export interface MetricFilterText {
  field: string
  label: string
  value: string
}

export interface MetricFilters {
  /** the page's own filter bar (Mas'ul, Bosqich, Manba) — only the ones with values */
  page: MetricFilter[]
  /** filters added with "+ Filtr" that have a value now */
  added: MetricFilterText[]
  /** the dashboard's hidden filters (Studio only): every page's data is narrowed by them before anything is counted */
  hidden: MetricFilterText[]
}

export interface BreakdownItem {
  reason: string
  label: string
  count: number
  stages?: { name: string; count: number }[]
}

export interface MetricDefinition {
  key: string
  label: string
  shown: string
  value: number
  unit: 'count' | 'pct'
  entity: 'leads'
  date: { field: 'created'; from: string; to: string }
  rule: string
  basis: 'ever' | 'now' | null
  ratio: { num: { key: string; label: string; value: number }; den: { key: string; label: string; value: number } } | null
  filters: MetricFilters
  breakdown: BreakdownItem[]
  now_in: { stage: string; count: number }[]
  rows: number
}

/** the metric's own name (the count card that shows it) */
export const METRIC_LABELS: Record<MetricKey, string> = {
  umumiy: 'Umumiy lid',
  jarayonda: 'Jarayonda',
  sifatli: 'Sifatli lid',
  belg: 'Tashrif belgilandi',
  buy: 'Tashrif buyurdi',
  sifatsiz: 'Sifatsiz lid',
  bekor: "Bekor bo'ldi",
  zvonok: "Qo'ng'iroq",
}

/** what each metric counts (model.ts TEST) and whether it is a stage ever reached or the stage a lead is in now */
const RULES: Record<MetricKey, { rule: string; basis: 'ever' | 'now' | null }> = {
  umumiy: { rule: 'every lead created in the period (after the filters below)', basis: null },
  jarayonda: {
    rule: 'leads created in the period whose CURRENT stage is an in-process one (the new / contact / qualified / booked stage groups of the project setup); a lead that moved on or was lost is not counted',
    basis: 'now',
  },
  sifatli: {
    rule: 'leads created in the period that EVER reached one of the stages the owner chose as «Sifatli lid» in the project setup (seen in the stage history, or the lead stands in it now), or whose deal reached a chosen deal stage, or whose visit was booked; leads later lost or junked still count',
    basis: 'ever',
  },
  belg: {
    rule: 'leads created in the period with a visit booked: the booked stage / field / deal stage chosen in the project setup was ever reached (or the visit happened) — independent of the current stage',
    basis: 'ever',
  },
  buy: {
    rule: 'leads created in the period that ever reached the visited / success stage chosen in the project setup (or whose deal reached a chosen deal stage)',
    basis: 'ever',
  },
  sifatsiz: { rule: 'leads created in the period whose CURRENT stage is a junk («Sifatsiz») stage', basis: 'now' },
  bekor: { rule: "leads created in the period whose CURRENT stage is a lost stage, except archived ones («Sandiq» / «Arxiv»)", basis: 'now' },
  zvonok: { rule: 'leads created in the period whose source is one of the call sources of the project', basis: null },
}

const MAX_STAGES = 15
const MAX_NOW = 12

function counted(map: Map<string, number>, max: number): { name: string; count: number }[] {
  return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, max)
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

/**
 * Why each qualified lead counts (SnapshotBuilder.QualifiedProof → lead.qualified_by / qualified_ts): a chosen stage seen
 * in its stage history (with the time), the chosen stage it stands in now (no time), its deal's stage, a booked visit;
 * "unknown" = a snapshot built before the proof existed.
 */
export function qualifiedBreakdown(leads: readonly Lead[]): BreakdownItem[] {
  const history = new Map<string, number>()
  const current = new Map<string, number>()
  let deal = 0
  let booked = 0
  let unknown = 0
  for (const l of leads) {
    const by = l.qualified_by
    if (!by) unknown++
    else if (by === '@deal') deal++
    else if (by === '@booked') booked++
    else if (l.qualified_ts) bump(history, by)
    else bump(current, by)
  }
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)
  const out: BreakdownItem[] = []
  if (history.size) out.push({ reason: 'stage_history', label: 'reached a chosen stage (stage history)', count: sum(history), stages: counted(history, MAX_STAGES) })
  if (current.size) out.push({ reason: 'current_stage', label: 'stands in a chosen stage now (no history move seen)', count: sum(current), stages: counted(current, MAX_STAGES) })
  if (deal) out.push({ reason: 'deal_stage', label: 'its deal reached a chosen deal stage', count: deal })
  if (booked) out.push({ reason: 'visit_booked', label: 'a visit was booked', count: booked })
  if (unknown) out.push({ reason: 'unknown', label: 'qualified, but the data carries no proof of which rule (demo data, or data built before the proof was kept)', count: unknown })
  return out
}

/** the counted leads by one key: every lead in exactly one item, so the items add up to the count */
function breakdownBy(leads: readonly Lead[], reason: 'stage' | 'source', keyOf: (l: Lead) => string): BreakdownItem[] {
  const m = new Map<string, number>()
  for (const l of leads) bump(m, keyOf(l) || 'Belgilanmagan')
  const all = [...m].map(([label, count]) => ({ reason, label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  if (all.length <= MAX_STAGES) return all
  const rest = all.slice(MAX_STAGES - 1).reduce((s, x) => s + x.count, 0)
  return [...all.slice(0, MAX_STAGES - 1), { reason: 'other', label: `${all.length - MAX_STAGES + 1} more`, count: rest }]
}

/** a "+ Filtr" value in words (fields.ts FilterValue) — '' when the filter is not on */
export function filterValueText(v: FilterValue | undefined): string {
  if (!v) return ''
  if (v.values?.length) return (v.exclude ? 'not ' : '') + v.values.join(', ')
  if (v.from || v.to) return `${v.from ?? '…'} – ${v.to ?? '…'}`
  if (Number.isFinite(v.min) || Number.isFinite(v.max)) return `${Number.isFinite(v.min) ? v.min : '…'} – ${Number.isFinite(v.max) ? v.max : '…'}`
  if (v.q?.trim()) return `contains "${v.q.trim()}"`
  if (typeof v.is === 'boolean') return v.is ? 'yes' : 'no'
  return ''
}

/** added / hidden filters that are on, in words */
export function liveFilterTexts(items: readonly FilterItem[], value: (item: FilterItem) => FilterValue | undefined, byKey?: Map<string, FieldDef>): MetricFilterText[] {
  const out: MetricFilterText[] = []
  for (const it of items) {
    const text = filterValueText(value(it))
    if (text) out.push({ field: it.field, label: byKey?.get(it.field)?.label ?? it.field, value: text })
  }
  return out
}

/** the page's own multi filters that have values */
export function pageFilterList(multi: Record<string, Multi>, labels: Record<string, string>): MetricFilter[] {
  return Object.entries(multi)
    .filter(([, m]) => m.values.length > 0)
    .map(([field, m]) => ({ field, label: labels[field] ?? field, values: [...m.values], ...(m.exclude ? { exclude: true } : {}) }))
}

export const NO_METRIC_FILTERS: MetricFilters = { page: [], added: [], hidden: [] }

/**
 * One KPI card's definition over the leads the card counts (already narrowed by the period and every filter): its value
 * is exactly the card's (count, or numerator ÷ denominator), the breakdown adds up to the count (of the numerator).
 */
export function explainLeadKpi(
  card: { label: string; num: MetricKey; den?: MetricKey },
  leads: readonly Lead[],
  ctx: { range: DateRange; model: Pick<LeadModel, 'TEST' | 'count' | 'leadStage'>; shown?: string; filters?: MetricFilters; callSources?: readonly string[] },
): MetricDefinition {
  const { TEST, count, leadStage } = ctx.model
  const c = count(leads as Lead[])
  const num = c[card.num]
  const den = card.den ? c[card.den] : 0
  const value = card.den ? (den ? num / den : 0) : num
  const hits = leads.filter(TEST[card.num])
  const breakdown =
    card.num === 'sifatli' ? qualifiedBreakdown(hits) : card.num === 'zvonok' ? breakdownBy(hits, 'source', (l) => l.source) : breakdownBy(hits, 'stage', leadStage)
  const now = new Map<string, number>()
  for (const l of hits) bump(now, leadStage(l) || 'Belgilanmagan')
  const { rule, basis } = RULES[card.num]
  const calls = card.num === 'zvonok' && ctx.callSources?.length ? ` (${ctx.callSources.join(', ')})` : ''
  return {
    key: card.den ? `lead.${card.num}/${card.den}` : `lead.${card.num}`,
    label: card.label,
    shown: ctx.shown ?? card.label,
    value,
    unit: card.den ? 'pct' : 'count',
    entity: 'leads',
    date: { field: 'created', from: dayKey(ctx.range.from), to: dayKey(Math.max(ctx.range.from, ctx.range.to - 1)) },
    rule: card.den ? `${METRIC_LABELS[card.num]} ÷ ${METRIC_LABELS[card.den]}. Numerator: ${rule}${calls}. Denominator: ${RULES[card.den].rule}` : rule + calls,
    basis,
    ratio: card.den
      ? { num: { key: `lead.${card.num}`, label: METRIC_LABELS[card.num], value: num }, den: { key: `lead.${card.den}`, label: METRIC_LABELS[card.den], value: den } }
      : null,
    filters: ctx.filters ?? NO_METRIC_FILTERS,
    breakdown,
    now_in: counted(now, MAX_NOW).map(({ name, count: n }) => ({ stage: name, count: n })),
    rows: c.umumiy,
  }
}
