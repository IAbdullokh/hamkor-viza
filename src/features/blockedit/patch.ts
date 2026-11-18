import type { BlockEdits, BlockPatch } from './context'
import type { Preset } from '@/features/addchart/model'
import { isEmptyPatch, isEmptyTable } from './order'
import { cleanFormat, cleanRule, isBarStyle, type BarStyle, type ColFormat, type ColRule, type ColStats } from './colstyle'
import type { NovaViews } from './views'
import { isHexColor, readable, type HexColor } from './tint'
import { cleanCalc, type CalcColumn } from './calc'

/**
 * A block's colour and its table settings (owner, 2026-10-26: "I told him to change the colour, it can't" and "when I
 * tell it to add to the table or change the table, it should change immediately"). Pure parts, tested in patch.test.ts:
 * the colours a block may take, what a table patch does to a table's columns, and how one change (from Nova, applied and
 * saved at once) is put on a block's edit and taken back by its undo.
 */

/** the tile colours a block may take (ui/glass TileColor without 'accent', which is the block's own default) */
export const BLOCK_COLORS = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'gray'] as const
export type BlockColor = (typeof BLOCK_COLORS)[number]
export const isBlockColor = (v: unknown): v is BlockColor => typeof v === 'string' && (BLOCK_COLORS as readonly string[]).includes(v)

/** each colour as the charts draw it (the same RGB as `.tile-*` in styles/index.css) */
export const COLOR_HEX: Record<BlockColor, string> = {
  blue: '#3478f6',
  indigo: '#5c5cd6',
  purple: '#a858d6',
  pink: '#e84c80',
  red: '#e5484d',
  orange: '#f49220',
  yellow: '#e8b414',
  green: '#34ba5e',
  mint: '#14bab0',
  teal: '#30acc4',
  cyan: '#32ade6',
  gray: '#888890',
}

/** a block's or a column's colour: a tile colour, or any other as "#rrggbb" (tint.ts; the picker, Nova) */
export type BlockTint = BlockColor | HexColor
export const isBlockTint = (v: unknown): v is BlockTint => isBlockColor(v) || isHexColor(v)
/** the colour as kept: a tile colour as it is, a hex in lower case; anything else undefined */
export const cleanTint = (v: unknown): BlockTint | undefined => (isBlockColor(v) ? v : isHexColor(v) ? (v.toLowerCase() as HexColor) : undefined)
/** the colour as a hex (a tile colour's own, a custom one itself) */
export const tintHex = (c: BlockTint): string => (isBlockColor(c) ? COLOR_HEX[c] : c)
/** the colour for text on a card (a custom one darkened / lightened to ≥ 4.5:1; a tile colour as before) */
export const tintText = (c: BlockTint, dark: boolean): string => (isBlockColor(c) ? COLOR_HEX[c] : readable(c, dark))
/** the colour for chart marks (a custom one kept at ≥ 3:1 against the card) */
export const tintChart = (c: BlockTint, dark: boolean): string => (isBlockColor(c) ? COLOR_HEX[c] : readable(c, dark, 3))

/** the edit holds a custom colour (the block's or a column's) */
export const hasCustomTint = (p: BlockPatch | null | undefined): boolean =>
  !!p && (isHexColor(p.color) || Object.values(p.table?.colColors ?? {}).some(isHexColor) || Object.values(p.viewTables ?? {}).some((v) => Object.values(v?.colColors ?? {}).some(isHexColor)))

/** the colour's names for its dot in the zoomed editor (Uzbek keys) */
export const COLOR_NAMES: Record<BlockColor, string> = {
  blue: "Ko'k",
  indigo: 'Siyohrang',
  purple: 'Binafsha',
  pink: 'Pushti',
  red: 'Qizil',
  orange: "To'q sariq",
  yellow: 'Sariq',
  green: 'Yashil',
  mint: 'Yalpiz',
  teal: 'Feruza',
  cyan: 'Havorang',
  gray: 'Kulrang',
}

/**
 * A chart palette in one colour: the colour first, then lighter (on a dark page darker) shades of it, so a chart with
 * several series or slices stays readable in the colour asked for.
 */
export function tintPalette(hex: string, dark: boolean, n = 8): string[] {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const to = dark ? 0 : 255
  const steps = [0, 0.28, 0.46, 0.6, 0.7, 0.18, 0.38, 0.52]
  return steps.slice(0, n).map((k) => '#' + rgb.map((c) => Math.round(c + (to - c) * k).toString(16).padStart(2, '0')).join(''))
}

/* ── Tables ────────────────────────────────────────────────────────────────────────────────────────────── */

export interface TableSort {
  key: string
  dir: 'asc' | 'desc'
}

