import type { Db } from '@/data/db'
import { dayKey, parseDay, DAY } from '@/data/range'
import type { SnapField, SnapshotMeta, UfValue } from '@/features/projects/types'

/**
 * Filters a user adds to a dashboard page ("+ Filtr", owner 2026-10-24: "like in Bitrix or DataLens"): the fields the
 * page's data has — the main CRM ones, UTM, and the portal's own Bitrix (UF_) fields — each with the control of its
 * kind. A filter narrows the page's tables before the page computes (FilterScope), so every KPI, chart and table on it
 * follows. A field that a table lacks reaches it through the links the rows have (deal → lead, call → lead,
 * payment → deal, lead ← its deals); a table with no link stays as it is.
 */
export type FilterKind = 'list' | 'date' | 'number' | 'text' | 'bool'
/** the picker's groups: the dashboard's main fields, UTM and ads, then the portal's own lead and deal fields (as Bitrix groups them) */
export type FilterGroup = 'main' | 'utm' | 'lead' | 'deal'
export type TableName = 'leads' | 'deals' | 'calls' | 'payments' | 'conversations' | 'orders' | 'ads' | 'campaigns'

/** one value shape for every kind (the server checks the same fields): list → values + exclude, date → from / to (YYYY-MM-DD), number → min / max, text → q, yes / no → is */
export interface FilterValue {
  values?: string[]
  exclude?: boolean
  from?: string
  to?: string
  min?: number
  max?: number
  q?: string
  is?: boolean
}

/** a filter saved on a page: the field, and the value it opens with ("Standart qiymat") */
export interface FilterItem {
  field: string
  value?: FilterValue
}
/** page id → its added filters, in order */
export type PageFilters = Record<string, FilterItem[]>

type Raw = UfValue | undefined
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each getter reads one table's row
type Get = (row: any) => Raw

export interface FieldDef {
  key: string
  /** Uzbek key (translated), or the portal's own words when `literal` */
  label: string
  literal?: boolean
  group: FilterGroup
  kind: FilterKind
  get: Partial<Record<TableName, Get>>
  /** list values shown by these words (Uzbek keys) instead of the raw ones */
  names?: Record<string, string>
  /** a portal field no row has a value in (meta.emptyFields): offered like Bitrix offers it, nothing matches a value */
  empty?: boolean
}

export const MAX_FILTERS = 20

const s = (v: string | null | undefined): Raw => (v == null || v === '' ? null : v)

const DIRECTION: Record<string, string> = { in: 'Kiruvchi', out: 'Chiquvchi' }
const CALL_STATUS: Record<string, string> = { answered: 'Javob berilgan', missed: "O'tkazib yuborilgan" }
const DEAL_STATUS: Record<string, string> = { open: 'Jarayonda', won: 'Sotildi', lost: "Bekor bo'ldi" }

