import type { Db } from '@/data/db'
import type { SnapshotMeta } from '@/features/projects/types'
import type { AdDay, Deal, Lead, Payment } from '@/data/types'
import { matchMulti, type Multi } from '@/kit/filters'

/**
 * Kunlik hisobot (mountain "Targeted Ads Metrics"): 16 metric rows × days of one month, per section
 * (Jami / Target / custom Manba). Every additive cell keeps the records behind it for drill-downs.
 */

export type BaseKey = 'budget' | 'leads' | 'qual' | 'booked' | 'visited' | 'deals' | 'deals_sum' | 'sales' | 'sales_sum' | 'cancelled' | 'junk'
export type MetricKey = BaseKey | 'qual_cost' | 'qual_conv' | 'meet_conv' | 'roas' | 'customer_cost'
export type Fmt = 'usd' | 'num' | 'pct' | 'som'
export type RecKind = 'lead' | 'deal' | 'payment' | 'ad'

export interface MetricDef {
  key: MetricKey
  label: string
  fmt: Fmt
  computed?: boolean
}

/** Same 16 rows, same order as mountain's METRICS. */
export const METRICS: MetricDef[] = [
  { key: 'budget', label: 'Byudjet ($)', fmt: 'usd' },
  { key: 'leads', label: 'Lidlar soni', fmt: 'num' },
  { key: 'qual', label: 'Maqsadli lidlar soni', fmt: 'num' },
  { key: 'qual_cost', label: 'Maqsadli lid narxi', fmt: 'usd', computed: true },
  { key: 'qual_conv', label: 'Maqsadli lid konversiya', fmt: 'pct', computed: true },
  { key: 'booked', label: 'Uchrashuv belgilandi', fmt: 'num' },
  { key: 'visited', label: "Uchrashuv o'tkazildi", fmt: 'num' },
  { key: 'meet_conv', label: 'Uchrashuv konversiya', fmt: 'pct', computed: true },
  { key: 'deals', label: 'Kelishuvlar soni', fmt: 'num' },
  { key: 'deals_sum', label: 'Kelishuvlar summasi', fmt: 'som' },
  { key: 'sales', label: 'Sotuvlar soni', fmt: 'num' },
  { key: 'sales_sum', label: 'Sotuvlar summasi', fmt: 'som' },
  { key: 'cancelled', label: "Bekor bo'ldi", fmt: 'num' },
  { key: 'junk', label: 'Sifatsiz', fmt: 'num' },
  { key: 'roas', label: 'ROAS', fmt: 'pct', computed: true },
  { key: 'customer_cost', label: 'Mijoz narxi', fmt: 'usd', computed: true },
]

export const BASE_KEYS: BaseKey[] = ['budget', 'leads', 'qual', 'booked', 'visited', 'deals', 'deals_sum', 'sales', 'sales_sum', 'cancelled', 'junk']

export const REC_KIND: Record<BaseKey, RecKind> = {
  budget: 'ad',
  leads: 'lead',
  qual: 'lead',
  booked: 'lead',
  visited: 'lead',
  cancelled: 'lead',
  junk: 'lead',
  deals: 'deal',
  deals_sum: 'deal',
  sales: 'deal',
  sales_sum: 'payment',
}

/** Section colour = a chart token index (1..8), so it follows every design and light/dark. */
export interface SectionDef {
  key: string
  label: string
  color: number
  kind: 'jami' | 'target' | 'source'
  /** CRM lead source name (one of meta.leadSources) */
  source?: string
  custom?: boolean
}

/** Stored in localStorage (d365.hisobot.sections). */
export interface CustomSection {
  id: string
  title: string
  source: string
  color: number
}

export const JAMI: SectionDef = { key: 'jami', label: 'Jami', color: 8, kind: 'jami' }
export const TARGET: SectionDef = { key: 'target', label: 'Target', color: 1, kind: 'target' }

