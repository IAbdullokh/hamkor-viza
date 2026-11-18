import { compileFormula, FormulaError, type Compiled, type FieldInfo, type Row } from '@/formula'
import type { DatasetField, DatasetSpec, FilterSpec, OwnMeasure, QueryResult, ResultColumn } from '@/spec'
import type { Db } from './db'
import { datasetsFor } from './datasets'
import { dayKey, type DateRange } from './range'
import { customFieldsFor, customFieldsVersion } from './customFields'
import { tablesFor, type Column, type TableDef } from './tables'
import { getWorkspace } from './workspaces'
import { userFields, userFieldsVersion } from './userFields'

/**
 * Dataset runtime + query engine. A dataset is compiled once (formulas → JS + SQL); a query groups the
 * workspace's rows by dimensions and evaluates measures per group, returning rows plus the equivalent SQL.
 */
export interface FieldRuntime {
  field: DatasetField
  compiled: Compiled | null
  error: FormulaError | null
}

export interface DatasetRuntime {
  wsId: string
  spec: DatasetSpec
  table: TableDef
  fields: FieldRuntime[]
  byId: Map<string, FieldRuntime>
  byName: Map<string, FieldRuntime>
  /** compile an ad-hoc formula against this dataset (formula editor live preview) */
  compile: (src: string, selfName?: string) => ReturnType<typeof compileFormula>
}

export function buildDataset(wsId: string, spec: DatasetSpec, extraColumns: Column[] = []): DatasetRuntime {
  const ws = getWorkspace(wsId)
  const base = tablesFor(ws).find((t) => t.name === spec.table)
  if (!base) throw new Error(`table ${spec.table} not found`)
  const table = extraColumns.length ? { ...base, columns: [...base.columns, ...extraColumns] } : base
  const cols = new Map(table.columns.map((c) => [c.name, c]))
  const fieldByName = new Map(spec.fields.map((f) => [f.name, f]))
  const done = new Map<string, FieldRuntime>()
  const inProgress = new Set<string>()

  const columnInfo = (name: string): FieldInfo | null => {
    const c = cols.get(name)
    return c ? { type: c.type, agg: false, row: c.get as (r: Row) => unknown, sql: c.sql } : null
  }

  const resolverFor = (selfName?: string) => (name: string): FieldInfo | null => {
    const f = fieldByName.get(name)
    // A field whose formula is just its own column ("[Manba]") resolves to the column.
    if (!f || name === selfName || inProgress.has(name)) {
      if (inProgress.has(name) && name !== selfName && !cols.has(name)) throw new FormulaError('Aylanma havola: [{name}] o‘ziga bog‘liq', 0, 0, { name })
      return columnInfo(name)
    }
    const rt = compileField(f)
    if (!rt.compiled) throw new FormulaError('[{name}] maydonida xato bor', 0, 0, { name })
    const c = rt.compiled
    return { type: c.type, agg: c.agg, row: c.agg ? undefined : c.row, group: c.agg ? c.group : undefined, sql: c.sql }
  }

  function compileField(f: DatasetField): FieldRuntime {
    const cached = done.get(f.id)
    if (cached) return cached
    inProgress.add(f.name)
    const res = compileFormula(f.formula, resolverFor(f.name))
    inProgress.delete(f.name)
    const rt: FieldRuntime = res.ok ? { field: f, compiled: res.compiled, error: null } : { field: f, compiled: null, error: res.error }
    done.set(f.id, rt)
    return rt
  }

  const fields = spec.fields.map(compileField)
  return {
    wsId,
    spec,
    table,
    fields,
    byId: new Map(fields.map((f) => [f.field.id, f])),
    byName: new Map(fields.map((f) => [f.field.name, f])),
    compile: (src, selfName) => compileFormula(src, resolverFor(selfName)),
  }
}

const runtimeCache = new Map<string, DatasetRuntime>()

/**
 * Dataset of a workspace = built-in fields + a live project's own Bitrix fields + the user's calculated fields (cached
 * per user-field and custom-field version).
 */
