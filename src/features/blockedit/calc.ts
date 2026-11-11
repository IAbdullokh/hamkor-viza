import { fmtDuration, fmtMoney, fmtNum } from '@/lib/format'
import type { Lang } from '@/lib/settings'

/**
 * A column calculated from a table's own columns (owner, 2026-11-05: "that should be able to do everything on this table
 * even logic"): `[Sotuv] / [Lidlar] * 100`. Only numbers, [column keys], + - * / and brackets: no names, calls or code, so
 * a saved formula can never run anything. The server checks the same grammar (BlockCalc.cs). The Jami row applies the
 * formula to the columns' totals, so a ratio's total is the real ratio, not a sum of ratios.
 */
/** 'time': seconds shown as m:ss / h:mm:ss (a call's Davomiylik) */
export type CalcFormat = 'num' | 'pct' | 'sum' | 'time'
export interface CalcColumn {
  key: string
  label: string
  formula: string
  format?: CalcFormat
}

export const MAX_CALC = 6
export const MAX_FORMULA = 300
const KEY_RE = /^calc_[a-z0-9_]{1,30}$/

type Node = { n: number } | { ref: string } | { op: '+' | '-' | '*' | '/'; a: Node; b: Node } | { neg: Node }

function tokens(src: string): string[] | null {
  const out: string[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (/\s/.test(c)) i++
    else if ('+-*/()'.includes(c)) (out.push(c), i++)
    else if (c === '[') {
      const end = src.indexOf(']', i)
      if (end <= i + 1) return null
      out.push(src.slice(i, end + 1))
      i = end + 1
    } else {
      const m = /^\d+(\.\d+)?/.exec(src.slice(i))
      if (!m) return null
      out.push(m[0])
      i += m[0].length
    }
  }
  return out
}

/** the formula as a tree, or null when it is not `numbers, [keys], + - * / ( )` */
export function parseCalc(src: string): Node | null {
  if (src.length > MAX_FORMULA) return null
  const found = tokens(src)
  if (!found?.length) return null
  const ts: string[] = found
  let p = 0
  const atom = (): Node | null => {
    const t = ts[p]
    if (t === undefined) return null
    p++
    if (t === '-') {
      const v = atom()
      return v && { neg: v }
    }
    if (t === '(') {
      const v = sum()
      if (!v || ts[p] !== ')') return null
      p++
      return v
    }
    if (t[0] === '[') return { ref: t.slice(1, -1) }
    return /^\d/.test(t) ? { n: Number(t) } : null
  }
  const product = (): Node | null => {
    let a = atom()
    while (a && (ts[p] === '*' || ts[p] === '/')) {
      const op = ts[p++] as '*' | '/'
      const b = atom()
      a = b && { op, a, b }
    }
    return a
  }
  function sum(): Node | null {
    let a = product()
    while (a && (ts[p] === '+' || ts[p] === '-')) {
      const op = ts[p++] as '+' | '-'
      const b = product()
      a = b && { op, a, b }
    }
    return a
  }
  const tree = sum()
  return tree && p === ts.length ? tree : null
}

/** the column keys a formula reads */
export function calcRefs(node: Node): string[] {
  if ('ref' in node) return [node.ref]
  if ('neg' in node) return calcRefs(node.neg)
  if ('op' in node) return [...calcRefs(node.a), ...calcRefs(node.b)]
  return []
}

/** the value, or null when a column has no number or it divides by zero (an empty cell, never Infinity) */
export function evalCalc(node: Node, get: (key: string) => unknown): number | null {
  if ('n' in node) return node.n
  if ('ref' in node) {
    const v = get(node.ref)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  if ('neg' in node) {
    const v = evalCalc(node.neg, get)
    return v === null ? null : -v
  }
  const a = evalCalc(node.a, get)
  const b = evalCalc(node.b, get)
  if (a === null || b === null) return null
  if (node.op === '/' && b === 0) return null
  return node.op === '+' ? a + b : node.op === '-' ? a - b : node.op === '*' ? a * b : a / b
}

/** a stored list made safe: bad entries dropped, keys unique, at most MAX_CALC */
export function cleanCalc(v: unknown): CalcColumn[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: CalcColumn[] = []
  for (const c of v as Partial<CalcColumn>[]) {
    if (!c || typeof c.key !== 'string' || !KEY_RE.test(c.key) || seen.has(c.key)) continue
    if (typeof c.label !== 'string' || !c.label.trim() || /[<>]/.test(c.label) || c.label.length > 40) continue
    if (typeof c.formula !== 'string' || !parseCalc(c.formula)) continue
    seen.add(c.key)
    out.push({ key: c.key, label: c.label.trim(), formula: c.formula, ...(c.format === 'pct' || c.format === 'sum' || c.format === 'time' ? { format: c.format } : {}) })
    if (out.length === MAX_CALC) break
  }
  return out
}

export function formatCalc(v: number, format: CalcFormat | undefined, lang: Lang): string {
  if (format === 'pct') return `${fmtNum(v, 1, lang)}%`
  if (format === 'sum') return fmtMoney(v, lang)
  if (format === 'time') return Number.isFinite(v) ? fmtDuration(v) : '—'
  return fmtNum(v, Number.isInteger(v) ? 0 : 2, lang)
}

interface CalcBase<R> {
  key: string
  label: string
  value: (row: R) => string | number | null
  format?: (v: number) => string
  total?: (rows: R[]) => string | number | null
}

/**
 * The table's columns with its calculated ones after them. A formula naming a column the table does not have now (the
 * page changed) is left out, not shown wrong; a calculated column may read one before it.
 */
export function withCalc<R, C extends CalcBase<R>>(columns: C[], calc: CalcColumn[] | undefined, lang: Lang): C[] {
  if (!calc?.length) return columns
  const out = [...columns]
  for (const c of calc) {
    const tree = parseCalc(c.formula)
    if (!tree || out.some((x) => x.key === c.key)) continue
    const uses = calcRefs(tree).map((k) => out.find((x) => x.key === k))
    if (uses.some((u) => !u)) continue
    const known = uses as C[]
    const byKey = new Map(known.map((u) => [u.key, u]))
    out.push({
      key: c.key,
      label: c.label,
      value: (row: R) => evalCalc(tree, (k) => byKey.get(k)!.value(row)),
      format: (v: number) => formatCalc(v, c.format, lang),
      // the Jami row only when every column it reads has a total
      ...(known.every((u) => u.total) ? { total: (rows: R[]) => evalCalc(tree, (k) => byKey.get(k)!.total!(rows)) } : {}),
    } as unknown as C)
  }
  return out
}