/** Rows that need Meta Ads (budget-based); hidden when the project has no Meta connection. */
export const META_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>(['budget', 'qual_cost', 'roas', 'customer_cost'])
/** rows that only exist where the business has visits (meta.visits !== false) */
export const VISIT_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>(['booked', 'visited', 'meet_conv'])
/** rows that need the owner's "Sifatli lid" stages (meta.qualifiedSet !== false) */
export const QUALIFIED_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>(['qual', 'qual_cost', 'qual_conv'])

export interface Filters {
  manager: Multi
  campaign: Multi
}

export interface SectionData {
  v: Record<BaseKey, number[]>
  recs: Record<BaseKey, unknown[][]>
  tot: Record<BaseKey, number>
  /** so'm per US dollar (ROAS) */
  usdUzs: number
}

export interface MonthCtx {
  from: number
  /** exclusive, capped at now */
  to: number
  days: number
  leads: Lead[]
  dealsCreated: Deal[]
  dealsWon: Deal[]
  payments: Payment[]
  ads: AdDay[]
  leadById: Map<number, Lead>
  dealById: Map<number, Deal>
  platform: Map<string, string>
  /** campaign id → the CRM source most of its leads carry (UTM / campaign attribution): a source section's budget */
  campaignSource: Map<string, string>
  /** deal stages that count as "Kelishuv" (meta.dealStages[].kelishuv) */
  kelishuv: Set<string>
  usdUzs: number
}

export function monthCtx(db: Db, y: number, m: number, now: number, meta: Pick<SnapshotMeta, 'dealStages' | 'usdUzs'>): MonthCtx {
  const from = new Date(y, m, 1).getTime()
  const to = Math.min(new Date(y, m + 1, 1).getTime(), now)
  const days = new Date(y, m + 1, 0).getDate()
  const inR = (ts: number) => ts >= from && ts < to
  const mk = `${y}-${String(m + 1).padStart(2, '0')}`
  const lastDay = to > from ? new Date(to - 1).getDate() : 0
  return {
    from,
    to,
    days,
    leads: db.leads.filter((l) => inR(l.ts)),
    dealsCreated: db.deals.filter((d) => inR(d.ts)),
    dealsWon: db.deals.filter((d) => d.status === 'won' && d.closed_ts !== null && inR(d.closed_ts)),
    payments: db.payments.filter((p) => inR(p.ts)),
    ads: db.ads.filter((a) => a.day.startsWith(mk) && Number(a.day.slice(8)) <= lastDay),
    leadById: new Map(db.leads.map((l) => [l.id, l])),
    dealById: new Map(db.deals.map((d) => [d.id, d])),
    platform: new Map(db.campaigns.map((c) => [c.id, c.platform])),
    campaignSource: campaignSources(db.leads),
    kelishuv: new Set(meta.dealStages.filter((s) => s.kelishuv).map((s) => s.label)),
    usdUzs: meta.usdUzs,
  }
}

/** Each campaign's CRM source: the one most of its attributed leads (lead.campaign_id) carry; ties go to the first name. */
export function campaignSources(leads: Lead[]): Map<string, string> {
  const n = new Map<string, Map<string, number>>()
  for (const l of leads) {
    if (!l.campaign_id) continue
    let by = n.get(l.campaign_id)
    if (!by) n.set(l.campaign_id, (by = new Map()))
    by.set(l.source, (by.get(l.source) ?? 0) + 1)
  }
  const out = new Map<string, string>()
  for (const [id, by] of n) out.set(id, [...by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0])
  return out
}