/** every field this data source can filter by; the custom Bitrix fields come from the snapshot (meta.fields) */
export function fieldDefs(meta: SnapshotMeta): FieldDef[] {
  const stage = (k: string) => meta.leadStageLabels[k as keyof SnapshotMeta['leadStageLabels']] ?? k
  const main: FieldDef[] = [
    {
      key: 'manager',
      label: "Mas'ul",
      group: 'main',
      kind: 'list',
      get: {
        leads: (l) => s(l.manager),
        deals: (d) => s(d.manager),
        calls: (c) => s(c.operator),
        payments: (p) => s(p.manager),
        conversations: (c) => s(c.manager),
        orders: (o) => s(o.seller),
      },
    },
    { key: 'source', label: 'Manba', group: 'main', kind: 'list', get: { leads: (l) => s(l.source), deals: (d) => s(d.source), conversations: (c) => s(c.source) } },
    { key: 'stage', label: 'Bosqich', group: 'main', kind: 'list', get: { leads: (l) => stage(l.stage), deals: (d) => s(d.stage) } },
    { key: 'created', label: 'Yaratilgan sana', group: 'main', kind: 'date', get: { leads: (r) => r.ts, deals: (r) => r.ts, calls: (r) => r.ts, payments: (r) => r.ts, conversations: (r) => r.ts, orders: (r) => r.ts } },
    { key: 'closed', label: 'Yopilgan sana', group: 'main', kind: 'date', get: { leads: (l) => l.closed_ts, deals: (d) => d.closed_ts } },
    { key: 'amount', label: 'Summa', group: 'main', kind: 'number', get: { deals: (d) => d.amount, payments: (p) => p.amount, orders: (o) => o.total } },
    { key: 'deal_status', label: 'Bitim holati', group: 'main', kind: 'list', get: { deals: (d) => d.status }, names: DEAL_STATUS },
    { key: 'product', label: 'Mahsulot', group: 'main', kind: 'list', get: { leads: (l) => s(l.product), deals: (d) => s(d.product), payments: (p) => s(p.product) } },
    { key: 'campaign', label: 'Kampaniya', group: 'main', kind: 'list', get: { leads: (l) => s(l.campaign), ads: (a) => s(a.campaign), campaigns: (c) => s(c.name) } },
    { key: 'reason', label: 'Sabab', group: 'main', kind: 'list', get: { leads: (l) => s(l.reason), deals: (d) => s(d.reason) } },
    { key: 'branch', label: 'Filial', group: 'main', kind: 'list', get: { leads: (l) => s(l.branch), deals: (d) => s(d.branch) } },
    { key: 'qualified', label: 'Sifatli lid', group: 'main', kind: 'bool', get: { leads: (l) => l.qualified } },
    { key: 'booked', label: 'Tashrif belgilandi', group: 'main', kind: 'bool', get: { leads: (l) => l.booked } },
    { key: 'visited', label: 'Tashrif buyurdi', group: 'main', kind: 'bool', get: { leads: (l) => l.visited } },
    { key: 'name', label: 'Lid nomi', group: 'main', kind: 'text', get: { leads: (l) => s(l.name) } },
    { key: 'phone', label: 'Telefon', group: 'main', kind: 'text', get: { leads: (l) => s(l.phone), calls: (c) => s(c.phone), orders: (o) => s(o.customer_phone) } },
    { key: 'direction', label: "Qo'ng'iroq yo'nalishi", group: 'main', kind: 'list', get: { calls: (c) => c.direction }, names: DIRECTION },
    { key: 'call_status', label: "Qo'ng'iroq holati", group: 'main', kind: 'list', get: { calls: (c) => c.status }, names: CALL_STATUS },
    { key: 'duration', label: 'Suhbat davomiyligi (soniya)', group: 'main', kind: 'number', get: { calls: (c) => (c.status === 'answered' ? c.duration_sec : 0) } },
    { key: 'channel', label: 'Kanal', group: 'main', kind: 'list', get: { conversations: (c) => s(c.channel) } },
    { key: 'shop', label: "Do'kon", group: 'main', kind: 'list', get: { orders: (o) => s(o.shop) } },
  ]
  const utm: FieldDef[] = [
    { key: 'utm_source', label: 'UTM source', literal: true, group: 'utm', kind: 'list', get: { leads: (l) => s(l.utm_source) } },
    { key: 'utm_medium', label: 'UTM medium', literal: true, group: 'utm', kind: 'list', get: { leads: (l) => s(l.utm_medium) } },
    { key: 'utm_campaign', label: 'UTM campaign', literal: true, group: 'utm', kind: 'list', get: { leads: (l) => s(l.utm_campaign) } },
    { key: 'utm_content', label: 'UTM content', literal: true, group: 'utm', kind: 'list', get: { leads: (l) => s(l.utm_content) } },
    { key: 'adset', label: "Reklama to'plami", group: 'utm', kind: 'list', get: { leads: (l) => s(l.adset), ads: (a) => s(a.adset) } },
    { key: 'creative', label: 'Kreativ', group: 'utm', kind: 'list', get: { leads: (l) => s(l.creative), ads: (a) => s(a.creative) } },
    { key: 'form_name', label: 'Forma', group: 'utm', kind: 'list', get: { leads: (l) => s(l.form_name) } },
    { key: 'platform', label: 'Platforma', group: 'utm', kind: 'list', get: { leads: (l) => s(l.platform), campaigns: (c) => s(c.platform) } },
  ]
  // the portal's own fields (custom UF ones and the standard ones the dashboard has no filter of), then the ones no row
  // has a value in — every field of the portal, as Bitrix's filter window lists them
  const seen = new Set<string>()
  const portal = (f: SnapField, empty: boolean): FieldDef[] => {
    const key = `uf:${f.entity}:${f.code}`
    if (seen.has(key) || !KINDS.has(f.type)) return []
    seen.add(key)
    const table: TableName = f.entity === 'deal' ? 'deals' : 'leads'
    const get: Get = (r) => (r.uf as Record<string, UfValue> | undefined)?.[f.code]
    return [{ key, label: f.title, literal: true, group: f.entity === 'deal' ? 'deal' : 'lead', kind: f.type, get: { [table]: get }, ...(empty ? { empty } : {}) }]
  }
  const bitrix = [...(meta.fields ?? []).flatMap((f) => portal(f, false)), ...(meta.emptyFields ?? []).flatMap((f) => portal(f, true))]
  return [...main, ...utm, ...bitrix]
}

