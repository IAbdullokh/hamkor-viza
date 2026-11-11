import { FormulaError, type BinOp, type Node, type ValueType } from './ast'
import { FUNCTIONS, sqlStr, toMs, UNITS } from './functions'
import { parse } from './parser'

/**
 * Type-checks a formula and compiles it to BOTH a JS evaluator and Postgres SQL text in one pass,
 * so the numbers shown in the demo and the SQL shown in the SQL tab always describe the same thing.
 *
 * Aggregation rules (like DataLens): an expression is either row-level (a dimension) or aggregated (a measure).
 * Aggregates can't nest, and aggregated and row-level fields can't be mixed except with constants.
 */
export type Row = Record<string, unknown>

/** What the resolver returns for a [Field] reference. */
export interface FieldInfo {
  type: ValueType
  agg: boolean
  /** row-level getter (when !agg) */
  row?: (r: Row) => unknown
  /** group getter (when agg) */
  group?: (rows: Row[]) => unknown
  sql: string
}

export type Resolver = (name: string) => FieldInfo | null | undefined

export interface Compiled {
  type: ValueType
  agg: boolean
  constant: boolean
  row: (r: Row) => unknown
  group: (rows: Row[]) => unknown
  sql: string
  /** precedence of the top-level SQL operator (for parenthesising) */
  prec: number
}

const PREC: Record<BinOp, number> = { OR: 1, AND: 2, '=': 4, '!=': 4, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 }
const ATOM = 9

const isTemporal = (t: ValueType) => t === 'date' || t === 'datetime'

function notAgg(): never {
  throw new Error('row() called on an aggregated expression')
}

function leaf(type: ValueType, value: unknown, sql: string): Compiled {
  return { type, agg: false, constant: true, row: () => value, group: () => value, sql, prec: ATOM }
}

function wrap(c: Compiled, parentPrec: number, right = false): string {
  return c.prec < parentPrec || (right && c.prec === parentPrec) ? `(${c.sql})` : c.sql
}

export function compileNode(n: Node, resolve: Resolver): Compiled {
  switch (n.k) {
    case 'num':
      return leaf('number', n.v, String(n.v))
    case 'str':
      return leaf('string', n.v, sqlStr(n.v))
    case 'bool':
      return leaf('boolean', n.v, n.v ? 'TRUE' : 'FALSE')
    case 'null':
      return leaf('null', null, 'NULL')
    case 'date':
      return leaf('date', n.v, `DATE '${n.v}'`)
    case 'field': {
      const f = resolve(n.name)
      if (!f) throw new FormulaError("Bunday maydon yo'q: [{name}]", n.s, n.e, { name: n.name })
      const atomic = /^"[^"]+"$|^[A-Za-z_][\w.]*$/.test(f.sql)
      const sql = atomic ? f.sql : `(${f.sql})`
      if (f.agg) return { type: f.type, agg: true, constant: false, row: notAgg, group: f.group!, sql, prec: ATOM }
      const row = f.row!
      return { type: f.type, agg: false, constant: false, row, group: (rows) => (rows.length ? row(rows[0]!) : null), sql, prec: ATOM }
    }
    case 'unary': {
      const x = compileNode(n.x, resolve)
      if (n.op === '-') {
        if (x.type !== 'number' && x.type !== 'any' && x.type !== 'null') throw new FormulaError('Minus faqat songa qo\'llanadi', n.s, n.e)
        const f = (v: unknown) => (v === null || v === undefined ? null : -(v as number))
        return { ...x, row: x.agg ? notAgg : (r) => f(x.row(r)), group: (rows) => f(x.group(rows)), sql: `-${wrap(x, 7)}`, prec: 7 }
      }
      const f = (v: unknown) => (v === null || v === undefined ? null : v !== true)
      return { ...x, type: 'boolean', row: x.agg ? notAgg : (r) => f(x.row(r)), group: (rows) => f(x.group(rows)), sql: `NOT ${wrap(x, 3)}`, prec: 3 }
    }
    case 'bin':
      return compileBin(n, resolve)
    case 'in': {
      const x = compileNode(n.x, resolve)
      const list = n.list.map((it) => compileNode(it, resolve))
      for (const [i, it] of list.entries()) if (!it.constant) throw new FormulaError("IN ro'yxatida faqat o'zgarmas qiymatlar bo'ladi", n.list[i]!.s, n.list[i]!.e)
      const set = new Set(list.map((it) => it.row({})))
      const f = (v: unknown) => (v === null || v === undefined ? null : n.not ? !set.has(v) : set.has(v))
      return {
        type: 'boolean',
        agg: x.agg,
        constant: x.constant,
        row: x.agg ? notAgg : (r) => f(x.row(r)),
        group: (rows) => f(x.group(rows)),
        sql: `${wrap(x, 4)} ${n.not ? 'NOT IN' : 'IN'} (${list.map((it) => it.sql).join(', ')})`,
        prec: 4,
      }
    }
    case 'case': {
      const parts = n.whens.map(([c, v]) => [compileNode(c, resolve), compileNode(v, resolve)] as const)
      const els = n.else ? compileNode(n.else, resolve) : null
      const all = [...parts.flat(), ...(els ? [els] : [])]
      checkMix(all, n, [...n.whens.flat(), ...(n.else ? [n.else] : [])])
      const agg = all.some((c) => c.agg)
      const type = parts.map(([, v]) => v.type).find((t) => t !== 'null') ?? els?.type ?? 'null'
      const pick = (get: (c: Compiled) => unknown) => {
        for (const [c, v] of parts) if (get(c) === true) return get(v)
        return els ? get(els) : null
      }
      return {
        type,
        agg,
        constant: all.every((c) => c.constant),
        row: agg ? notAgg : (r) => pick((c) => c.row(r)),
        group: (rows) => pick((c) => c.group(rows)),
        sql: `CASE ${parts.map(([c, v]) => `WHEN ${c.sql} THEN ${v.sql}`).join(' ')}${els ? ` ELSE ${els.sql}` : ''} END`,
        prec: ATOM,
      }
    }
    case 'call':
      return compileCall(n, resolve)
  }
}