/** a table's settings for its block: hidden columns, their order, new names, a sort and a top-N (all by column key) */
export interface TablePatch {
  /** columns calculated from this table's own columns (calc.ts) */
  calc?: CalcColumn[]
  hidden?: string[]
  order?: string[]
  labels?: Record<string, string>
  sort?: TableSort
  rows?: number
  /** a column's own colour, conditional colours and number format, by key (colstyle.ts; a column picked in the editor) */
  colColors?: Record<string, BlockTint>
  colRules?: Record<string, ColRule>
  colFormat?: Record<string, ColFormat>
  /** the table's hierarchy: ≤ 3 breakdown keys, its own first (kit/hier; "Ierarxiya" in the zoomed editor, Nova) */
  levels?: string[]
  /** a column's width in pixels, dragged on its header's edge (kit/coldrag.ts; unset = automatic) */
  widths?: Record<string, number>
  /** how the comparison bars are drawn: "line" = a thin line under the number (unset = a fill behind it; colstyle.ts) */
  barStyle?: BarStyle
}

/** a column of a block's table as the zoomed editor and Nova see it */
export interface TableColumnInfo {
  key: string
  label: string
  /** a column of numbers (a format and conditional colours make sense) */
  num?: boolean
  /** its numbers over all rows (Nova's "nega 0%?") */
  stats?: ColStats | null
  /** a percent column whose numbers are ratios (0.25 shown as 25%): a threshold for it is ÷ 100 */
  ratio?: boolean
  /** a heat-tinted matrix column (kit/HeatMatrix): the table style offers "Issiqlik" */
  heat?: boolean
}

export const MAX_COLUMN_LABEL = 40
export const TOP_CHOICES = [5, 10, 20, 50] as const

/** the keys in their shown order: the saved order first (known keys only), then the others in the table's own order */
export function orderedKeys(keys: string[], p?: TablePatch): string[] {
  const known = new Set(keys)
  const first = (p?.order ?? []).filter((k, i, a) => known.has(k) && a.indexOf(k) === i)
  const rest = keys.filter((k) => !first.includes(k))
  return [...first, ...rest]
}

/** the table's columns as the patch shows them: ordered, renamed, the hidden ones left out (never all of them) */
export function tableColumns<C extends { key: string; label: string }>(columns: C[], p?: TablePatch): C[] {
  if (!p || isEmptyTable(p)) return columns
  const byKey = new Map(columns.map((c) => [c.key, c]))
  const hidden = new Set(p.hidden ?? [])
  const shown = orderedKeys(columns.map((c) => c.key), p)
    .map((k) => byKey.get(k)!)
    .filter((c) => !hidden.has(c.key))
  const out = shown.length ? shown : columns.slice(0, 1)
  return out.map((c) => (p.labels?.[c.key] ? { ...c, label: p.labels[c.key]! } : c))
}

/** a table patch with nothing left in it is dropped */
function tidy(p: TablePatch): TablePatch | undefined {
  const out: TablePatch = {}
  if (p.calc?.length) out.calc = p.calc
  if (p.hidden?.length) out.hidden = p.hidden
  if (p.order?.length) out.order = p.order
  if (p.labels && Object.keys(p.labels).length) out.labels = p.labels
  if (p.sort) out.sort = p.sort
  if (p.rows && p.rows > 0) out.rows = p.rows
  if (p.colColors && Object.keys(p.colColors).length) out.colColors = p.colColors
  if (p.colRules && Object.keys(p.colRules).length) out.colRules = p.colRules
  if (p.colFormat && Object.keys(p.colFormat).length) out.colFormat = p.colFormat
  if (p.levels && p.levels.length > 1) out.levels = p.levels
  if (p.widths && Object.keys(p.widths).length) out.widths = p.widths
  if (p.barStyle === 'line') out.barStyle = 'line'
  return isEmptyTable(out) ? undefined : out
}

/** the column shown or hidden; the last shown column cannot be hidden */
export function toggleColumn(p: TablePatch | undefined, key: string, keys: string[]): TablePatch | undefined {
  const hidden = new Set(p?.hidden ?? [])
  if (hidden.has(key)) hidden.delete(key)
  else if (keys.filter((k) => !hidden.has(k)).length > 1) hidden.add(key)
  return tidy({ ...p, hidden: keys.filter((k) => hidden.has(k)) })
}

