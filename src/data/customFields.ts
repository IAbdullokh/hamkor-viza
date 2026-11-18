import type { SnapField, UfValue } from '@/features/projects/types'
import type { DatasetField } from '@/spec'
import type { Db } from './db'
import type { Column } from './tables'

/**
 * The portal's own Bitrix (UF_) fields of a live project ("Qiziqqan modeli", "Mijoz hududi", a custom rejection reason)
 * as dataset fields, so "Grafik qo'shish" and "✨ AI tavsiyasi" can cut by them: a list field is a dimension, a number
 * field a measure (its sum). Only fields with a value on some row; a title that names a person's details (phone,
 * address, comment …) is never offered. Registered per workspace when a snapshot loads; the query engine merges them.
 * The server's ChartRecommend.CustomFields profiles the same fields under the same ids.
 */
const byWs = new Map<string, SnapField[]>()
let version = 0

/** a custom field's dataset id: its code in lower case (UF_CRM_GF_REGION → uf_crm_gf_region) */
export const customFieldId = (code: string) => code.toLowerCase()

const PERSON_TITLE = /телефон|phone|почт|e-?mail|адрес|address|manzil|коммент|comment|izoh|фио|(^|[^\p{L}])(имя|ism|инн)([^\p{L}]|$)|familiya|фамили|паспорт|pas+port|pinfl|пинфл|номер|raqam/iu
const ID_RE = /^[a-z0-9_]{1,64}$/

/** the text a portal leaves on an unfilled field: Bitrix's "N" (a yes/no left unset), a dash, a "null" */
const PLACEHOLDERS = new Set(['n', '—', '–', '-', 'null', 'undefined'])

/** an empty or placeholder value ("N", "—"): a chart leaves it out when real values exist (the server's IsPlaceholder) */
export function isPlaceholder(v: unknown): boolean {
  return v == null || v === '' || (typeof v === 'string' && (v.trim() === '' || PLACEHOLDERS.has(v.trim().toLowerCase())))
}

/** a list value as a chart groups it: the item's text, several joined with ", " (the server's UfLabel), null when empty */
export function ufLabel(v: UfValue | undefined): string | null {
  if (v == null || typeof v === 'boolean') return null
  const text = (Array.isArray(v) ? v : [v])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .join(', ')
  return text || null
}

export function ufNumber(v: UfValue | undefined): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/** the list / number fields of a snapshot that have a value on some row, person-looking titles left out */
export function chartableFields(fields: SnapField[] | undefined, db: Pick<Db, 'leads' | 'deals'>): SnapField[] {
  return (fields ?? []).filter((f) => {
    if ((f.type !== 'list' && f.type !== 'number' && f.type !== 'date') || !ID_RE.test(customFieldId(f.code)) || PERSON_TITLE.test(f.title)) return false
    const rows: { uf?: Record<string, UfValue> }[] = f.entity === 'deal' ? db.deals : db.leads
    const has = f.type === 'number' ? (v: UfValue | undefined) => ufNumber(v) !== null : (v: UfValue | undefined) => !isPlaceholder(ufLabel(v))
    return rows.some((r) => has(r.uf?.[f.code]))
  })
}

export function setCustomFields(wsId: string, fields: SnapField[]): void {
  // a snapshot reloaded with the same fields keeps the compiled datasets
  if (JSON.stringify(byWs.get(wsId) ?? []) === JSON.stringify(fields)) return
  byWs.set(wsId, fields)
  version++
}

export function customFieldsVersion(): number {
  return version
}

/** the extra columns and dataset fields a dataset over `table` gets; `taken` = the names it already has */
export function customFieldsFor(wsId: string, datasetId: string, taken: Set<string>): { columns: Column[]; fields: DatasetField[] } {
  const entity = datasetId === 'leads' ? 'lead' : datasetId === 'deals' ? 'deal' : null
  const own = entity ? (byWs.get(wsId) ?? []).filter((f) => f.entity === entity) : []
  const columns: Column[] = []
  const fields: DatasetField[] = []
  const names = new Set(taken)
  for (const f of own) {
    const id = customFieldId(f.code)
    // formulas reference fields by [name]: no brackets in it, and a name the dataset already has gets the code
    let name = f.title.replace(/[[\]]/g, '').trim() || f.code
    if (names.has(name)) name = `${name} (${f.code})`
    if (names.has(name)) continue
    names.add(name)
    if (f.type === 'date') {
      // a date a period can count by (the block chat's "by this date instead")
      columns.push({ name, sql: `"uf"->>'${f.code}'`, type: 'date', get: (r) => ufLabel((r.uf as Record<string, UfValue> | undefined)?.[f.code]) })
      fields.push({ id, name, kind: 'dimension', formula: `[${name}]`, format: 'date' })
      continue
    }
    const list = f.type === 'list'
    columns.push({ name, sql: `"uf"->>'${f.code}'`, type: list ? 'string' : 'number', get: (r) => (list ? ufLabel : ufNumber)((r.uf as Record<string, UfValue> | undefined)?.[f.code]) })
    fields.push(list ? { id, name, kind: 'dimension', formula: `[${name}]` } : { id, name, kind: 'measure', formula: `SUM([${name}])`, format: 'number' })
  }
  return { columns, fields }
}
