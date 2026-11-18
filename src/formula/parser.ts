import { FormulaError, type BinOp, type Node } from './ast'
import { lex, type Token } from './lexer'

/**
 * Pratt parser. Precedence (low → high): OR, AND, NOT, comparison / IN, + -, * / %, unary -, call/atom.
 * Keywords are case-insensitive. CASE WHEN … THEN … [ELSE …] END is supported next to IF().
 */
const BP: Record<string, number> = { OR: 1, AND: 2, '=': 4, '!=': 4, '<': 4, '<=': 4, '>': 4, '>=': 4, IN: 4, NOT_IN: 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 }

export function parse(src: string): Node {
  const toks = lex(src)
  let p = 0
  const peek = (): Token => toks[p]!
  const next = (): Token => toks[p++]!
  const isKw = (t: Token, kw: string) => t.k === 'ident' && t.v.toUpperCase() === kw

  const expect = (k: Token['k'], what: string): Token => {
    const t = next()
    if (t.k !== k) throw new FormulaError('{what} kutilgan edi', t.s, Math.max(t.e, t.s + 1), { what })
    return t
  }

  function infixOp(t: Token): string | null {
    if (t.k === 'op') return t.v
    if (t.k !== 'ident') return null
    const u = t.v.toUpperCase()
    if (u === 'AND' || u === 'OR' || u === 'IN') return u
    if (u === 'NOT' && isKw(toks[p + 1]!, 'IN')) return 'NOT_IN'
    return null
  }

  function expr(minBp = 0): Node {
    let left = prefix()
    for (;;) {
      const t = peek()
      const op = infixOp(t)
      if (!op) break
      const bp = BP[op]
      if (bp === undefined || bp <= minBp) break
      next()
      if (op === 'IN' || op === 'NOT_IN') {
        if (op === 'NOT_IN') next() // consume IN
        expect('(', '(')
        const list: Node[] = []
        if (peek().k !== ')') {
          list.push(expr())
          while (peek().k === ',') {
            next()
            list.push(expr())
          }
        }
        const close = expect(')', ')')
        left = { k: 'in', x: left, list, not: op === 'NOT_IN', s: left.s, e: close.e }
        continue
      }
      const right = expr(bp)
      left = { k: 'bin', op: op as BinOp, a: left, b: right, s: left.s, e: right.e }
    }
    return left
  }

  function prefix(): Node {
    const t = next()
    switch (t.k) {
      case 'num':
        return { k: 'num', v: Number(t.v), s: t.s, e: t.e }
      case 'str':
        return { k: 'str', v: t.v, s: t.s, e: t.e }
      case 'date':
        return { k: 'date', v: t.v, s: t.s, e: t.e }
      case 'field':
        if (!t.v) throw new FormulaError("Maydon nomi bo'sh", t.s, t.e)
        return { k: 'field', name: t.v, s: t.s, e: t.e }
      case '(': {
        const x = expr()
        const close = expect(')', ')')
        return { ...x, s: t.s, e: close.e }
      }
      case 'op':
        if (t.v === '-') {
          const x = expr(7)
          if (x.k === 'num') return { ...x, v: -x.v, s: t.s }
          return { k: 'unary', op: '-', x, s: t.s, e: x.e }
        }
        if (t.v === '+') return prefix()
        break
      case 'ident': {
        const u = t.v.toUpperCase()
        if (u === 'TRUE' || u === 'FALSE') return { k: 'bool', v: u === 'TRUE', s: t.s, e: t.e }
        if (u === 'NULL') return { k: 'null', s: t.s, e: t.e }
        if (u === 'NOT') {
          const x = expr(3)
          return { k: 'unary', op: 'NOT', x, s: t.s, e: x.e }
        }
        if (u === 'CASE') return parseCase(t)
        if (peek().k === '(') {
          next()
          const args: Node[] = []
          if (peek().k !== ')') {
            args.push(expr())
            while (peek().k === ',') {
              next()
              args.push(expr())
            }
          }
          const close = expect(')', ')')
          return { k: 'call', fn: u, args, s: t.s, e: close.e }
        }
        throw new FormulaError("Noma'lum so'z: {w}. Maydonlar [kvadrat qavs] ichida yoziladi", t.s, t.e, { w: t.v })
      }
      case 'eof':
        throw new FormulaError('Formula tugallanmagan', t.s, t.s + 1)
    }
    throw new FormulaError('Kutilmagan belgi: {ch}', t.s, Math.max(t.e, t.s + 1), { ch: t.v })
  }

  function parseCase(start: Token): Node {
    const whens: [Node, Node][] = []
    let els: Node | null = null
    while (isKw(peek(), 'WHEN')) {
      next()
      const cond = expr()
      if (!isKw(peek(), 'THEN')) throw new FormulaError('THEN kutilgan edi', peek().s, peek().e)
      next()
      whens.push([cond, expr()])
    }
    if (!whens.length) throw new FormulaError('CASE dan keyin WHEN kutilgan edi', peek().s, peek().e)
    if (isKw(peek(), 'ELSE')) {
      next()
      els = expr()
    }
    const end = next()
    if (!(end.k === 'ident' && end.v.toUpperCase() === 'END')) throw new FormulaError('CASE oxirida END kutilgan edi', end.s, Math.max(end.e, end.s + 1))
    return { k: 'case', whens, else: els, s: start.s, e: end.e }
  }

  const node = expr()
  const rest = peek()
  if (rest.k !== 'eof') throw new FormulaError('Ortiqcha belgi: {ch}', rest.s, Math.max(rest.e, rest.s + 1), { ch: rest.v })
  return node
}

/** Field names referenced by a formula (for dependency graphs and "used by" lists). */
export function fieldRefs(n: Node, out = new Set<string>()): Set<string> {
  switch (n.k) {
    case 'field':
      out.add(n.name)
      break
    case 'unary':
      fieldRefs(n.x, out)
      break
    case 'bin':
      fieldRefs(n.a, out)
      fieldRefs(n.b, out)
      break
    case 'call':
      n.args.forEach((a) => fieldRefs(a, out))
      break
    case 'in':
      fieldRefs(n.x, out)
      n.list.forEach((a) => fieldRefs(a, out))
      break
    case 'case':
      n.whens.forEach(([c, v]) => (fieldRefs(c, out), fieldRefs(v, out)))
      if (n.else) fieldRefs(n.else, out)
      break
  }
  return out
}
