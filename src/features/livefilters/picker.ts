import { getSource } from '@/features/projects/sources'
import { MAX_FILTERS, pickerGroups, type FieldDef, type FilterKind, type TableName } from './fields'
import { portalKey, type MissingRow, type PortalField } from './portal'
import type { SourceRef } from './sources'

/**
 * «Filtr maydonlari» (owner, 2026-11-09, Bitrix's «Настройка полей фильтра» as the model): every field the page can be
 * filtered by in one wide window — the main ones, UTM, then the portal's own Lid and Sdelka fields — as columns of
 * checkboxes. The fields already on the page come ticked; «Qo'llash» adds the newly ticked ones, takes off the unticked
 * ones and starts reading the ticked fields the data does not hold yet (one fill per entity, 20 fields a call). The
 * window's logic lives here, the window itself in FieldPicker.tsx.
 */

export type Entity = 'lead' | 'deal'
export type Entities = Record<Entity, boolean>
export const ALL_ENTITIES: Entities = { lead: true, deal: true }

/** one checkbox of the window: a field of the data, or (`missing`) a portal field the data does not hold yet */
export interface PickerRow {
  key: string
  /** the name as shown (already translated, or the portal's own) */
  label: string
  kind: FilterKind
  /** a portal field no row has a value in («Qiymatsiz») */
  empty?: boolean
  missing?: MissingRow
  /** the systems its values come from (sources.ts): their marks after the name */
  sources?: SourceRef[]
}

/** what a section holds: the fields of several tables, UTM, or one table's (the portal's lead / deal fields, the calls …) */
export type SectionId = 'main' | 'utm' | 'lead' | 'deal' | 'call' | 'payment' | 'chat' | 'order' | 'ads'

export interface PickerSection {
  id: SectionId
  /** Uzbek key */
  label: string
  rows: PickerRow[]
}

/** the window's section names (Uzbek keys): the portal's fields under the entity's own name, as Bitrix shows them */
export const SECTION_LABEL: Record<SectionId, string> = {
  main: 'Asosiy maydonlar',
  utm: 'UTM va reklama',
  lead: 'Lid',
  deal: 'Sdelka',
  call: "Qo'ng'iroqlar",
  payment: "To'lovlar",
  chat: 'Chatlar',
  order: 'Savdo',
  ads: 'Reklama',
}

/**
 * The window's sections: the fields whose name has every word of the query (fields.ts pickerGroups: any case, ё = е, any
 * apostrophe), the data's fields first, then the ones not read yet; the Lid / Sdelka sections only while their entity
 * chip is on. An empty section is left out.
 */
export function pickerSections(
  fields: FieldDef[],
  q: string,
  labelOf: (f: FieldDef) => string,
  missing: readonly MissingRow[] = [],
  entities: Entities = ALL_ENTITIES,
): PickerSection[] {
  return pickerGroups(fields, q, labelOf, missing)
    .filter((g) => (g.id === 'lead' || g.id === 'deal' ? entities[g.id] : true))
    .map((g) => ({
      id: g.id as SectionId,
      label: SECTION_LABEL[g.id],
      rows: [
        ...g.fields.map((f): PickerRow => ({ key: f.key, label: labelOf(f), kind: f.kind, ...(f.empty ? { empty: true } : {}) })),
        ...g.missing.map((m): PickerRow => ({ key: m.key, label: m.field.title, kind: m.field.kind, missing: m })),
      ],
    }))
}

/** one system's block of the window: its sections; `common` — the fields whose values come from several systems («Umumiy») */
export interface PickerSource {
  /** the systems' ids joined by '+' (one table several systems feed: the calls of two PBXs), or 'common' */
  id: string
  sources: SourceRef[]
  sections: PickerSection[]
}

const SECTION_OF_TABLE: Partial<Record<TableName, SectionId>> = { leads: 'lead', deals: 'deal', calls: 'call', payments: 'payment', conversations: 'chat', orders: 'order' }
const SECTION_ORDER: SectionId[] = ['main', 'call', 'lead', 'deal', 'utm', 'payment', 'chat', 'order', 'ads']