const KINDS = new Set<FilterKind>(['list', 'date', 'number', 'text', 'bool'])

/**
 * The fields the picker offers: the ones that have any value in this data, and the portal's fields the snapshot names as
 * empty (meta.emptyFields). A main field with no value here (no calls, no chats) is not offered; neither is a carried
 * portal field the rows lack.
 */
export function availableFields(defs: FieldDef[], db: Db): FieldDef[] {
  return defs.filter((f) =>
    f.empty ||
    Object.entries(f.get).some(([t, get]) => {
      const rows = tableOf(db, t as TableName)
      for (let i = 0; i < rows.length; i++) if (present(get!(rows[i]))) return true
      return false
    }),
  )
}

/** the values a list field takes in this data, most frequent first (capped) */
export function optionsOf(f: FieldDef, db: Db, cap = 400): string[] {
  const n = new Map<string, number>()
  for (const [t, get] of Object.entries(f.get)) {
    for (const row of tableOf(db, t as TableName)) {
      const v = get!(row)
      for (const x of Array.isArray(v) ? v : [v]) if (present(x)) n.set(String(x), (n.get(String(x)) ?? 0) + 1)
    }
  }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, cap).map(([k]) => k)
}

const present = (v: Raw): boolean => v != null && v !== '' && !(Array.isArray(v) && !v.length)

function tableOf(db: Db, t: TableName): unknown[] {
  return ((db as unknown as Record<string, unknown[] | undefined>)[t] ?? []) as unknown[]
}

/** true when the value narrows anything */
export function isActive(kind: FilterKind, v: FilterValue | undefined): boolean {
  if (!v) return false
  switch (kind) {
    case 'list':
      return !!v.values?.length
    case 'date':
      return !!(v.from || v.to)
    case 'number':
      return Number.isFinite(v.min) || Number.isFinite(v.max)
    case 'text':
      return !!v.q?.trim()
    case 'bool':
      return typeof v.is === 'boolean'
  }
}

const asMs = (v: Raw): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v) {
    const t = Date.parse(v)
    return Number.isNaN(t) ? null : t
  }
  return null
}
const asNum = (v: Raw): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/\|.*$/, '').replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
const asBool = (v: Raw): boolean => v === true || v === 1 || v === '1' || v === 'Y' || v === 'true'

/** does one raw value pass one filter */
export function matches(kind: FilterKind, v: FilterValue, raw: Raw): boolean {
  switch (kind) {
    case 'list': {
      const xs = Array.isArray(raw) ? raw.map(String) : present(raw) ? [String(raw)] : []
      const hit = xs.some((x) => v.values!.includes(x))
      return v.exclude ? !hit : hit
    }
    case 'date': {
      const ms = asMs(raw)
      if (ms == null) return false
      if (v.from && ms < parseDay(v.from)) return false
      if (v.to && ms >= parseDay(v.to) + DAY) return false
      return true
    }
    case 'number': {
      const n = asNum(raw)
      if (n == null) return false
      if (Number.isFinite(v.min) && n < v.min!) return false
      if (Number.isFinite(v.max) && n > v.max!) return false
      return true
    }
    case 'text': {
      const q = v.q!.trim().toLowerCase()
      const xs = Array.isArray(raw) ? raw : [raw]
      return xs.some((x) => present(x) && String(x).toLowerCase().includes(q))
    }
    case 'bool':
      return asBool(raw) === v.is
  }
}

/** the rows' link to another table: deal → lead, call / chat / order → lead, payment → deal */
const LINKS: Partial<Record<TableName, { to: TableName; key: string }>> = {
  deals: { to: 'leads', key: 'lead_id' },
  calls: { to: 'leads', key: 'lead_id' },
  conversations: { to: 'leads', key: 'lead_id' },
  orders: { to: 'leads', key: 'lead_id' },
  payments: { to: 'deals', key: 'deal_id' },
}

const FILTERED: TableName[] = ['leads', 'deals', 'calls', 'payments', 'conversations', 'orders', 'ads', 'campaigns']

/**
 * The data with the active filters applied (the same object when none is active, so nothing recomputes). Each filter
 * narrows a table by its own field, or through the table's link when the field lives on the linked table; a lead is
 * kept by a deal-only field when one of its deals passes.
 */
