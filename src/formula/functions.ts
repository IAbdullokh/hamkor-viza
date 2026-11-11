import type { ValueType } from './ast'

/**
 * Function catalog: types, docs (Uzbek, shown in the editor's autocomplete) and
 * implementations for both targets — JS (demo evaluation) and SQL (Postgres text shown in the SQL tab).
 */
export type Category = 'agg' | 'logic' | 'math' | 'text' | 'date'

export interface FnDoc {
  sig: string
  uz: string
  example: string
}

export interface ScalarFn {
  kind: 'scalar'
  cat: Category
  min: number
  max: number
  /** expected arg types ('any' = no check); last entry repeats for variadic */
  args: ValueType[]
  ret: (argTypes: ValueType[]) => ValueType
  /** lazy functions get thunks (IF) */
  lazy?: boolean
  js: (...a: unknown[]) => unknown
  sql: (a: string[]) => string
  doc: FnDoc
}

export interface AggFn {
  kind: 'agg'
  cat: 'agg'
  min: number
  max: number
  args: ValueType[]
  ret: (argTypes: ValueType[]) => ValueType
  /** receives, for each arg, the array of row values */
  js: (cols: unknown[][], n: number) => unknown
  sql: (a: string[]) => string
  doc: FnDoc
}

export type FnDef = ScalarFn | AggFn

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : typeof v === 'number' ? v : Number(v))
const nums = (xs: unknown[]) => xs.map(num).filter((x): x is number => x !== null && !Number.isNaN(x))

export function toMs(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v.length === 10 ? `${v}T00:00:00` : v).getTime()
  return null
}

export function toDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const UNITS = ['day', 'week', 'month', 'quarter', 'year'] as const

function trunc(v: unknown, unit: unknown): string | null {
  const ms = toMs(v)
  if (ms === null) return null
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  switch (String(unit).toLowerCase()) {
    case 'week':
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      break
    case 'month':
      d.setDate(1)
      break
    case 'quarter':
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1)
      break
    case 'year':
      d.setMonth(0, 1)
      break
  }
  return toDay(d.getTime())
}

