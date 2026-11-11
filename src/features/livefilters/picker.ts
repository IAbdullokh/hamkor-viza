import { MAX_FILTERS, pickerGroups, type FieldDef, type FilterGroup, type FilterKind } from './fields'
import { portalKey, type MissingRow, type PortalField } from './portal'

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
}

export interface PickerSection {
  id: FilterGroup
  /** Uzbek key */
  label: string
  rows: PickerRow[]
}

/** the window's section names (Uzbek keys): the portal's fields under the entity's own name, as Bitrix shows them */
export const SECTION_LABEL: Record<FilterGroup, string> = { main: 'Asosiy maydonlar', utm: 'UTM va reklama', lead: 'Lid', deal: 'Sdelka' }

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
      id: g.id,
      label: SECTION_LABEL[g.id],
      rows: [
        ...g.fields.map((f): PickerRow => ({ key: f.key, label: labelOf(f), kind: f.kind, ...(f.empty ? { empty: true } : {}) })),
        ...g.missing.map((m): PickerRow => ({ key: m.key, label: m.field.title, kind: m.field.kind, missing: m })),
      ],
    }))
}

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