/** the column moved one place back (-1) or forward (+1) in the shown order (hidden columns keep their place) */
export function moveColumn(p: TablePatch | undefined, key: string, step: -1 | 1, keys: string[]): TablePatch | undefined {
  const order = orderedKeys(keys, p)
  const from = order.indexOf(key)
  const to = from + step
  if (from < 0 || to < 0 || to >= order.length) return p
  const next = order.slice()
  next.splice(from, 1)
  next.splice(to, 0, key)
  // the table's own order needs no saving
  return tidy({ ...p, order: next.every((k, i) => k === keys[i]) ? undefined : next })
}

/** the column's new name; empty or its own name again drops the rename */
export function renameColumn(p: TablePatch | undefined, key: string, label: string, original: string): TablePatch | undefined {
  const labels = { ...p?.labels }
  const name = label.trim().slice(0, MAX_COLUMN_LABEL)
  if (!name || name === original || /[<>]/.test(name)) delete labels[key]
  else labels[key] = name
  return tidy({ ...p, labels })
}

export const withSort = (p: TablePatch | undefined, sort: TableSort | undefined): TablePatch | undefined => tidy({ ...p, sort })
export const withRows = (p: TablePatch | undefined, rows: number | undefined): TablePatch | undefined => tidy({ ...p, rows })
/** a table patch tidied (empty parts dropped; nothing left = undefined) — for colstyle.ts's per-column setters */
export const tidyTable = (p: TablePatch | undefined): TablePatch | undefined => (p ? tidy(p) : undefined)

/** the table part of Nova's answer (only the fields it sent) on top of the block's table settings */
export interface NovaTable {
  /** the whole list of calculated columns (an empty list = none) */
  calc?: CalcColumn[] | null
  hidden?: string[] | null
  order?: string[] | null
  labels?: Record<string, string> | null
  sort?: TableSort | null
  rows?: number | null
  colColors?: Record<string, string> | null
  colRules?: Record<string, ColRule> | null
  colFormat?: Record<string, ColFormat> | null
  /** the table's hierarchy (an empty list = flat again; the table keeps only its known dims, kit/hier cleanLevels) */
  levels?: string[] | null
  /** the bars' style ("fill" = behind the number again) */
  barStyle?: string | null
}
export function mergeNovaTable(cur: TablePatch | undefined, n: NovaTable, given: string[]): TablePatch | undefined {
  const next: TablePatch = { ...cur }
  if (Array.isArray(n.calc)) next.calc = cleanCalc(n.calc)
  // a column calculated in this same change can be named, sorted and placed with it; one taken away cannot
  const gone = new Set((cur?.calc ?? []).map((c) => c.key))
  const calcKeys = (next.calc ?? []).map((c) => c.key)
  const keys = [...new Set([...given.filter((k) => !gone.has(k)), ...calcKeys])]
  const known = (xs: string[]) => xs.filter((k) => keys.includes(k))
  if (n.hidden) next.hidden = known(n.hidden)
  if (n.order) next.order = orderedKeys(keys, { order: known(n.order) })
  if (n.labels) next.labels = { ...cur?.labels, ...Object.fromEntries(Object.entries(n.labels).filter(([k, v]) => keys.includes(k) && typeof v === 'string' && v.trim())) }
  if (n.sort && keys.includes(n.sort.key)) next.sort = { key: n.sort.key, dir: n.sort.dir === 'asc' ? 'asc' : 'desc' }
  if (typeof n.rows === 'number') next.rows = n.rows > 0 ? Math.min(1000, Math.floor(n.rows)) : undefined
  if (Array.isArray(n.levels)) next.levels = n.levels.filter((k) => typeof k === 'string').slice(0, 3)
  if (isBarStyle(n.barStyle)) next.barStyle = n.barStyle === 'line' ? 'line' : undefined
  // the picked column's own look (only known columns, colours and shapes)
  const each = <V,>(m: Record<string, unknown> | null | undefined, ok: (v: unknown) => V | undefined, cur: Record<string, V> | undefined) => {
    if (!m) return cur
    const out = { ...cur }
    for (const [k, v] of Object.entries(m)) {
      const x = keys.includes(k) ? ok(v) : undefined
      if (x !== undefined) out[k] = x
    }
    return out
  }
  next.colColors = each(n.colColors, cleanTint, cur?.colColors)
  next.colRules = each(n.colRules, (v) => (v && typeof v === 'object' ? cleanRule(v as ColRule) : undefined), cur?.colRules)
  // { mode: "off" } takes a column's rule away (Nova: "chiziqlarni olib tashla")
  for (const [k, v] of Object.entries(n.colRules ?? {})) if (next.colRules && (v as { mode?: string } | null)?.mode === 'off') delete next.colRules[k]
  next.colFormat = each(n.colFormat, (v) => (v && typeof v === 'object' ? cleanFormat(v as ColFormat) : undefined), cur?.colFormat)
  // never every column hidden
  if (next.hidden && keys.length && next.hidden.length >= keys.length) next.hidden = next.hidden.slice(1)
  return tidy(next)
}