/** the tables a field reads (a portal field not read yet: its entity's table) */
export const tablesOfRow = (f: FieldDef | PortalField): TableName[] =>
  'get' in f ? (Object.keys(f.get) as TableName[]) : [f.entity === 'deal' ? 'deals' : 'leads']

/** the section of a field: the portal's lead / deal fields and UTM keep theirs; a dashboard field one table reads goes to that table's */
export function sectionOf(f: FieldDef): SectionId {
  if (f.group !== 'main') return f.group
  const tables = tablesOfRow(f)
  if (tables.length && tables.every((t) => t === 'ads' || t === 'campaigns')) return 'ads'
  return (tables.length === 1 && SECTION_OF_TABLE[tables[0]!]) || 'main'
}

/** which kind of system a page is about: its systems' fields come first (a calls page — the PBX's call fields) */
const PAGE_CATEGORY: Record<string, string> = { calls: 'tel', chatlar: 'chat', kampaniyalar: 'ads', savdo: 'pos' }
const CATEGORY_ORDER = ['crm', 'tel', 'ads', 'chat', 'pos', 'files', 'db', 'pay', 'other']
const categoryOf = (kind: string) => {
  try {
    return getSource(kind as SourceRef['kind']).category
  } catch {
    return 'other'
  }
}

/** the systems' order: the page's own kind first, then the CRM, telephony, ads, chats, POS, tables */
export function sourceOrder(kinds: readonly string[], page: string): string[] {
  const first = PAGE_CATEGORY[page] ?? 'crm'
  const rank = (k: string) => {
    const c = categoryOf(k)
    return c === first ? -1 : CATEGORY_ORDER.indexOf(c)
  }
  return [...kinds].sort((a, b) => rank(a) - rank(b))
}

export interface SourceOptions {
  /** a field's systems by the tables it reads (sources.ts sourcesOfTables) */
  sourcesOf: (tables: TableName[]) => SourceRef[]
  /** the dashboard page: its own kind of system comes first */
  page?: string
  /** the source switch: one system's fields (and the shared fields it feeds); 'all' — every one. The search ignores it */
  only?: string
}

/**
 * «Filtr maydonlari» by system (owner, 2026-11-11: "there should be the SOURCE where we get those fields"): each connected
 * system's block — Bitrix24 → Asosiy maydonlar / Lid / Sdelka / UTM, OnlinePBX → Qo'ng'iroqlar, Meta Ads → Reklama … —
 * and «Umumiy» for the fields several systems feed. The page's own kind of system first, then «Umumiy», then the rest.
 * The search (any word, any case, the source's codes too) looks through every system; the switch narrows only without one.
 */
export function pickerSources(
  fields: FieldDef[],
  q: string,
  labelOf: (f: FieldDef) => string,
  missing: readonly MissingRow[],
  entities: Entities,
  o: SourceOptions,
): PickerSource[] {
  const buckets = new Map<string, { sources: SourceRef[]; rows: Map<SectionId, PickerRow[]> }>()
  const put = (section: SectionId, row: PickerRow, tables: number) => {
    const srcs = row.sources ?? []
    // one table's fields stay with that table's systems (the calls of OnlinePBX and the portal's telephony: one block with
    // both marks); «Umumiy» holds the fields several tables of different systems feed
    const id = !srcs.length ? 'common' : tables === 1 || srcs.length === 1 ? srcs.map((x) => x.kind).join('+') : 'common'
    let b = buckets.get(id)
    if (!b) buckets.set(id, (b = { sources: id === 'common' ? [] : srcs, rows: new Map() }))
    let list = b.rows.get(section)
    if (!list) b.rows.set(section, (list = []))
    list.push(row)
  }
  for (const g of pickerGroups(fields, q, labelOf, missing)) {
    if ((g.id === 'lead' || g.id === 'deal') && !entities[g.id]) continue
    for (const f of g.fields) {
      const tables = tablesOfRow(f)
      put(sectionOf(f), { key: f.key, label: labelOf(f), kind: f.kind, sources: o.sourcesOf(tables), ...(f.empty ? { empty: true } : {}) }, tables.length)
    }
    for (const m of g.missing) put(g.id, { key: m.key, label: m.field.title, kind: m.field.kind, missing: m, sources: o.sourcesOf(tablesOfRow(m.field)) }, 1)
  }
  const only = !q.trim() && o.only && o.only !== 'all' ? o.only : null
  const ids = [...buckets.keys()].filter((k) => k !== 'common')
  const head = (id: string) => id.split('+')[0]!
  const rankOf = new Map(sourceOrder([...new Set(ids.map(head))], o.page ?? '').map((k, i) => [k, i]))
  const order = [...ids].sort((a, b) => rankOf.get(head(a))! - rankOf.get(head(b))! || a.length - b.length)
  // «Umumiy» after the page's own kind of system
  const first = PAGE_CATEGORY[o.page ?? ''] ?? 'crm'
  const lead = order.filter((k) => categoryOf(head(k)) === first)
  const out: PickerSource[] = []
  for (const id of [...lead, 'common', ...order.slice(lead.length)]) {
    const b = buckets.get(id)
    if (!b) continue
    if (only && id !== 'common' && !b.sources.some((x) => x.kind === only)) continue
    const sections = SECTION_ORDER.flatMap((s): PickerSection[] => {
      let rows = b.rows.get(s) ?? []
      if (only && id === 'common') rows = rows.filter((r) => r.sources?.some((x) => x.kind === only))
      return rows.length ? [{ id: s, label: SECTION_LABEL[s], rows }] : []
    })
    if (sections.length) out.push({ id, sources: b.sources, sections })
  }
  return out
}

