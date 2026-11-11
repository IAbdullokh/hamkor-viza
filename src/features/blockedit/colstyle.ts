import { fmtNum } from '@/lib/format'
import type { Lang } from '@/lib/settings'
import type { BlockColor, BlockTint, TablePatch } from './patch'

/**
 * One column of a block's table, picked in the zoomed editor (owner, 2026-10-26: "I should be able to select any column
 * I want to change — the target for the AI, or for changing the colour"): its own colour, conditional colours and number
 * format. Pure parts, tested in colstyle.test.ts; kit/DataTable draws them, LiveBlocks.cs validates the same shape.
 */

/**
 * "scale" = higher greener, lower redder (among the column's own values); "threshold" = ≥ hi green, < lo red; "bars" = a
 * soft bar behind each number, as long as its share of the column's largest (owner, 2026-10-26: "bars somewhere so I know
 * which number is higher"); "barsRank" = the bars plus a rank badge (1-2-3 medals) on the top values
 */
export type RuleMode = 'scale' | 'threshold' | 'bars' | 'barsRank' | 'ring'
export const RULE_MODES: readonly RuleMode[] = ['scale', 'threshold', 'bars', 'barsRank', 'ring']
export interface ColRule {
  mode: RuleMode
  hi?: number
  lo?: number
  /** a bars column's own bar style (unset = the table's barStyle, else "fill") */
  style?: BarStyle
}

/**
 * How comparison bars are drawn (owner, 2026-10-26, a "Lid va Konversiya" progress table as a variation): "fill" = a soft
 * fill behind the number (Orqa fon), "line" = a thin rounded line under it (Ostki chiziq). A percent column may instead
 * be a ring ("ring" rule: a small circular progress with the % inside; Halqa).
 */
export type BarStyle = 'fill' | 'line'
export const BAR_STYLES: readonly BarStyle[] = ['fill', 'line']
export const isBarStyle = (v: unknown): v is BarStyle => v === 'fill' || v === 'line'

/** "num" = a number, "pct" = a percent (a count shown as its share of the column's total), "sum" = so'm */
export type FormatKind = 'num' | 'pct' | 'sum'
export interface ColFormat {
  kind: FormatKind
  decimals?: number
}

export const FORMAT_KINDS: readonly FormatKind[] = ['num', 'pct', 'sum']
export const MAX_DECIMALS = 2

type PerColumn<V> = Record<string, V> | undefined
function put<V>(map: PerColumn<V>, key: string, v: V | undefined): PerColumn<V> {
  const next = { ...map }
  if (v === undefined) delete next[key]
  else next[key] = v
  return Object.keys(next).length ? next : undefined
}

/** the table patch with one column's colour / rule / format set (undefined = back to the table's own) */
export const withColColor = (p: TablePatch | undefined, key: string, c: BlockTint | undefined): TablePatch => ({ ...p, colColors: put(p?.colColors, key, c) })
export const withColRule = (p: TablePatch | undefined, key: string, r: ColRule | undefined): TablePatch => ({ ...p, colRules: put(p?.colRules, key, r ? cleanRule(r) : undefined) })
export const withColFormat = (p: TablePatch | undefined, key: string, f: ColFormat | undefined): TablePatch => ({ ...p, colFormat: put(p?.colFormat, key, f ? cleanFormat(f) : undefined) })

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** a rule as it may be kept: a scale keeps no thresholds; a threshold needs at least one */
export function cleanRule(r: ColRule): ColRule | undefined {
  if (r.mode === 'bars' || r.mode === 'barsRank') return isBarStyle(r.style) ? { mode: r.mode, style: r.style } : { mode: r.mode }
  if (r.mode === 'scale' || r.mode === 'ring') return { mode: r.mode }
  if (r.mode !== 'threshold') return undefined
  const out: ColRule = { mode: 'threshold' }
  if (finite(r.hi)) out.hi = r.hi
  if (finite(r.lo)) out.lo = r.lo
  return out.hi === undefined && out.lo === undefined ? undefined : out
}

