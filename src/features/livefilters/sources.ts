import { getSource } from '@/features/projects/sources'
import type { SnapshotMeta, SourceId } from '@/features/projects/types'
import type { TableName } from './fields'

/**
 * Which connected system each table of a dashboard's data comes from (owner, 2026-11-11: "we don't only take from Bitrix —
 * also from OnlinePBX and such; the source should be cited"): the filter picker groups its fields by it, a filter chip and
 * a dashboard block show the system's mark. The server names it per table (meta.sources.tables, SnapshotBuilder); an
 * older snapshot only says which kinds are connected (meta.sources crm / telephony / meta / chats / pos), and a call row
 * may name its own system (`provider`).
 */
export interface SourceRef {
  kind: SourceId
  /** the connection's own name (a Sheets file, a Bitrix portal) when the server gives one */
  name?: string
}
export type TableSources = Partial<Record<TableName, SourceRef[]>>

const KINDS = new Set<string>([
  'bitrix24', 'amocrm', 'meta', 'google_ads', 'yandex_direct', 'tiktok_ads', 'telegram_ads', 'onlinepbx', 'bitrix_tel', 'zadarma',
  'uis', 'sipuni', 'moizvonki', 'excel', 'sheets', 'postgres', 'mysql', 'clickhouse', 'mssql', 'onec', 'moysklad', 'payme', 'click',
  'wazzup', 'telegram_bot', 'instagram', 'whatsapp', 'billz',
])

/** a server / row word for a system → the app's source id (a call's "bitrix" is the portal's own telephony) */
export function sourceKind(word: string | null | undefined): SourceId | null {
  if (!word) return null
  const w = word.toLowerCase()
  if (w === 'bitrix') return 'bitrix_tel'
  if (w === 'telegram') return 'telegram_bot'
  if (w === 'kommo') return 'amocrm'
  return KINDS.has(w) ? (w as SourceId) : null
}

/** the system's own name (Bitrix24, OnlinePBX, Google Sheets …) */
export const sourceName = (kind: SourceId): string => (kind === 'meta' ? 'Meta Ads' : getSource(kind).name)

const uniq = (xs: SourceRef[]): SourceRef[] => {
  const seen = new Set<string>()
  return xs.filter((x) => (seen.has(x.kind) ? false : (seen.add(x.kind), true)))
}

const CHAT: Record<string, SourceId> = { telegram: 'telegram_bot', whatsapp: 'whatsapp', instagram: 'instagram', wazzup: 'wazzup' }

/**
 * Each table's systems: the server's own list, else what the older meta says (its CRM is Bitrix24 unless the portal is an
 * amoCRM / Kommo one), the calls narrowed to the systems their rows name.
 */
export function tableSources(meta: SnapshotMeta, callProviders: readonly (string | undefined)[] = []): TableSources {
  const given = meta.sources?.tables
  if (given) {
    const out: TableSources = {}
    for (const [t, refs] of Object.entries(given)) {
      const list = uniq((refs ?? []).flatMap((r) => {
        const kind = sourceKind(r.kind)
        return kind ? [{ kind, ...(r.name ? { name: r.name } : {}) }] : []
      }))
      if (list.length) out[t as TableName] = list
    }
    return out
  }
  const s = meta.sources ?? { crm: false, telephony: null, meta: false }
  const crmKind: SourceId = /amocrm|kommo/i.test(meta.portal ?? '') ? 'amocrm' : 'bitrix24'
  const crm: SourceRef[] = s.crm ? [{ kind: crmKind }] : []
  const fromRows = uniq(callProviders.map(sourceKind).filter((k): k is SourceId => !!k).map((kind) => ({ kind })))
  const calls: SourceRef[] = fromRows.length
    ? fromRows
    : s.telephony === 'onlinepbx' ? [{ kind: 'onlinepbx' }] : s.telephony === 'bitrix' ? [{ kind: crmKind === 'amocrm' ? 'amocrm' : 'bitrix_tel' }] : []
  const ads: SourceRef[] = s.meta ? [{ kind: 'meta' }] : []
  const chats = uniq((s.chats ?? []).map((c) => CHAT[c]).filter((k): k is SourceId => !!k).map((kind) => ({ kind })))
  const out: TableSources = { leads: crm, deals: crm, payments: crm, calls, ads, campaigns: ads, conversations: chats, orders: s.pos ? [{ kind: 'billz' }] : [] }
  for (const k of Object.keys(out) as TableName[]) if (!out[k]!.length) delete out[k]
  return out
}

/** the systems of the tables a field (or a block) reads, each once, in the tables' order */
export function sourcesOfTables(ts: TableSources, tables: readonly TableName[]): SourceRef[] {
  return uniq(tables.flatMap((t) => ts[t] ?? []))
}

/** the CRM systems: their field names are the portal's own (the Russian / English originals mean something there) */
export const isCrmKind = (k: SourceId) => k === 'bitrix24' || k === 'bitrix_tel' || k === 'amocrm'

/** a call row's system as a display name (the «Qo'ng'iroq manbasi» filter's values) */
export function callSourceName(provider: string | undefined): string | null {
  const k = sourceKind(provider)
  return k ? sourceName(k) : null
}