const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`
const unq = (s: string) => s.replace(/^'|'$/g, '').replace(/''/g, "'")

const sameAsFirst = (t: ValueType[]) => t[0] ?? 'any'
const N = (): ValueType => 'number'
const S = (): ValueType => 'string'
const B = (): ValueType => 'boolean'
const D = (): ValueType => 'date'

export const FUNCTIONS: Record<string, FnDef> = {
  // ---------- aggregates ----------
  SUM: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['number'], ret: N, js: ([c]) => nums(c!).reduce((a, b) => a + b, 0), sql: ([a]) => `SUM(${a})`, doc: { sig: 'SUM(qiymat)', uz: "Qiymatlar yig'indisi", example: 'SUM([Summa])' } },
  AVG: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['number'], ret: N, js: ([c]) => { const x = nums(c!); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null }, sql: ([a]) => `AVG(${a})`, doc: { sig: 'AVG(qiymat)', uz: "O'rtacha qiymat", example: 'AVG([Davomiylik])' } },
  MIN: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['any'], ret: sameAsFirst, js: ([c]) => minMax(c!, -1), sql: ([a]) => `MIN(${a})`, doc: { sig: 'MIN(qiymat)', uz: 'Eng kichik qiymat', example: 'MIN([Sana])' } },
  MAX: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['any'], ret: sameAsFirst, js: ([c]) => minMax(c!, 1), sql: ([a]) => `MAX(${a})`, doc: { sig: 'MAX(qiymat)', uz: 'Eng katta qiymat', example: 'MAX([Summa])' } },
  COUNT: { kind: 'agg', cat: 'agg', min: 0, max: 1, args: ['any'], ret: N, js: (cols, n) => (cols.length ? cols[0]!.filter((v) => v !== null && v !== undefined).length : n), sql: (a) => (a.length ? `COUNT(${a[0]})` : 'COUNT(*)'), doc: { sig: 'COUNT([qiymat])', uz: "Qatorlar soni (bo'sh bo'lmagan qiymatlar)", example: 'COUNT([ID])' } },
  COUNTD: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['any'], ret: N, js: ([c]) => new Set(c!.filter((v) => v !== null && v !== undefined)).size, sql: ([a]) => `COUNT(DISTINCT ${a})`, doc: { sig: 'COUNTD(qiymat)', uz: 'Takrorlanmas qiymatlar soni', example: "COUNTD([Mas'ul])" } },
  COUNT_IF: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['boolean'], ret: N, js: ([c]) => c!.filter((v) => v === true).length, sql: ([a]) => `COUNT(*) FILTER (WHERE ${a})`, doc: { sig: 'COUNT_IF(shart)', uz: 'Shart bajarilgan qatorlar soni', example: 'COUNT_IF([Sifatli])' } },
  SUM_IF: { kind: 'agg', cat: 'agg', min: 2, max: 2, args: ['number', 'boolean'], ret: N, js: ([v, c]) => v!.reduce<number>((s, x, i) => (c![i] === true ? s + (num(x) ?? 0) : s), 0), sql: ([a, c]) => `SUM(${a}) FILTER (WHERE ${c})`, doc: { sig: 'SUM_IF(qiymat, shart)', uz: "Shart bajarilgan qatorlar bo'yicha yig'indi", example: 'SUM_IF([Summa], [Holat] = "won")' } },
  AVG_IF: { kind: 'agg', cat: 'agg', min: 2, max: 2, args: ['number', 'boolean'], ret: N, js: ([v, c]) => { const x = nums(v!.filter((_, i) => c![i] === true)); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null }, sql: ([a, c]) => `AVG(${a}) FILTER (WHERE ${c})`, doc: { sig: 'AVG_IF(qiymat, shart)', uz: "Shart bajarilgan qatorlar bo'yicha o'rtacha", example: 'AVG_IF([Davomiylik], [Javob berildi])' } },
  MEDIAN: { kind: 'agg', cat: 'agg', min: 1, max: 1, args: ['number'], ret: N, js: ([c]) => { const x = nums(c!).sort((a, b) => a - b); if (!x.length) return null; const m = x.length >> 1; return x.length % 2 ? x[m]! : (x[m - 1]! + x[m]!) / 2 }, sql: ([a]) => `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${a})`, doc: { sig: 'MEDIAN(qiymat)', uz: 'Mediana (o\'rta qiymat)', example: 'MEDIAN([Reaksiya, s])' } },

  // ---------- logic ----------
  IF: { kind: 'scalar', cat: 'logic', min: 2, max: 3, args: ['boolean', 'any', 'any'], lazy: true, ret: (t) => (t[1] === 'null' ? (t[2] ?? 'any') : t[1]!), js: (c, a, b) => ((c as () => unknown)() === true ? (a as () => unknown)() : b ? (b as () => unknown)() : null), sql: ([c, a, b]) => `CASE WHEN ${c} THEN ${a}${b !== undefined ? ` ELSE ${b}` : ''} END`, doc: { sig: 'IF(shart, rost_bo\'lsa, aks_holda)', uz: 'Shartga qarab qiymat tanlaydi', example: 'IF([Summa] > 1000000, "Katta", "Kichik")' } },
  IFNULL: { kind: 'scalar', cat: 'logic', min: 2, max: 2, args: ['any', 'any'], ret: sameAsFirst, js: (a, b) => (a === null || a === undefined ? b : a), sql: ([a, b]) => `COALESCE(${a}, ${b})`, doc: { sig: 'IFNULL(qiymat, zaxira)', uz: "Bo'sh bo'lsa zaxira qiymatni qaytaradi", example: 'IFNULL([Sabab], "Ko\'rsatilmagan")' } },
  ZN: { kind: 'scalar', cat: 'logic', min: 1, max: 1, args: ['number'], ret: N, js: (a) => num(a) ?? 0, sql: ([a]) => `COALESCE(${a}, 0)`, doc: { sig: 'ZN(son)', uz: "Bo'sh qiymat o'rniga 0", example: 'ZN(SUM([Summa]))' } },
  NULLIF: { kind: 'scalar', cat: 'logic', min: 2, max: 2, args: ['any', 'any'], ret: sameAsFirst, js: (a, b) => (a === b ? null : a), sql: ([a, b]) => `NULLIF(${a}, ${b})`, doc: { sig: 'NULLIF(a, b)', uz: "a = b bo'lsa bo'sh qiymat", example: "COUNT([ID]) / NULLIF(COUNTD([Mas'ul]), 0)" } },

  // ---------- math ----------
  ROUND: { kind: 'scalar', cat: 'math', min: 1, max: 2, args: ['number', 'number'], ret: N, js: (a, n) => { const x = num(a); if (x === null) return null; const p = 10 ** (num(n) ?? 0); return Math.round(x * p) / p }, sql: ([a, n]) => `ROUND((${a})::numeric, ${n ?? 0})`, doc: { sig: 'ROUND(son, [xona])', uz: 'Yaxlitlaydi', example: 'ROUND([Konversiya] * 100, 1)' } },
  ABS: { kind: 'scalar', cat: 'math', min: 1, max: 1, args: ['number'], ret: N, js: (a) => { const x = num(a); return x === null ? null : Math.abs(x) }, sql: ([a]) => `ABS(${a})`, doc: { sig: 'ABS(son)', uz: 'Modul (ishorasiz qiymat)', example: 'ABS([Farq])' } },
  FLOOR: { kind: 'scalar', cat: 'math', min: 1, max: 1, args: ['number'], ret: N, js: (a) => { const x = num(a); return x === null ? null : Math.floor(x) }, sql: ([a]) => `FLOOR(${a})`, doc: { sig: 'FLOOR(son)', uz: 'Pastga yaxlitlash', example: 'FLOOR([Davomiylik] / 60)' } },
  CEILING: { kind: 'scalar', cat: 'math', min: 1, max: 1, args: ['number'], ret: N, js: (a) => { const x = num(a); return x === null ? null : Math.ceil(x) }, sql: ([a]) => `CEIL(${a})`, doc: { sig: 'CEILING(son)', uz: 'Yuqoriga yaxlitlash', example: 'CEILING([Soat])' } },
  DIV: { kind: 'scalar', cat: 'math', min: 2, max: 2, args: ['number', 'number'], ret: N, js: (a, b) => { const x = num(a), y = num(b); return x === null || !y ? null : Math.trunc(x / y) }, sql: ([a, b]) => `DIV(${a}, NULLIF(${b}, 0))`, doc: { sig: 'DIV(a, b)', uz: "Butun bo'lish", example: 'DIV([Davomiylik], 60)' } },
  GREATEST: { kind: 'scalar', cat: 'math', min: 2, max: 9, args: ['number'], ret: N, js: (...a) => { const x = nums(a); return x.length ? Math.max(...x) : null }, sql: (a) => `GREATEST(${a.join(', ')})`, doc: { sig: 'GREATEST(a, b, …)', uz: 'Eng kattasi', example: 'GREATEST([Reja] - [Fakt], 0)' } },
  LEAST: { kind: 'scalar', cat: 'math', min: 2, max: 9, args: ['number'], ret: N, js: (...a) => { const x = nums(a); return x.length ? Math.min(...x) : null }, sql: (a) => `LEAST(${a.join(', ')})`, doc: { sig: 'LEAST(a, b, …)', uz: 'Eng kichigi', example: 'LEAST([Bajarilish], 1)' } },

  // ---------- text ----------
  CONCAT: { kind: 'scalar', cat: 'text', min: 1, max: 9, args: ['any'], ret: S, js: (...a) => a.map((x) => (x === null || x === undefined ? '' : String(x))).join(''), sql: (a) => `CONCAT(${a.join(', ')})`, doc: { sig: 'CONCAT(a, b, …)', uz: 'Matnlarni birlashtiradi', example: 'CONCAT([Ism], " — ", [Manba])' } },
  UPPER: { kind: 'scalar', cat: 'text', min: 1, max: 1, args: ['string'], ret: S, js: (a) => (a == null ? null : String(a).toLocaleUpperCase()), sql: ([a]) => `UPPER(${a})`, doc: { sig: 'UPPER(matn)', uz: 'Katta harflarga', example: 'UPPER([Filial])' } },
  LOWER: { kind: 'scalar', cat: 'text', min: 1, max: 1, args: ['string'], ret: S, js: (a) => (a == null ? null : String(a).toLocaleLowerCase()), sql: ([a]) => `LOWER(${a})`, doc: { sig: 'LOWER(matn)', uz: 'Kichik harflarga', example: 'LOWER([Manba])' } },
  LEN: { kind: 'scalar', cat: 'text', min: 1, max: 1, args: ['string'], ret: N, js: (a) => (a == null ? null : String(a).length), sql: ([a]) => `LENGTH(${a})`, doc: { sig: 'LEN(matn)', uz: 'Matn uzunligi', example: 'LEN([Telefon])' } },
  CONTAINS: { kind: 'scalar', cat: 'text', min: 2, max: 2, args: ['string', 'string'], ret: B, js: (a, b) => (a == null || b == null ? null : String(a).toLocaleLowerCase().includes(String(b).toLocaleLowerCase())), sql: ([a, b]) => `(${a} ILIKE '%' || ${b} || '%')`, doc: { sig: 'CONTAINS(matn, qism)', uz: 'Matnda qism bormi', example: 'CONTAINS([Kampaniya], "IELTS")' } },
  STARTSWITH: { kind: 'scalar', cat: 'text', min: 2, max: 2, args: ['string', 'string'], ret: B, js: (a, b) => (a == null || b == null ? null : String(a).startsWith(String(b))), sql: ([a, b]) => `(${a} LIKE ${b} || '%')`, doc: { sig: 'STARTSWITH(matn, boshi)', uz: 'Matn shu bilan boshlanadimi', example: 'STARTSWITH([Telefon], "+998 90")' } },
  REPLACE: { kind: 'scalar', cat: 'text', min: 3, max: 3, args: ['string', 'string', 'string'], ret: S, js: (a, b, c) => (a == null ? null : String(a).split(String(b)).join(String(c ?? ''))), sql: ([a, b, c]) => `REPLACE(${a}, ${b}, ${c})`, doc: { sig: 'REPLACE(matn, eski, yangi)', uz: 'Matndagi qismni almashtiradi', example: 'REPLACE([Kampaniya], " | ", " ")' } },

  // ---------- dates ----------
  DATETRUNC: { kind: 'scalar', cat: 'date', min: 2, max: 2, args: ['any', 'string'], ret: D, js: (d, u) => trunc(d, u), sql: ([d, u]) => `DATE_TRUNC(${u}, ${d})::date`, doc: { sig: 'DATETRUNC(sana, "day"|"week"|"month"|"quarter"|"year")', uz: 'Sanani davr boshiga yaxlitlaydi', example: 'DATETRUNC([Sana], "month")' } },
  DAY: { kind: 'scalar', cat: 'date', min: 1, max: 1, args: ['any'], ret: N, js: (d) => { const ms = toMs(d); return ms === null ? null : new Date(ms).getDate() }, sql: ([d]) => `EXTRACT(DAY FROM ${d})`, doc: { sig: 'DAY(sana)', uz: 'Oy kuni (1–31)', example: 'DAY([Sana])' } },
  MONTH: { kind: 'scalar', cat: 'date', min: 1, max: 1, args: ['any'], ret: N, js: (d) => { const ms = toMs(d); return ms === null ? null : new Date(ms).getMonth() + 1 }, sql: ([d]) => `EXTRACT(MONTH FROM ${d})`, doc: { sig: 'MONTH(sana)', uz: 'Oy raqami (1–12)', example: 'MONTH([Sana])' } },
  YEAR: { kind: 'scalar', cat: 'date', min: 1, max: 1, args: ['any'], ret: N, js: (d) => { const ms = toMs(d); return ms === null ? null : new Date(ms).getFullYear() }, sql: ([d]) => `EXTRACT(YEAR FROM ${d})`, doc: { sig: 'YEAR(sana)', uz: 'Yil', example: 'YEAR([Sana])' } },
  WEEKDAY: { kind: 'scalar', cat: 'date', min: 1, max: 1, args: ['any'], ret: N, js: (d) => { const ms = toMs(d); return ms === null ? null : ((new Date(ms).getDay() + 6) % 7) + 1 }, sql: ([d]) => `EXTRACT(ISODOW FROM ${d})`, doc: { sig: 'WEEKDAY(sana)', uz: 'Hafta kuni (1 = dushanba)', example: 'WEEKDAY([Sana])' } },
  HOUR: { kind: 'scalar', cat: 'date', min: 1, max: 1, args: ['any'], ret: N, js: (d) => { const ms = toMs(d); return ms === null ? null : new Date(ms).getHours() }, sql: ([d]) => `EXTRACT(HOUR FROM ${d})`, doc: { sig: 'HOUR(vaqt)', uz: 'Soat (0–23)', example: 'HOUR([Vaqt])' } },
  TODAY: { kind: 'scalar', cat: 'date', min: 0, max: 0, args: [], ret: D, js: () => toDay(Date.now()), sql: () => 'CURRENT_DATE', doc: { sig: 'TODAY()', uz: 'Bugungi sana', example: 'DATEDIFF([Sana], TODAY())' } },
  DATEADD: { kind: 'scalar', cat: 'date', min: 3, max: 3, args: ['any', 'string', 'number'], ret: D, js: (d, u, n) => { const ms = toMs(d); if (ms === null) return null; const x = new Date(ms); const k = num(n) ?? 0; const unit = String(u); if (unit === 'month') x.setMonth(x.getMonth() + k); else if (unit === 'year') x.setFullYear(x.getFullYear() + k); else x.setDate(x.getDate() + k * (unit === 'week' ? 7 : 1)); return toDay(x.getTime()) }, sql: ([d, u, n]) => `(${d} + (${n} || ' ' || ${u})::interval)::date`, doc: { sig: 'DATEADD(sana, birlik, son)', uz: "Sanaga vaqt qo'shadi", example: 'DATEADD([Sana], "day", 7)' } },
  DATEDIFF: { kind: 'scalar', cat: 'date', min: 2, max: 2, args: ['any', 'any'], ret: N, js: (a, b) => { const x = toMs(a), y = toMs(b); return x === null || y === null ? null : Math.round((y - x) / 86_400_000) }, sql: ([a, b]) => `(${b}::date - ${a}::date)`, doc: { sig: 'DATEDIFF(dan, gacha)', uz: 'Ikki sana orasidagi kunlar', example: 'DATEDIFF([Lid sanasi], [Sotuv sanasi])' } },
}

function minMax(c: unknown[], dir: 1 | -1): unknown {
  let best: unknown = null
  for (const v of c) {
    if (v === null || v === undefined) continue
    if (best === null || (dir > 0 ? (v as number) > (best as number) : (v as number) < (best as number))) best = v
  }
  return best
}

export { UNITS, sqlStr, unq }