/** the systems the source switch offers: every one a field comes from, in the window's order (one system: no switch) */
export function switchSources(fields: FieldDef[], missing: readonly MissingRow[], o: Pick<SourceOptions, 'sourcesOf' | 'page'>): SourceRef[] {
  const seen = new Map<string, SourceRef>()
  for (const t of [...fields.map(tablesOfRow), ...missing.map((m) => tablesOfRow(m.field))])
    for (const r of o.sourcesOf(t)) if (!seen.has(r.kind)) seen.set(r.kind, r)
  return sourceOrder([...seen.keys()], o.page ?? '').map((k) => seen.get(k)!)
}

/** the window's sections in order, every system's (for «Hammasini tanlash» and the like) */
export const flatSections = (tree: readonly PickerSource[]): PickerSection[] => tree.flatMap((s) => s.sections)

/** how many columns the window shows at this width: 4 on a desktop, 2 on a tablet, 1 on a phone */
export const columnsFor = (width: number): number => (width >= 1024 ? 4 : width >= 640 ? 2 : 1)

/**
 * rows down the first column, then the next (as Bitrix fills them), the columns as even as they can be (the first ones one
 * longer); trailing empty columns are left out, the grid keeps its width so every section's columns line up
 */
export function toColumns<T>(rows: readonly T[], n: number): T[][] {
  const cols = Math.max(1, n)
  const base = Math.floor(rows.length / cols)
  const extra = rows.length % cols
  const out: T[][] = []
  let at = 0
  for (let c = 0; c < cols; c++) {
    const len = base + (c < extra ? 1 : 0)
    out.push(rows.slice(at, at + len))
    at += len
  }
  return out.filter((c, i) => c.length > 0 || i === 0)
}

/**
 * «Hammasini tanlash»: every row the window shows now (search and entity chips applied) that can be ticked; when all of
 * them already are, the same button takes them off again. `locked` rows (the page's own filters, hidden ones the person
 * cannot change) stay as they are.
 */
export function selectAll(ticked: readonly string[], sections: readonly PickerSection[], locked: ReadonlySet<string>): string[] {
  const visible = sections.flatMap((s) => s.rows.map((r) => r.key)).filter((k) => !locked.has(k))
  const all = visible.every((k) => ticked.includes(k))
  if (all) return ticked.filter((k) => !visible.includes(k) || locked.has(k))
  return [...ticked, ...visible.filter((k) => !ticked.includes(k))]
}

/** true when «Hammasini tanlash» would take the visible rows off (all of them are ticked) */
export const allSelected = (ticked: readonly string[], sections: readonly PickerSection[], locked: ReadonlySet<string>): boolean => {
  const visible = sections.flatMap((s) => s.rows.map((r) => r.key)).filter((k) => !locked.has(k))
  return visible.length > 0 && visible.every((k) => ticked.includes(k))
}