export function cleanFormat(f: ColFormat): ColFormat | undefined {
  if (!FORMAT_KINDS.includes(f.kind)) return undefined
  const d = f.decimals
  return finite(d) && d >= 0 && d <= MAX_DECIMALS ? { kind: f.kind, decimals: Math.floor(d) } : { kind: f.kind }
}

/**
 * The hue of a value under a rule (0 = red … 130 = green), or null for no colour: a scale spreads the column's own
 * values from red (its lowest) to green (its highest); a threshold is green from `hi`, red below `lo`, nothing between.
 */
export function ruleHue(rule: ColRule | undefined, v: number | null, min: number, max: number): number | null {
  if (!rule || v === null || !Number.isFinite(v) || isBars(rule) || rule.mode === 'ring') return null
  if (rule.mode === 'threshold') {
    if (finite(rule.hi) && v >= rule.hi) return 130
    if (finite(rule.lo) && v < rule.lo) return 0
    return null
  }
  if (!(max > min)) return null
  const k = Math.max(0, Math.min(1, (v - min) / (max - min)))
  return Math.round(k * 130)
}

/** does the rule draw comparison bars */
export const isBars = (r: ColRule | undefined): boolean => r?.mode === 'bars' || r?.mode === 'barsRank'

/** the table with comparison bars (with ranks or not) on every numeric column (`keys`); colour rules stay as they are */
export function withAllBars(p: TablePatch | undefined, keys: string[], mode: 'bars' | 'barsRank' | undefined): TablePatch {
  let next: TablePatch = { ...p }
  for (const k of keys) {
    const r = next.colRules?.[k]
    if (r && !isBars(r)) continue
    next = withColRule(next, k, mode ? { mode } : undefined)
  }
  return next
}

/** the whole table's bar mode: 'bars' / 'barsRank' when every numeric column (`keys`) has it, else null */
export function allBarsMode(p: TablePatch | undefined, keys: string[]): 'bars' | 'barsRank' | null {
  if (!keys.length) return null
  // a percent column shown as a ring counts as one with bars
  const modes = keys.map((k) => p?.colRules?.[k]?.mode).filter((m) => m !== 'ring')
  if (!modes.length) return null
  if (modes.every((m) => m === 'barsRank')) return 'barsRank'
  return modes.every((m) => m === 'bars' || m === 'barsRank') ? 'bars' : null
}

/**
 * A bar's length (0..100, in %) for a value among its column's values: from 0 to the largest when all are ≥ 0, from the
 * smallest to the largest when some are negative; a percent column (`pct`) is measured on 0–100%. null = no bar.
 */
export function barWidth(v: number | null, min: number, max: number, pct: 'ratio' | 'percent' | null = null): number | null {
  if (v === null || !Number.isFinite(v)) return null
  if (pct) {
    const full = pct === 'ratio' ? 1 : 100
    return Math.max(0, Math.min(100, (v / full) * 100))
  }
  if (min < 0) return max > min ? ((v - min) / (max - min)) * 100 : null
  return max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : null
}

/** the rank (1 = largest) of each value among `values` — equal values share a rank; non-numbers get none */
export function ranks(values: (number | null)[]): (number | null)[] {
  const nums = [...new Set(values.filter((v): v is number => v !== null && Number.isFinite(v)))].sort((a, b) => b - a)
  return values.map((v) => (v === null || !Number.isFinite(v) ? null : nums.indexOf(v) + 1))
}

/** how many top ranks get a badge */
export const RANK_BADGES = 3

/* ── Bar styles, rings and the colourful columns preset ───────────────────────────────────────────────── */

/** a column's bar style: its own, else the table's, else "fill" */
export const barStyleOf = (p: TablePatch | undefined, key: string): BarStyle => p?.colRules?.[key]?.style ?? p?.barStyle ?? 'fill'

/** the whole table's bar style ("fill" = the default, not kept); the columns' own styles give way to it */
export function withBarStyle(p: TablePatch | undefined, style: BarStyle): TablePatch {
  const rules = p?.colRules ? Object.fromEntries(Object.entries(p.colRules).map(([k, r]) => [k, r.style ? { mode: r.mode } : r])) : undefined
  return { ...p, colRules: rules, barStyle: style === 'line' ? 'line' : undefined }
}