function checkMix(parts: Compiled[], n: Node, nodes?: Node[]) {
  const hasAgg = parts.some((p) => p.agg)
  const rowIdx = parts.findIndex((p) => !p.agg && !p.constant)
  if (hasAgg && rowIdx >= 0) {
    // point at the row-level operand — that's the one to wrap in an aggregate
    const at = nodes?.[rowIdx] ?? n
    throw new FormulaError("Agregat (SUM, COUNT…) va oddiy maydonni bitta ifodada aralashtirib bo'lmaydi — bu qismni agregatga o'rang", at.s, at.e)
  }
}

function binJs(op: BinOp, ta: ValueType, tb: ValueType): (a: unknown, b: unknown) => unknown {
  const temporalMix = (isTemporal(ta) || isTemporal(tb)) && ta !== tb
  const norm = temporalMix ? (v: unknown) => toMs(v) : (v: unknown) => v
  switch (op) {
    case '+':
      return (a, b) => (a == null || b == null ? null : typeof a === 'string' || typeof b === 'string' ? `${a}${b}` : (a as number) + (b as number))
    case '-':
      return (a, b) => (a == null || b == null ? null : (a as number) - (b as number))
    case '*':
      return (a, b) => (a == null || b == null ? null : (a as number) * (b as number))
    case '/':
      return (a, b) => (a == null || b == null || b === 0 ? null : (a as number) / (b as number))
    case '%':
      return (a, b) => (a == null || b == null || b === 0 ? null : (a as number) % (b as number))
    case '=':
      return (a, b) => (a == null || b == null ? null : norm(a) === norm(b))
    case '!=':
      return (a, b) => (a == null || b == null ? null : norm(a) !== norm(b))
    case '<':
      return (a, b) => (a == null || b == null ? null : (norm(a) as number) < (norm(b) as number))
    case '<=':
      return (a, b) => (a == null || b == null ? null : (norm(a) as number) <= (norm(b) as number))
    case '>':
      return (a, b) => (a == null || b == null ? null : (norm(a) as number) > (norm(b) as number))
    case '>=':
      return (a, b) => (a == null || b == null ? null : (norm(a) as number) >= (norm(b) as number))
    case 'AND':
      return (a, b) => a === true && b === true
    case 'OR':
      return (a, b) => a === true || b === true
  }
}

function compileBin(n: Extract<Node, { k: 'bin' }>, resolve: Resolver): Compiled {
  const a = compileNode(n.a, resolve)
  const b = compileNode(n.b, resolve)
  checkMix([a, b], n, [n.a, n.b])
  const op = n.op
  let type: ValueType
  if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
    const okNum = (t: ValueType) => t === 'number' || t === 'any' || t === 'null'
    if (op === '+' && (a.type === 'string' || b.type === 'string')) type = 'string'
    else if (!okNum(a.type) || !okNum(b.type)) {
      const bad = okNum(a.type) ? n.b : n.a
      throw new FormulaError('"{op}" amali uchun son kerak', bad.s, bad.e, { op })
    } else type = 'number'
  } else if (op === 'AND' || op === 'OR') {
    for (const [c, node] of [[a, n.a], [b, n.b]] as const)
      if (c.type !== 'boolean' && c.type !== 'any' && c.type !== 'null') throw new FormulaError('{op} uchun shart (rost/yolg\'on) kerak', node.s, node.e, { op })
    type = 'boolean'
  } else {
    const num = (t: ValueType) => t === 'number'
    const str = (t: ValueType) => t === 'string'
    if ((num(a.type) && str(b.type)) || (str(a.type) && num(b.type))) throw new FormulaError("Son va matnni solishtirib bo'lmaydi", n.s, n.e)
    type = 'boolean'
  }
  const f = binJs(op, a.type, b.type)
  const agg = a.agg || b.agg
  const lazyAnd = op === 'AND' ? (x: () => unknown, y: () => unknown) => x() === true && y() === true : op === 'OR' ? (x: () => unknown, y: () => unknown) => x() === true || y() === true : null
  const prec = PREC[op]
  let sqlOp: string = op === '!=' ? '<>' : op === '%' ? '%' : op
  let bSql = wrap(b, prec, true)
  if (op === '/') bSql = `NULLIF(${b.sql}, 0)`
  if (op === '/' && a.type === 'number') sqlOp = '/'
  const sql = op === '/' ? `${wrap(a, prec)}::numeric / ${bSql}` : `${wrap(a, prec)} ${sqlOp} ${bSql}`
  return {
    type,
    agg,
    constant: a.constant && b.constant,
    row: agg ? notAgg : lazyAnd ? (r) => lazyAnd(() => a.row(r), () => b.row(r)) : (r) => f(a.row(r), b.row(r)),
    group: lazyAnd ? (rows) => lazyAnd(() => a.group(rows), () => b.group(rows)) : (rows) => f(a.group(rows), b.group(rows)),
    sql,
    prec,
  }
}