export function getDataset(wsId: string, datasetId: string): DatasetRuntime {
  const key = `${wsId}|${datasetId}|${userFieldsVersion()}|${customFieldsVersion()}`
  let rt = runtimeCache.get(key)
  if (!rt) {
    const spec = datasetsFor(getWorkspace(wsId)).find((d) => d.id === datasetId)
    if (!spec) throw new Error(`dataset ${datasetId} not found in ${wsId}`)
    const columns = tablesFor(getWorkspace(wsId)).find((t) => t.name === spec.table)?.columns ?? []
    const custom = customFieldsFor(wsId, datasetId, new Set([...columns.map((c) => c.name), ...spec.fields.map((f) => f.name)]))
    const own = [...spec.fields, ...custom.fields]
    const extra = userFields(wsId, datasetId).filter((f) => !own.some((b) => b.id === f.id))
    rt = buildDataset(wsId, own.length > spec.fields.length || extra.length ? { ...spec, fields: [...own, ...extra] } : spec, custom.columns)
    runtimeCache.set(key, rt)
  }
  return rt
}

export interface Query {
  dims: string[]
  measures: string[]
  filters?: FilterSpec[]
  range?: DateRange | null
  /** a date dimension's id: the period counts by it (rows with no such date are outside); none = the dataset's date */
  dateField?: string
  sort?: { field: string; dir: 'asc' | 'desc' }
  limit?: number
}

/** a multi-value field is grouped as "A, B": it holds a listed value when one of its items is that value */
function holds(v: unknown, vals: FilterSpec['values']): boolean {
  if (vals.includes(v as never)) return true
  return typeof v === 'string' && v.includes(', ') && v.split(', ').some((x) => vals.includes(x))
}

/** a date field's value as a moment: a plain day is that day's local start */
function momentOf(v: unknown): number {
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v !== 'string' || !v) return NaN
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!).getTime() : Date.parse(v)
}

/**
 * The dataset with a chart's own measures added, for that chart only: a formula that does not compile here or is not an
 * aggregate is left out, so it can only read this dataset's fields through the formula language.
 */
export function withOwnMeasures(ds: DatasetRuntime, own: OwnMeasure[] | undefined): DatasetRuntime {
  if (!own?.length) return ds
  const added: FieldRuntime[] = []
  for (const o of own) {
    if (ds.byId.has(o.id) || ds.byName.has(o.name)) continue
    const res = ds.compile(o.formula, o.name)
    if (!res.ok || !res.compiled.agg) continue
    added.push({ field: { id: o.id, name: o.name, kind: 'measure', formula: o.formula, format: o.format }, compiled: res.compiled, error: null })
  }
  if (!added.length) return ds
  const fields = [...ds.fields, ...added]
  return { ...ds, fields, byId: new Map(fields.map((f) => [f.field.id, f])), byName: new Map(fields.map((f) => [f.field.name, f])) }
}

function matches(v: unknown, f: FilterSpec): boolean {
  const vals = f.values
  switch (f.op) {
    case 'in':
      return holds(v, vals)
    case 'not_in':
      return !holds(v, vals)
    case 'eq':
      return v === vals[0]
    case 'neq':
      return v !== vals[0]
    case 'gt':
      return (v as number) > (vals[0] as number)
    case 'gte':
      return (v as number) >= (vals[0] as number)
    case 'lt':
      return (v as number) < (vals[0] as number)
    case 'lte':
      return (v as number) <= (vals[0] as number)
    case 'contains':
      return String(v ?? '').toLowerCase().includes(String(vals[0] ?? '').toLowerCase())
    case 'is_true':
      return v === true
    case 'is_false':
      return v !== true
  }
}

const sqlVal = (v: string | number | boolean) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v).toUpperCase())