export function sectionData(c: MonthCtx, sec: SectionDef, f: Filters): SectionData {
  const v = {} as Record<BaseKey, number[]>
  const recs = {} as Record<BaseKey, unknown[][]>
  for (const k of BASE_KEYS) {
    v[k] = Array<number>(c.days).fill(0)
    recs[k] = Array.from({ length: c.days }, () => [])
  }
  const add = (k: BaseKey, i: number, amount: number, rec: unknown) => {
    if (i < 0 || i >= c.days) return
    v[k][i]! += amount
    recs[k][i]!.push(rec)
  }
  const dayIdx = (ts: number) => new Date(ts).getDate() - 1

  const inSection = (l: Lead) =>
    sec.kind === 'jami' ? true : sec.kind === 'target' ? l.campaign_id !== null && matchMulti(l.campaign, f.campaign) : l.source === sec.source
  // a deal with a lead follows its lead's section; one without (made straight in the deal funnel) its own source
  const dealOk = (d: Deal) => {
    const l = c.leadById.get(d.lead_id)
    if (l) return inSection(l)
    return sec.kind === 'jami' ? true : sec.kind === 'source' ? d.source === sec.source : false
  }

  for (const l of c.leads) {
    if (!inSection(l) || !matchMulti(l.manager, f.manager)) continue
    const i = dayIdx(l.ts)
    add('leads', i, 1, l)
    if (l.qualified) add('qual', i, 1, l)
    if (l.booked) add('booked', i, 1, l)
    if (l.visited) add('visited', i, 1, l)
    if (l.stage === 'lost' && !l.archived) add('cancelled', i, 1, l)
    if (l.stage === 'junk') add('junk', i, 1, l)
  }
  for (const d of c.dealsCreated) {
    if (!(d.kelishuv ?? c.kelishuv.has(d.stage)) || !matchMulti(d.manager, f.manager) || !dealOk(d)) continue
    const i = dayIdx(d.ts)
    add('deals', i, 1, d)
    add('deals_sum', i, d.amount, d)
  }
  for (const d of c.dealsWon) {
    if (!matchMulti(d.manager, f.manager) || !dealOk(d)) continue
    add('sales', dayIdx(d.closed_ts!), 1, d)
  }
  for (const p of c.payments) {
    const d = c.dealById.get(p.deal_id)
    if (!d || !matchMulti(p.manager, f.manager) || !dealOk(d)) continue
    add('sales_sum', dayIdx(p.ts), p.amount, p)
  }
  // Budget is not narrowed by Mas'ul (as in mountain: Meta spend has no responsible person). A source section gets the spend
  // of the campaigns its leads come from (lead.campaign_id; review 2026-11-04: "Instagram reklama" never equals the platform
  // name "Instagram", so it got none); a campaign no lead names yet falls back to its platform's name.
  let usd = 0, uzs = 0
  for (const a of c.ads) {
    const ok = sec.kind === 'jami' ? true : sec.kind === 'target' ? matchMulti(a.campaign, f.campaign) : (c.campaignSource.get(a.campaign_id) ?? c.platform.get(a.campaign_id)) === sec.source
    if (ok) add('budget', Number(a.day.slice(8)) - 1, a.spend_usd, a), (usd += a.spend_usd), (uzs += a.spend_uzs)
  }
  const tot = {} as Record<BaseKey, number>
  for (const k of BASE_KEYS) tot[k] = v[k].reduce((s, x) => s + x, 0)
  // ROAS: the month's spend at each day's own rate (spend_uzs ÷ spend_usd), else the snapshot's rate
  return { v, recs, tot, usdUzs: usd > 0 && uzs > 0 ? uzs / usd : c.usdUzs }
}

/** Metric value for one day (i) or the month (i = null); ratios are recomputed from summed parts. */
export function metricValue(d: SectionData, m: MetricKey, i: number | null): number {
  const g = (k: BaseKey) => (i === null ? d.tot[k] : d.v[k][i]!)
  switch (m) {
    case 'qual_cost':
      return g('qual') ? g('budget') / g('qual') : 0
    case 'qual_conv':
      return g('leads') ? g('qual') / g('leads') : 0
    case 'meet_conv':
      return g('booked') ? g('visited') / g('booked') : 0
    case 'roas':
      return g('budget') ? g('sales_sum') / (g('budget') * d.usdUzs) : 0
    case 'customer_cost':
      return g('sales') ? g('budget') / g('sales') : 0
    default:
      return g(m)
  }
}
