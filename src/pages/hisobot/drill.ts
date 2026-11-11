import type { SnapshotMeta } from '@/features/projects/types'
import type { AdDay, Deal, Lead, Payment } from '@/data/types'
import type { Column } from '@/kit/DataTable'
import type { Drill } from '@/kit/blocks'
import { fmtMoney, fmtShortDate, fmtTime, fmtUsd } from '@/lib/format'
import type { Lang } from '@/lib/settings'
import type { RecKind } from './compute'

type T = (s: string, v?: Record<string, string | number>) => string

const when = (ts: number, lang: Lang) => `${fmtShortDate(new Date(ts), lang)} ${fmtTime(new Date(ts))}`

function leadCols(t: T, lang: Lang, stages: SnapshotMeta['leadStageLabels']): Column<Lead>[] {
  return [
    { key: 'name', label: 'Mijoz', value: (l) => l.name },
    { key: 'phone', label: 'Telefon', value: (l) => l.phone },
    { key: 'source', label: 'Manba', value: (l) => t(l.source) },
    { key: 'campaign', label: 'Kampaniya', value: (l) => l.campaign ?? '—' },
    { key: 'manager', label: "Mas'ul", value: (l) => l.manager },
    { key: 'stage', label: 'Bosqich', value: (l) => t(stages[l.stage]) },
    { key: 'ts', label: 'Yaratilgan', align: 'end', value: (l) => l.ts, format: (v) => when(v, lang) },
  ]
}

function dealCols(t: T, lang: Lang, won: boolean): Column<Deal>[] {
  return [
    { key: 'id', label: 'Sdelka', value: (d) => `#${d.id}` },
    { key: 'product', label: 'Mahsulot', value: (d) => t(d.product) },
    { key: 'manager', label: "Mas'ul", value: (d) => d.manager },
    { key: 'source', label: 'Manba', value: (d) => t(d.source) },
    { key: 'stage', label: 'Bosqich', value: (d) => t(d.stage) },
    { key: 'amount', label: 'Shartnoma summasi', align: 'end', value: (d) => d.amount, format: (v) => fmtMoney(v, lang) },
    won
      ? { key: 'closed', label: 'Sotilgan sana', align: 'end', value: (d) => d.closed_ts, format: (v) => when(v, lang) }
      : { key: 'ts', label: 'Yaratilgan', align: 'end', value: (d) => d.ts, format: (v) => when(v, lang) },
  ]
}

function paymentCols(t: T, lang: Lang): Column<Payment>[] {
  return [
    { key: 'ts', label: 'Sana', value: (p) => p.ts, format: (v) => when(v, lang) },
    { key: 'deal', label: 'Sdelka', value: (p) => `#${p.deal_id}` },
    { key: 'product', label: 'Mahsulot', value: (p) => t(p.product) },
    { key: 'manager', label: "Mas'ul", value: (p) => p.manager },
    { key: 'method', label: "To'lov usuli", value: (p) => t(p.method) },
    { key: 'kind', label: 'Turi', value: (p) => t(p.kind === 'first' ? "Birinchi to'lov" : "Takroriy to'lov") },
    { key: 'amount', label: 'Summa', align: 'end', value: (p) => p.amount, format: (v) => fmtMoney(v, lang) },
  ]
}

function adCols(lang: Lang): Column<AdDay>[] {
  return [
    { key: 'day', label: 'Sana', value: (a) => a.day },
    { key: 'campaign', label: 'Kampaniya', value: (a) => a.campaign },
    { key: 'adset', label: "Reklama to'plami", value: (a) => a.adset },
    { key: 'creative', label: 'Kreativ', value: (a) => a.creative },
    { key: 'spend', label: 'Sarf', align: 'end', value: (a) => a.spend_usd, format: (v) => fmtUsd(v, lang) },
    { key: 'leads', label: 'Lidlar', align: 'end', value: (a) => a.leads },
  ]
}

/** Builds the drill sheet for the records behind one cell. */
export function buildDrill(kind: RecKind, rows: unknown[], title: string, subtitle: string, t: T, lang: Lang, stages: SnapshotMeta['leadStageLabels'], won = false): Drill<unknown> {
  const pick = (): Drill<unknown> => {
    switch (kind) {
      case 'lead':
        return { title, subtitle, rows, columns: leadCols(t, lang, stages) as Column<unknown>[], rowKey: (r) => `l${(r as Lead).id}`, crm: { kind: 'lead', id: (r) => (r as Lead).id } }
      case 'deal':
        return { title, subtitle, rows, columns: dealCols(t, lang, won) as Column<unknown>[], rowKey: (r) => `d${(r as Deal).id}`, crm: { kind: 'deal', id: (r) => (r as Deal).id } }
      case 'payment':
        return { title, subtitle, rows, columns: paymentCols(t, lang) as Column<unknown>[], rowKey: (r) => `p${(r as Payment).id}`, crm: { kind: 'deal', id: (r) => (r as Payment).deal_id } }
      case 'ad':
        return { title, subtitle, rows, columns: adCols(lang) as Column<unknown>[], rowKey: (r, i) => `a${(r as AdDay).campaign_id}-${(r as AdDay).day}-${i}` }
    }
  }
  return pick()
}