function filterSql(sql: string, f: FilterSpec): string {
  const v = f.values
  switch (f.op) {
    case 'in':
      return `${sql} IN (${v.map(sqlVal).join(', ')})`
    case 'not_in':
      return `${sql} NOT IN (${v.map(sqlVal).join(', ')})`
    case 'eq':
      return `${sql} = ${sqlVal(v[0]!)}`
    case 'neq':
      return `${sql} <> ${sqlVal(v[0]!)}`
    case 'gt':
      return `${sql} > ${sqlVal(v[0]!)}`
    case 'gte':
      return `${sql} >= ${sqlVal(v[0]!)}`
    case 'lt':
      return `${sql} < ${sqlVal(v[0]!)}`
    case 'lte':
      return `${sql} <= ${sqlVal(v[0]!)}`
    case 'contains':
      return `${sql} ILIKE ${sqlVal(`%${v[0]}%`)}`
    case 'is_true':
      return `${sql} IS TRUE`
    case 'is_false':
      return `${sql} IS NOT TRUE`
  }
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`

function fmtTs(ms: number): string {
  const d = new Date(ms)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return hm === '00:00' ? dayKey(ms) : `${dayKey(ms)} ${hm}`
}

/** Build the Postgres text for a query (shown in the SQL tab and in "show SQL" on any chart). */
export function querySql(ds: DatasetRuntime, q: Query): string {
  const sel: string[] = []
  const get = (id: string) => ds.byId.get(id)
  for (const id of q.dims) {
    const f = get(id)
    if (f?.compiled) sel.push(`  ${f.compiled.sql} AS ${ident(f.field.name)}`)
  }
  for (const id of q.measures) {
    const f = get(id)
    if (f?.compiled) sel.push(`  ${f.compiled.sql} AS ${ident(f.field.name)}`)
  }
  const where: string[] = []
  if (q.range) {
    const dateCol = ds.table.columns.find((c) => c.name === ds.spec.dateField)
    const basis = q.dateField ? get(q.dateField) : null
    const col = basis?.compiled?.sql ?? dateCol?.sql ?? '"day"'
    where.push(`${col} >= '${fmtTs(q.range.from)}'`, `${col} < '${fmtTs(q.range.to)}'`)
  }
  const having: string[] = []
  for (const f of q.filters ?? []) {
    const rt = get(f.field)
    if (!rt?.compiled) continue
    ;(rt.field.kind === 'measure' ? having : where).push(filterSql(rt.compiled.sql, f))
  }
  const schema = `ws_${ds.wsId}`
  let sql = `SELECT\n${sel.join(',\n') || '  *'}\nFROM ${schema}.${ds.table.name}`
  if (where.length) sql += `\nWHERE ${where.join('\n  AND ')}`
  if (q.dims.length && q.measures.length) sql += `\nGROUP BY ${q.dims.map((_, i) => i + 1).join(', ')}`
  if (having.length) sql += `\nHAVING ${having.join(' AND ')}`
  const sort = q.sort ? get(q.sort.field) : null
  if (sort) sql += `\nORDER BY ${ident(sort.field.name)} ${q.sort!.dir.toUpperCase()}`
  else if (q.dims.length) sql += `\nORDER BY 1`
  if (q.limit) sql += `\nLIMIT ${q.limit}`
  return sql
}

/** Run a query over the workspace's synced rows. */
export function runQuery(db: Db, ds: DatasetRuntime, q: Query): QueryResult {
  const t0 = performance.now()
  const dims = q.dims.map((id) => ds.byId.get(id)).filter((f): f is FieldRuntime => !!f?.compiled)
  const measures = q.measures.map((id) => ds.byId.get(id)).filter((f): f is FieldRuntime => !!f?.compiled)
  const rowFilters: { fn: (r: Row) => unknown; f: FilterSpec }[] = []
  const groupFilters: { fn: (rows: Row[]) => unknown; f: FilterSpec }[] = []
  for (const f of q.filters ?? []) {
    const rt = ds.byId.get(f.field)
    if (!rt?.compiled) continue
    if (rt.compiled.agg) groupFilters.push({ fn: rt.compiled.group, f })
    else rowFilters.push({ fn: rt.compiled.row, f })
  }

  const all = ds.table.rows(db) as Row[]
  const now = Date.now()
  const from = q.range?.from ?? -Infinity
  // a date field the person chose may lie ahead (a booked visit): only the dataset's own date stops at today
  const basis = q.dateField ? ds.byId.get(q.dateField) : undefined
  const on = basis?.compiled && !basis.compiled.agg ? basis.compiled : null
  const to = on ? (q.range?.to ?? Infinity) : Math.min(q.range?.to ?? now, now)
  const ts = (on ? (r: Row) => momentOf(on.row(r)) : ds.table.ts) as (r: Row) => number

  const groups = new Map<string, Row[]>()
  let scanned = 0
  for (const r of all) {
    const tt = ts(r)
    if (Number.isNaN(tt) || tt < from || tt >= to) continue
    let ok = true
    for (const rf of rowFilters) if (!matches(rf.fn(r), rf.f)) {
      ok = false
      break
    }
    if (!ok) continue
    scanned++
    const key = dims.length ? dims.map((d) => String(d.compiled!.row(r))).join('\u0001') : ''
    let g = groups.get(key)
    if (!g) groups.set(key, (g = []))
    g.push(r)
  }

  let rows: unknown[][] = []
  for (const g of groups.values()) {
    if (groupFilters.length && !groupFilters.every((gf) => matches(gf.fn(g), gf.f))) continue
    rows.push([...dims.map((d) => d.compiled!.row(g[0]!)), ...measures.map((m) => m.compiled!.group(g))])
  }
  if (!dims.length && !rows.length && measures.length) rows = [measures.map((m) => m.compiled!.group([]))]

  const columns: ResultColumn[] = [...dims, ...measures].map((f) => ({ id: f.field.id, name: f.field.name, kind: f.field.kind, type: f.compiled!.type, format: f.field.format }))
  const sortIdx = q.sort ? columns.findIndex((c) => c.id === q.sort!.field) : -1
  const firstDimTemporal = dims[0] && (dims[0].compiled!.type === 'date' || dims[0].compiled!.type === 'datetime' || dims[0].compiled!.type === 'number')
  const idx = sortIdx >= 0 ? sortIdx : firstDimTemporal ? 0 : dims.length < columns.length && dims.length ? dims.length : 0
  const dir = sortIdx >= 0 ? (q.sort!.dir === 'asc' ? 1 : -1) : firstDimTemporal ? 1 : -1
  rows.sort((a, b) => {
    const x = a[idx], y = b[idx]
    if (x === y) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    return (x < y ? -1 : 1) * dir
  })
  if (q.limit) rows = rows.slice(0, q.limit)
  return { columns, rows, sql: querySql(ds, q), scanned, ms: performance.now() - t0 }
}

/** Raw rows behind a chart point (drill-down): same range + filters, plus equality on the clicked dimension values. */
export function drillRows(
  db: Db,
  ds: DatasetRuntime,
  opts: { range: DateRange | null; filters: FilterSpec[]; dims: Record<string, unknown>; limit?: number },
): { rows: Record<string, unknown>[]; total: number; sql: string } {
  const eqs = Object.entries(opts.dims)
    .map(([id, v]) => ({ rt: ds.byId.get(id), v }))
    .filter((x): x is { rt: FieldRuntime; v: unknown } => !!x.rt?.compiled && !x.rt.compiled.agg)
  const filters = opts.filters
    .map((f) => ({ rt: ds.byId.get(f.field), f }))
    .filter((x): x is { rt: FieldRuntime; f: FilterSpec } => !!x.rt?.compiled && !x.rt.compiled.agg)
  const from = opts.range?.from ?? -Infinity
  const to = Math.min(opts.range?.to ?? Date.now(), Date.now())
  const limit = opts.limit ?? 300
  const out: Record<string, unknown>[] = []
  let total = 0
  for (const r of ds.table.rows(db) as Row[]) {
    const tt = ds.table.ts(r)
    if (tt < from || tt >= to) continue
    if (!filters.every(({ rt, f }) => matches(rt.compiled!.row(r), f))) continue
    if (!eqs.every(({ rt, v }) => String(rt.compiled!.row(r)) === String(v))) continue
    total++
    out.push(r)
  }
  // newest first, then cut
  out.sort((a, b) => ds.table.ts(b) - ds.table.ts(a))
  out.length = Math.min(out.length, limit)
  const where = [
    ...(opts.range ? [`${ds.table.columns.find((c) => c.name === ds.spec.dateField)?.sql ?? '"day"'} >= '${fmtTs(from)}'`] : []),
    ...filters.map(({ rt, f }) => filterSql(rt.compiled!.sql, f)),
    ...eqs.map(({ rt, v }) => `${rt.compiled!.sql} = ${typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`}`),
  ]
  const sql = `SELECT *\nFROM ws_${ds.wsId}.${ds.table.name}${where.length ? `\nWHERE ${where.join('\n  AND ')}` : ''}\nORDER BY 1 DESC\nLIMIT ${limit}`
  return { rows: out, total, sql }
}

/**
 * Rows came back but no measure has a single value (response time before any lead was answered): false when something
 * can be drawn, else the measure's own reason (DatasetField.empty) or null — the chart says it instead of a blank card.
 */
export function noValues(ds: DatasetRuntime, res: QueryResult): string | null | false {
  const idx = res.columns.flatMap((c, i) => (c.kind === 'measure' ? [i] : []))
  const has = (v: unknown) => v !== null && v !== undefined && (typeof v !== 'number' || Number.isFinite(v))
  if (!idx.length || res.rows.some((r) => idx.some((i) => has(r[i])))) return false
  return idx.map((i) => ds.byId.get(res.columns[i]!.id)?.field.empty).find(Boolean) ?? null
}