/** one bars column's own style (the table's one = not kept) */
export function withColBarStyle(p: TablePatch | undefined, key: string, style: BarStyle): TablePatch {
  const r = p?.colRules?.[key]
  if (!r || !isBars(r)) return { ...p }
  const own = style === (p?.barStyle ?? 'fill') ? undefined : style
  return withColRule(p, key, { mode: r.mode, style: own })
}

/** a ring's fill (0..100) and the % it shows for a percent value; null = no value ("–") */
export function ringValue(v: number | null | undefined, pct: 'ratio' | 'percent' | null): { fill: number; pct: number } | null {
  if (v === null || v === undefined || !Number.isFinite(v) || !pct) return null
  const x = pct === 'ratio' ? v * 100 : v
  return { fill: Math.max(0, Math.min(100, x)), pct: x }
}

/** a ring's colour when its column has none: red (low) … green (high) by its share */
export const ringHue = (fill: number) => Math.round(Math.max(0, Math.min(100, fill)) * 1.3)

/** are all the percent columns (`pctKeys`) rings */
export const ringsOn = (p: TablePatch | undefined, pctKeys: string[]): boolean => pctKeys.length > 0 && pctKeys.every((k) => p?.colRules?.[k]?.mode === 'ring')

/** the percent columns as rings ("Foizlar halqada"), or back: to the table's bars when the others have them, else none */
export function withRings(p: TablePatch | undefined, pctKeys: string[], on: boolean, numKeys: string[] = []): TablePatch {
  const back = allBarsMode(p, numKeys.filter((k) => !pctKeys.includes(k)))
  let next: TablePatch = { ...p }
  for (const k of pctKeys) {
    const r = next.colRules?.[k]
    if (on && (!r || isBars(r))) next = withColRule(next, k, { mode: 'ring' })
    else if (!on && r?.mode === 'ring') next = withColRule(next, k, back ? { mode: back } : undefined)
  }
  return next
}

/**
 * The colours the "Rangli ustunlar" preset gives the numeric columns, in order (like the progress table the owner showed:
 * blue Jami, orange Jarayonda, teal Sifatli, red Sifatsiz, yellow Bekor, green Konsultatsiya…); more columns repeat them.
 */
export const PROGRESS_PALETTE: readonly BlockColor[] = ['blue', 'orange', 'teal', 'red', 'yellow', 'green', 'purple', 'pink', 'indigo', 'cyan', 'mint']

/** each key its own colour from the palette */
export const paletteFor = (keys: string[]): Record<string, BlockColor> => Object.fromEntries(keys.map((k, i) => [k, PROGRESS_PALETTE[i % PROGRESS_PALETTE.length]!]))

/** does every numeric column have its own colour */
export const colorfulOn = (p: TablePatch | undefined, numKeys: string[]): boolean => numKeys.length > 0 && numKeys.every((k) => !!p?.colColors?.[k])

/** "Rangli ustunlar": every numeric column its own colour (on), or the columns' colours taken away (off) */
export function withColorful(p: TablePatch | undefined, numKeys: string[], on: boolean): TablePatch {
  const colors = { ...p?.colColors }
  if (on) Object.assign(colors, paletteFor(numKeys))
  else for (const k of numKeys) delete colors[k]
  return { ...p, colColors: Object.keys(colors).length ? colors : undefined }
}

/**
 * The progress-table look in one go ("Rangli chiziqli jadval"; Nova "har ustunni o'z rangida chiziq bilan qil"): every
 * numeric column its own colour, bars as a line under the number (columns with a colour rule keep it), the percent
 * columns as rings.
 */
export function withProgressLook(p: TablePatch | undefined, numKeys: string[], pctKeys: string[]): TablePatch {
  const counts = numKeys.filter((k) => !pctKeys.includes(k))
  let next = withColorful(p, numKeys, true)
  const mode = allBarsMode(next, counts) ?? 'bars'
  next = withAllBars(next, counts, mode)
  next = withRings(next, pctKeys, true)
  return withBarStyle(next, 'line')
}

/** is the table in the progress look (colours, lines, rings) */
export const progressOn = (p: TablePatch | undefined, numKeys: string[], pctKeys: string[]): boolean =>
  colorfulOn(p, numKeys) && p?.barStyle === 'line' && (!pctKeys.length || ringsOn(p, pctKeys)) && allBarsMode(p, numKeys) !== null