function compileCall(n: Extract<Node, { k: 'call' }>, resolve: Resolver): Compiled {
  const def = FUNCTIONS[n.fn]
  if (!def) throw new FormulaError("Noma'lum funksiya: {fn}", n.s, n.s + n.fn.length, { fn: n.fn })
  if (n.args.length < def.min || n.args.length > def.max) {
    const want = def.min === def.max ? String(def.min) : `${def.min}–${def.max}`
    throw new FormulaError('{fn} {want} ta argument oladi, {got} ta berildi', n.s, n.e, { fn: n.fn, want, got: n.args.length })
  }
  const args = n.args.map((a) => compileNode(a, resolve))
  args.forEach((c, i) => {
    const want = def.args[Math.min(i, def.args.length - 1)] ?? 'any'
    if (want === 'any' || c.type === 'any' || c.type === 'null') return
    if (want === 'number' && c.type !== 'number') throw new FormulaError('{fn}: {i}-argument son bo\'lishi kerak', n.args[i]!.s, n.args[i]!.e, { fn: n.fn, i: i + 1 })
    if (want === 'boolean' && c.type !== 'boolean') throw new FormulaError('{fn}: {i}-argument shart bo\'lishi kerak (masalan [Manba] = "Instagram")', n.args[i]!.s, n.args[i]!.e, { fn: n.fn, i: i + 1 })
    if (want === 'string' && c.type !== 'string') throw new FormulaError('{fn}: {i}-argument matn bo\'lishi kerak', n.args[i]!.s, n.args[i]!.e, { fn: n.fn, i: i + 1 })
  })
  if ((n.fn === 'DATETRUNC' || n.fn === 'DATEADD') && args[1]?.constant) {
    const unit = String(args[1].row({}))
    if (!(UNITS as readonly string[]).includes(unit)) throw new FormulaError('Davr birligi: "day", "week", "month", "quarter" yoki "year"', n.args[1]!.s, n.args[1]!.e)
  }
  const types = args.map((a) => a.type)
  const sql = def.sql(args.map((a) => a.sql))

  if (def.kind === 'agg') {
    args.forEach((a, i) => {
      if (a.agg) throw new FormulaError("Agregat ichida agregat bo'lishi mumkin emas", n.args[i]!.s, n.args[i]!.e)
    })
    const getters = args.map((a) => a.row)
    return {
      type: def.ret(types),
      agg: true,
      constant: false,
      row: notAgg,
      group: (rows) => def.js(getters.map((g) => rows.map(g)), rows.length),
      sql,
      prec: ATOM,
    }
  }

  checkMix(args, n, n.args)
  const agg = args.some((a) => a.agg)
  const constant = args.every((a) => a.constant) && n.fn !== 'TODAY'
  if (def.lazy) {
    return {
      type: def.ret(types),
      agg,
      constant,
      row: agg ? notAgg : (r) => def.js(...args.map((a) => () => a.row(r))),
      group: (rows) => def.js(...args.map((a) => () => a.group(rows))),
      sql,
      prec: ATOM,
    }
  }
  return {
    type: def.ret(types),
    agg,
    constant,
    row: agg ? notAgg : (r) => def.js(...args.map((a) => a.row(r))),
    group: (rows) => def.js(...args.map((a) => a.group(rows))),
    sql,
    prec: ATOM,
  }
}

export type CompileResult = { ok: true; compiled: Compiled; ast: Node } | { ok: false; error: FormulaError }

/** Parse + check + compile; never throws (errors come back with positions for the editor). */
export function compileFormula(src: string, resolve: Resolver): CompileResult {
  try {
    const ast = parse(src)
    return { ok: true, compiled: compileNode(ast, resolve), ast }
  } catch (e) {
    if (e instanceof FormulaError) return { ok: false, error: e }
    return { ok: false, error: new FormulaError(String((e as Error).message ?? e), 0, src.length) }
  }
}