/** «Standart»: the page's default set ticked again (the hidden filters the person cannot change stay as they are) */
export function standardTicks(defaults: readonly string[], lockedOn: readonly string[]): string[] {
  return [...new Set([...defaults, ...lockedOn])]
}

/** one POST …/fields/fill: one entity, at most 20 fields */
export interface FillCall {
  entity: Entity
  codes: string[]
}

export const FILL_CHUNK = 20

/** the fields to read, one call per entity (lead first), 20 fields a call */
export function fillCalls(fields: readonly Pick<PortalField, 'entity' | 'code'>[]): FillCall[] {
  const out: FillCall[] = []
  for (const entity of ['lead', 'deal'] as const) {
    const codes = [...new Set(fields.filter((f) => f.entity === entity).map((f) => f.code))]
    for (let i = 0; i < codes.length; i += FILL_CHUNK) out.push({ entity, codes: codes.slice(i, i + FILL_CHUNK) })
  }
  return out
}

/** what «Qo'llash» does */
export interface ApplyPlan {
  /** fields of the data to add (to the page, or to the hidden filters when `hidden`) */
  add: string[]
  hidden: boolean
  /** the page's filters unticked */
  remove: string[]
  /** hidden filters unticked (only someone who may change them) */
  removeHidden: string[]
  /** fields not read yet: read in, then added once the data has them */
  pending: PortalField[]
  /** fields that waited for their data and were unticked: no longer added when it comes */
  unwait: string[]
  fills: FillCall[]
  /** ticked beyond the 20 filters a page (or the hidden list) holds: left out */
  over: number
}

export interface ApplyInput {
  /** the page's filters now (their keys, in order) */
  shown: readonly string[]
  /** the dashboard's hidden filters now */
  hidden: readonly string[]
  /** fields already waiting for their data (added before, not in the data yet) */
  waiting?: readonly string[]
  /** ticked in the window, in the order they were ticked */
  ticked: readonly string[]
  /** «Yashirin» on: the new ones become hidden filters */
  asHidden: boolean
  /** may change hidden filters (a Studio user in edit mode) */
  hideable: boolean
  /** the ticked keys that are portal fields not read yet */
  missing: ReadonlyMap<string, PortalField>
  /** of those, the ones a fill already reads (or has read): no second read */
  reading?: ReadonlySet<string>
  max?: number
}

/**
 * The window's ticks against the page: the unticked filters come off, the newly ticked ones are added — up to the 20 a
 * page holds, in the order they were ticked — those not read yet go to `pending` and their reads to `fills`.
 */
export function planApply(x: ApplyInput): ApplyPlan {
  const max = x.max ?? MAX_FILTERS
  const on = new Set(x.ticked)
  const remove = x.shown.filter((k) => !on.has(k))
  const unwait = (x.waiting ?? []).filter((k) => !on.has(k))
  const removeHidden = x.hideable ? x.hidden.filter((k) => !on.has(k)) : []
  const hidden = x.asHidden && x.hideable
  const had = new Set([...x.shown, ...x.hidden, ...(x.waiting ?? [])])
  const fresh = x.ticked.filter((k, i) => x.ticked.indexOf(k) === i && !had.has(k))
  const after = hidden ? x.hidden.length - removeHidden.length : x.shown.length - remove.length + (x.waiting?.length ?? 0) - unwait.length
  const room = Math.max(0, max - after)
  const take = fresh.slice(0, room)
  const pending = take.map((k) => x.missing.get(k)).filter((f): f is PortalField => !!f)
  return {
    add: take.filter((k) => !x.missing.has(k)),
    hidden,
    remove,
    removeHidden,
    pending,
    unwait,
    fills: fillCalls(pending.filter((f) => !x.reading?.has(portalKey(f)))),
    over: fresh.length - take.length,
  }
}

/** nothing to do: «Qo'llash» only closes the window */
export const isNoop = (p: ApplyPlan) => !p.add.length && !p.remove.length && !p.removeHidden.length && !p.pending.length && !p.unwait.length