export function applyFilters(db: Db, defs: FieldDef[], values: Record<string, FilterValue | undefined>): Db {
  const active = defs.filter((f) => isActive(f.kind, values[f.key]))
  if (!active.length) return db
  // a table's own getter counts only where that table has values for the field: a field offered because another table
  // has it ("Sabab" on deals with every reason empty, leads' empty "Mahsulot") goes through the link instead of
  // emptying the page (owner's review, 2026-11-04)
  const hasCache = new Map<string, boolean>()
  const own = (f: FieldDef, t: TableName): Get | undefined => {
    const get = f.get[t]
    if (!get) return undefined
    // a portal field no row has a value in still filters its own table (nothing has a date, every one is "Yo'q")
    if (f.empty) return get
    const k = `${f.key}|${t}`
    let has = hasCache.get(k)
    if (has === undefined) {
      has = false
      const rows = tableOf(db, t)
      for (let i = 0; i < rows.length; i++)
        if (present(get(rows[i]))) {
          has = true
          break
        }
      hasCache.set(k, has)
    }
    return has ? get : undefined
  }
  // per filter: the ids of the rows of a table that pass it on their own field (computed when a link needs them)
  const passCache = new Map<string, Set<unknown>>()
  const passIds = (f: FieldDef, t: TableName): Set<unknown> | null => {
    const get = own(f, t)
    if (!get) {
      // the leads by a deal-only field ("Proyekt" / "Voronka" of a deal): a lead passes when one of its deals does, so the
      // calls, chats and orders of those leads follow too
      if (t === 'leads') return leadsByDeals(f)
      const link = LINKS[t]
      if (!link) return null
      const via = passIds(f, link.to)
      if (!via) return null
      const ids = new Set<unknown>()
      for (const r of tableOf(db, t) as Record<string, unknown>[]) if (via.has(r[link.key])) ids.add(r.id)
      return ids
    }
    const k = `${f.key}|${t}`
    let set = passCache.get(k)
    if (!set) {
      set = new Set()
      const v = values[f.key]!
      for (const r of tableOf(db, t) as Record<string, unknown>[]) if (matches(f.kind, v, get(r))) set.add(r.id)
      passCache.set(k, set)
    }
    return set
  }
  const leadCache = new Map<string, Set<unknown> | null>()
  function leadsByDeals(f: FieldDef): Set<unknown> | null {
    if (leadCache.has(f.key)) return leadCache.get(f.key)!
    let ids: Set<unknown> | null = null
    if (own(f, 'deals')) {
      const dealOk = passIds(f, 'deals')!
      ids = new Set<unknown>()
      for (const d of tableOf(db, 'deals') as Record<string, unknown>[]) if (dealOk.has(d.id)) ids.add(d.lead_id)
    }
    leadCache.set(f.key, ids)
    return ids
  }
  const out = { ...db } as Record<string, unknown>
  for (const t of FILTERED) {
    const rows = tableOf(db, t) as Record<string, unknown>[]
    if (!rows.length) continue
    const tests: ((r: Record<string, unknown>) => boolean)[] = []
    for (const f of active) {
      const v = values[f.key]!
      const get = own(f, t)
      if (get) {
        tests.push((r) => matches(f.kind, v, get(r)))
        continue
      }
      const link = LINKS[t]
      const via = link ? passIds(f, link.to) : null
      if (link && via) {
        tests.push((r) => via.has(r[link.key]))
        continue
      }
      // a lead kept by a deal-only field: one of its deals passes
      const leadIds = t === 'leads' ? leadsByDeals(f) : null
      if (leadIds) tests.push((r) => leadIds.has(r.id))
    }
    if (tests.length) out[t] = rows.filter((r) => tests.every((test) => test(r)))
  }
  return out as unknown as Db
}

/**
 * The fields a page already filters by in its own bar (kit FilterBar / MonthBar, pages/*): the picker marks them
 * "Sahifada bor" instead of offering a second "Manba: Hammasi" chip.
 */
export const BUILTIN: Readonly<Record<string, readonly string[]>> = {
  lead: ['manager', 'stage', 'source'],
  deal: ['manager', 'stage', 'source'],
  calls: ['manager', 'direction'],
  chatlar: ['manager', 'channel'],
  hisobot: ['campaign', 'manager'],
  kampaniyalar: ['campaign', 'platform', 'form_name', 'adset', 'creative'],
  savdo: ['shop', 'manager'],
  reja: ['manager'],
}
export const isBuiltin = (page: string, field: string): boolean => !!BUILTIN[page]?.includes(field)