/** a cell's soft background for a hue (readable in light and dark) */
export const hueBg = (h: number) => `hsl(${h} 70% 48% / 0.2)`

/** is the column a percent already (its own format prints "%"): is its value a ratio 0..1 or already 0..100 */
export function percentScale(format: ((v: number) => string) | undefined): 'ratio' | 'percent' | null {
  if (!format) return null
  const one = format(1)
  if (!one.includes('%')) return null
  return /100/.test(one) ? 'ratio' : 'percent'
}

/**
 * A number in the column's chosen format. "pct": a percent column keeps its value (×100 when it is a ratio), any other
 * column shows its share of `total`. "sum": so'm. Decimals 0..2 (a percent defaults to 1).
 */
export function formatCell(f: ColFormat, v: number, opts: { total?: number; pct?: 'ratio' | 'percent' | null; lang?: Lang; som?: string }): string {
  const lang = opts.lang ?? 'uz'
  if (f.kind === 'pct') {
    const d = f.decimals ?? 1
    const x = opts.pct === 'ratio' ? v * 100 : opts.pct === 'percent' ? v : opts.total ? (v / opts.total) * 100 : 0
    return `${fmtNum(x, d, lang)}%`
  }
  const d = f.decimals ?? 0
  return f.kind === 'sum' ? `${fmtNum(v, d, lang)} ${opts.som ?? "so'm"}` : fmtNum(v, d, lang)
}

/** a numeric column's rows for Nova ("nega 0%?"): how many, how many are 0, the smallest, the largest */
export interface ColStats {
  count: number
  zeros: number
  min: number | null
  max: number | null
  total: number | null
  unit: '%' | null
}

export function columnStats(values: (string | number | null)[], total: string | number | null, pct: 'ratio' | 'percent' | null): ColStats | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!nums.length) return null
  const k = pct === 'ratio' ? 100 : 1
  const r = (x: number) => Math.round(x * k * 100) / 100
  return {
    count: nums.length,
    zeros: nums.filter((v) => v === 0).length,
    min: r(Math.min(...nums)),
    max: r(Math.max(...nums)),
    total: typeof total === 'number' && Number.isFinite(total) ? r(total) : null,
    unit: pct ? '%' : null,
  }
}

/**
 * The table's look as ONE choice of five (owner, 2026-10-26: the separate "Hamma ustunlarga chiziq / Chiziq ko'rinishi /
 * Rangli ustunlar" buttons were confusing): plain numbers, a soft bar behind each number, a thin line under it, bars with
 * the 1-2-3 places, or every column in its own colour (the progress look). Percent rings stay their own switch.
 */
export type TableLook = 'plain' | 'bars' | 'line' | 'rank' | 'colorful'
export const TABLE_LOOKS: readonly TableLook[] = ['plain', 'bars', 'line', 'rank', 'colorful']

export function tableLookOf(p: TablePatch | undefined, numKeys: string[]): TableLook {
  if (colorfulOn(p, numKeys)) return 'colorful'
  const bars = allBarsMode(p, numKeys)
  if (bars === 'barsRank') return 'rank'
  if (bars === 'bars') return p?.barStyle === 'line' ? 'line' : 'bars'
  return 'plain'
}

/** the table with `look` (rings on percent columns are kept as they were) */
export function withTableLook(p: TablePatch | undefined, look: TableLook, numKeys: string[], pctKeys: string[]): TablePatch {
  const rings = ringsOn(p, pctKeys)
  // each look replaces the one before: no 1-2-3 places left over from "Fon + o'rin" in the colourful look
  if (look === 'colorful') return withProgressLook(withAllBars(p, numKeys, 'bars'), numKeys, pctKeys)
  let next = withColorful(p, numKeys, false)
  next = withAllBars(next, numKeys, look === 'plain' ? undefined : look === 'rank' ? 'barsRank' : 'bars')
  next = withBarStyle(next, look === 'line' ? 'line' : 'fill')
  return rings ? withRings(next, pctKeys, true, numKeys) : next
}
