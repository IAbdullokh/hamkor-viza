import { FormulaError } from './ast'

export type TokKind = 'num' | 'str' | 'date' | 'field' | 'ident' | 'op' | '(' | ')' | ',' | 'eof'

export interface Token {
  k: TokKind
  v: string
  s: number
  e: number
}

const OPS = ['<=', '>=', '!=', '<>', '==', '+', '-', '*', '/', '%', '=', '<', '>']

/** Tokens for the editor's syntax highlighting as well as the parser. Never throws when `lenient` is set. */
export function lex(src: string, lenient = false): Token[] {
  const out: Token[] = []
  let i = 0
  const push = (k: TokKind, v: string, s: number) => out.push({ k, v, s, e: i })
  while (i < src.length) {
    const ch = src[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const s = i
    // -- line comment
    if (ch === '-' && src[i + 1] === '-') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      while (i < src.length && /[0-9_]/.test(src[i]!)) i++
      if (src[i] === '.') {
        i++
        while (i < src.length && /[0-9]/.test(src[i]!)) i++
      }
      if (/[eE]/.test(src[i] ?? '') && /[-+0-9]/.test(src[i + 1] ?? '')) {
        i += 2
        while (i < src.length && /[0-9]/.test(src[i]!)) i++
      }
      push('num', src.slice(s, i).replace(/_/g, ''), s)
      continue
    }
    if (ch === '"' || ch === "'") {
      i++
      let v = ''
      while (i < src.length && src[i] !== ch) {
        if (src[i] === '\\' && i + 1 < src.length) i++
        v += src[i]
        i++
      }
      if (i >= src.length) {
        if (lenient) {
          push('str', v, s)
          break
        }
        throw new FormulaError('Satr yopilmagan: {q} belgisi yetishmaydi', s, i, { q: ch })
      }
      i++
      push('str', v, s)
      continue
    }
    if (ch === '#') {
      // #2026-10-01#
      const m = /^#(\d{4}-\d{2}-\d{2})#/.exec(src.slice(i))
      if (!m) {
        if (lenient) {
          i++
          continue
        }
        throw new FormulaError("Sana #YYYY-MM-DD# ko'rinishida bo'lishi kerak", s, s + 1)
      }
      i += m[0].length
      push('date', m[1]!, s)
      continue
    }
    if (ch === '[') {
      i++
      let v = ''
      while (i < src.length && src[i] !== ']') v += src[i++]
      if (i >= src.length) {
        if (lenient) {
          push('field', v, s)
          break
        }
        throw new FormulaError('Maydon nomi yopilmagan: ] yetishmaydi', s, i)
      }
      i++
      push('field', v.trim(), s)
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i]!)) i++
      push('ident', src.slice(s, i), s)
      continue
    }
    if (ch === '(' || ch === ')' || ch === ',') {
      i++
      push(ch, ch, s)
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (op) {
      i += op.length
      push('op', op === '<>' ? '!=' : op === '==' ? '=' : op, s)
      continue
    }
    if (lenient) {
      i++
      continue
    }
    throw new FormulaError('Tushunarsiz belgi: {ch}', s, s + 1, { ch })
  }
  out.push({ k: 'eof', v: '', s: src.length, e: src.length })
  return out
}