/**
 * The filter chips a page shows. A filter is stored only once it has a value (withDraftValue), so a viewer never meets
 * an empty "Hammasi" chip: outside edit mode only the saved filters that open with a value show (an empty one left from
 * before shows nothing); in edit mode every saved one, then the ones added now that have no value yet (`drafts`).
 */
export function chipsOf(saved: FilterItem[], drafts: string[], editing: boolean, kindOf: (field: string) => FilterKind | undefined): FilterItem[] {
  const has = (i: FilterItem) => {
    const k = kindOf(i.field)
    return !!k && isActive(k, i.value)
  }
  // owner, 2026-10-26: "I created a date filter, but it didn't stay in the filter section" — an added filter stays like the
  // page's own ones (an empty one reads "Hammasi"), so every saved filter shows; `has` only orders nothing now
  void has
  if (!editing) return saved.filter((i) => !!kindOf(i.field))
  const out = [...saved]
  for (const f of drafts) if (kindOf(f) && !out.some((i) => i.field === f)) out.push({ field: f })
  return out
}

/**
 * The page's saved filters after a filter added now (a draft) got a value: stored with that value (what everyone opens
 * with), or taken out again when the value is cleared. null when nothing changes (nothing to store).
 */
export function withDraftValue(saved: FilterItem[], field: string, kind: FilterKind, v: FilterValue | null): FilterItem[] | null {
  const at = saved.findIndex((i) => i.field === field)
  if (v && isActive(kind, v)) {
    if (at >= 0 && JSON.stringify(saved[at]!.value) === JSON.stringify(v)) return null
    return at >= 0 ? saved.map((i, n) => (n === at ? { field, value: v } : i)) : [...saved, { field, value: v }]
  }
  return at >= 0 ? saved.filter((_, n) => n !== at) : null
}

/** "12.10.2026" style day for the chip text */
export const shortDay = (day: string) => {
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y}`
}
export const today = () => dayKey(Date.now())

/** the picker's groups in order (Uzbek keys); not the bare 'Asosiy': that key is the navigation's "Главная / Home" */
export const PICKER_GROUPS: readonly { id: FilterGroup; label: string }[] = [
  { id: 'main', label: 'Asosiy maydonlar' },
  { id: 'utm', label: 'UTM va reklama' },
  { id: 'lead', label: 'Lid maydonlari' },
  { id: 'deal', label: 'Sdelka maydonlari' },
]

/** a label as search compares it: lower case, ё as е, every apostrophe as ' (o‘ / oʻ / o’ → o') */
export const searchKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The picker's list (owner, 2026-11-09: "like Bitrix's own filter window"): the fields whose shown name has every word
 * of the query, in their groups; the main and UTM ones in their own order, the portal's ones by name with the empty ones
 * last, then (`missing`, a Studio user on a live dashboard) the portal's fields the data does not hold yet, by name. A group
 * with nothing in it is left out.
 */
export function pickerGroups<M extends { field: { entity: 'lead' | 'deal'; title: string } } = never>(
  fields: FieldDef[],
  q: string,
  labelOf: (f: FieldDef) => string,
  missing: readonly M[] = [],
): { id: FilterGroup; label: string; fields: FieldDef[]; missing: M[] }[] {
  const words = searchKey(q).split(' ').filter(Boolean)
  const has = (label: string) => {
    const name = searchKey(label)
    return words.every((w) => name.includes(w))
  }
  return PICKER_GROUPS.map((g) => {
    let list = fields.filter((f) => f.group === g.id && has(labelOf(f)))
    if (g.id === 'lead' || g.id === 'deal')
      list = list.sort((a, b) => Number(!!a.empty) - Number(!!b.empty) || labelOf(a).localeCompare(labelOf(b), 'ru', { sensitivity: 'base' }))
    const rest = missing
      .filter((m) => m.field.entity === g.id && has(m.field.title))
      .sort((a, b) => a.field.title.localeCompare(b.field.title, 'ru', { sensitivity: 'base' }))
    return { ...g, fields: list, missing: rest }
  }).filter((g) => g.fields.length > 0 || g.missing.length > 0)
}

/** the control a field's chip opens, by its kind: a list → pick values (people for a person field), a date → a range, a number → from–to, text → contains, yes / no → Ha / Yo'q */
export type FilterControl = 'values' | 'dateRange' | 'numberRange' | 'contains' | 'yesNo'
const CONTROL: Record<FilterKind, FilterControl> = { list: 'values', date: 'dateRange', number: 'numberRange', text: 'contains', bool: 'yesNo' }
export const controlOf = (kind: FilterKind): FilterControl => CONTROL[kind]