/* ── One change, applied at once and undone ────────────────────────────────────────────────────────────── */

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
const FIELDS = ['title', 'hidden', 'visual', 'visualMeasure', 'color', 'table', 'views', 'viewTables', 'source'] as const

/** the block's edit with the change's fields put on it (a field set to undefined in the change is cleared) */
export function mergeChange(base: BlockPatch | undefined, change: BlockPatch): BlockPatch {
  const next: BlockPatch = { ...base }
  for (const f of FIELDS) {
    if (!has(change, f)) continue
    const v = change[f]
    if (v === undefined) delete next[f]
    else (next as Record<string, unknown>)[f] = v
  }
  return next
}

/** the change taken back: each field it touched gets the value it had before (other fields stay as they are now) */
export function revertChange(cur: BlockPatch | undefined, before: BlockPatch | undefined, change: BlockPatch): BlockPatch {
  const next: BlockPatch = { ...cur }
  for (const f of FIELDS) {
    if (!has(change, f)) continue
    const v = before?.[f]
    if (v === undefined) delete next[f]
    else (next as Record<string, unknown>)[f] = v
  }
  return next
}

/**
 * What a change replaced, field by field (null = the field was not set): kept with Nova's message, so its "Ortga qaytarish"
 * still works after a reload or on another device, where the page's own undo history is gone.
 */
export function beforeOf(before: BlockPatch | undefined, change: BlockPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) if (has(change, f)) out[f] = before?.[f] ?? null
  return out
}

/** the block with those fields put back; every other field (changed since) stays */
export function restoreBefore(cur: BlockPatch | undefined, undo: Record<string, unknown>): BlockPatch {
  const next: BlockPatch = { ...cur }
  for (const f of FIELDS) {
    if (!(f in undo)) continue
    if (undo[f] === null || undo[f] === undefined) delete next[f]
    else (next as Record<string, unknown>)[f] = undo[f]
  }
  return next
}

/** the edits with one block's edit replaced (an empty one is dropped) */
export function withBlock(edits: BlockEdits, id: string, patch: BlockPatch | null): BlockEdits {
  const next = { ...edits }
  if (patch && !isEmptyPatch(patch)) next[id] = patch
  else delete next[id]
  return next
}

/** the two edits are the same (the zoomed editor's "unsaved changes") */
export const samePatch = (a: BlockPatch | undefined, b: BlockPatch | undefined): boolean => JSON.stringify(norm(a)) === JSON.stringify(norm(b))
function norm(p: BlockPatch | undefined): unknown {
  if (!p || isEmptyPatch(p)) return null
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(p).sort()) {
    const v = (p as Record<string, unknown>)[k]
    if (v !== undefined && v !== false) out[k] = v
  }
  return out
}

/** Nova's answer (POST /api/blocks/ask) as the server sends its change */
export interface NovaPatch {
  title?: string | null
  hidden?: boolean | null
  visual?: string | null
  /** the measure a one-measure form draws (one of the block's measures) */
  visualMeasure?: string | null
  color?: string | null
  table?: NovaTable | null
  /** the block's view tabs hidden / reordered / renamed (views.ts liftChange puts them on the block) */
  views?: NovaViews | null
  /** the table's column colours go to every view of the block (Bitrix's stage colours; views.ts liftChange) */
  everyView?: boolean | null
  /** other data for the block (BlockPatch.source): checked on the page's data before it is taken (BlockEditOverlay) */
  source?: Partial<Preset> | null
}

/**
 * Nova's change as a block edit holding only the fields it changes (applied and saved at once, undone field by field):
 * a chart form the block cannot take, an unknown colour or column are left out. Null when nothing is left.
 */
export function changeFromNova(p: NovaPatch | null | undefined, draft: BlockPatch, visuals: readonly string[], keys: string[], measures?: readonly string[]): BlockPatch | null {
  if (!p) return null
  const change: BlockPatch = {}
  if (p.title) change.title = p.title
  if (p.hidden) change.hidden = true
  if (p.visual && visuals.includes(p.visual)) change.visual = p.visual as BlockPatch['visual']
  if (p.visualMeasure && measures?.includes(p.visualMeasure)) change.visualMeasure = p.visualMeasure
  const color = cleanTint(p.color)
  if (color) change.color = color
  if (p.table && keys.length) {
    const next = mergeNovaTable(draft.table, p.table, keys)
    if (JSON.stringify(next ?? null) !== JSON.stringify(draft.table ?? null)) change.table = next
  }
  return Object.keys(change).length ? change : null
}
