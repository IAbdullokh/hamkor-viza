import type { VisualType } from '@/spec'
import type { BlockEdits, BlockPatch } from './context'
import { isEmptyPatch } from './order'
import type { TablePatch } from './patch'
import { cleanWidths } from '@/kit/coldrag'

/**
 * Each viewer's own view of the blocks (owner, 2026-10-26: "when a person changes the view — a chart type — it should be
 * kept on their side, in their browser; it shouldn't load the server while using the dashboard. Every time they come
 * back it shouldn't be the default again, it should be that person's view"). Like the viewer's own filters
 * (livefilters/personal.ts): the dashboard's block edits (context.tsx, edited in edit mode, stored on the server for a
 * live project) are the defaults for everyone; on top of them this browser keeps, per dashboard and page, what this
 * viewer changed outside edit mode — a chart's form and the view tab they stood on last. Since 2026-10-26 ("the user
 * shouldn't be able to change the sizes… only the filters, the UI and the type of chart") a place, size, hiding or
 * table setting kept here by an older version is read but never applied. Merged field by field: a field the viewer
 * did not change follows the owner (a later change reaches them too), one they changed is theirs. A block the owner hid
 * stays hidden. Pure functions (personal.test.ts) + a storage that never throws.
 */

/** one block as this viewer changed it: null = "the original" (the owner's value is set, the viewer went back from it) */
export interface MyBlock {
  visual?: VisualType | null
  order?: number | null
  span?: number | null
  h?: 'compact' | 'tall' | null
  /** hidden for this viewer only ("Menga ko'rsatmaslik"); a viewer cannot show a block the owner hid */
  hidden?: true
  table?: TablePatch | null
  viewTables?: Record<string, TablePatch | null>
  /** the view tab stood on last (views.ts) */
  view?: string
}
export type MyBlocks = Record<string, MyBlock>

const VERSION = 1
const MAX_BLOCKS = 200
const MAX_TABLE_JSON = 20_000
const ID_RX = /^[^\u0000-\u001f]{1,240}$/
const WORD_RX = /^[A-Za-z0-9_:.-]{1,60}$/

/** where this browser keeps a viewer's blocks for one dashboard page (scope = "live:<slug>" / "demo:<id>") */
export const myBlocksKey = (scope: string, page: string) => `d365.myblocks.${scope}|${page}`

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strs = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= 200).slice(0, 100) : undefined)

/** a table patch read back: an object of the known shape (unknown keys kept as they were when small), else undefined */
function cleanTable(v: unknown): TablePatch | undefined {
  if (!isObj(v)) return undefined
  try {
    if (JSON.stringify(v).length > MAX_TABLE_JSON) return undefined
  } catch {
    return undefined
  }
  const out: Record<string, unknown> = { ...v }
  for (const k of ['hidden', 'order', 'levels'] as const) {
    if (out[k] === undefined) continue
    const s = strs(out[k])
    if (s) out[k] = s
    else delete out[k]
  }
  if (out.sort !== undefined) {
    const s = out.sort
    if (!(isObj(s) && typeof s.key === 'string' && (s.dir === 'asc' || s.dir === 'desc'))) delete out.sort
  }
  if (out.rows !== undefined && !(typeof out.rows === 'number' && Number.isInteger(out.rows) && out.rows > 0 && out.rows <= 1000)) delete out.rows
  for (const k of ['labels', 'colColors', 'colRules', 'colFormat']) if (out[k] !== undefined && !isObj(out[k])) delete out[k]
  if (out.barStyle !== undefined && out.barStyle !== 'line') delete out.barStyle
  // columns dragged to another width on their headers (kit/coldrag.ts): whole pixels within the limits only
  if (out.widths !== undefined) {
    const w = cleanWidths(out.widths)
    if (w) out.widths = w
    else delete out.widths
  }
  return out as TablePatch
}

function cleanBlock(v: unknown): MyBlock | null {
  if (!isObj(v)) return null
  const b: MyBlock = {}
  if (v.visual === null || (typeof v.visual === 'string' && WORD_RX.test(v.visual))) b.visual = v.visual as VisualType | null
  if (v.order === null || (typeof v.order === 'number' && Number.isInteger(v.order) && v.order >= 0 && v.order < 10_000)) b.order = v.order as number | null
  if (v.span === null || (typeof v.span === 'number' && Number.isInteger(v.span) && v.span >= 1 && v.span <= 12)) b.span = v.span as number | null
  if (v.h === null || v.h === 'compact' || v.h === 'tall') b.h = v.h
  if (v.hidden === true) b.hidden = true
  if (v.table === null) b.table = null
  else {
    const t = cleanTable(v.table)
    if (t) b.table = t
  }
  if (isObj(v.viewTables)) {
    const vt: Record<string, TablePatch | null> = {}
    for (const [k, x] of Object.entries(v.viewTables).slice(0, 40)) {
      if (!WORD_RX.test(k)) continue
      if (x === null) vt[k] = null
      else {
        const t = cleanTable(x)
        if (t) vt[k] = t
      }
    }
    if (Object.keys(vt).length) b.viewTables = vt
  }
  if (typeof v.view === 'string' && WORD_RX.test(v.view)) b.view = v.view
  return Object.keys(b).length ? b : null
}

/** what was read → a viewer's blocks; anything not of the shape (old, broken, another version) is ignored → {} */
export function cleanMyBlocks(raw: unknown): MyBlocks {
  if (!isObj(raw) || raw.v !== VERSION || !isObj(raw.blocks)) return {}
  const out: MyBlocks = {}
  for (const [id, v] of Object.entries(raw.blocks).slice(0, MAX_BLOCKS)) {
    if (!ID_RX.test(id)) continue
    const b = cleanBlock(v)
    if (b) out[id] = b
  }
  return out
}

/** this viewer has changed something of the look (the view tab stood on alone is not a change of the look) */
export const hasMine = (m: MyBlocks | null | undefined): boolean =>
  !!m && Object.values(m).some((b) => Object.keys(b).some((k) => k !== 'view'))

export function readMyBlocks(key: string, store: Pick<Storage, 'getItem'> | undefined = safeStorage()): MyBlocks {
  try {
    const raw = store?.getItem(key)
    return raw ? cleanMyBlocks(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

/** stores them (nothing left → the entry is removed, so the page follows the defaults again); false when it could not */
export function writeMyBlocks(key: string, m: MyBlocks, store: Pick<Storage, 'setItem' | 'removeItem'> | undefined = safeStorage()): boolean {
  try {
    if (!store) return false
    if (!Object.keys(m).length) store.removeItem(key)
    else store.setItem(key, JSON.stringify({ v: VERSION, blocks: m }))
    return true
  } catch {
    return false
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * The edits this viewer sees: the dashboard's defaults with their own changes on top, field by field. Only blocks of
 * `page` take the viewer's changes (the keys are the page's, `<page>:…`). A block the owner hid stays hidden.
 */
export function mergeBlocks(defaults: BlockEdits, mine: MyBlocks, page: string): BlockEdits {
  const ids = Object.keys(mine).filter((id) => id.startsWith(page + ':'))
  if (!ids.length) return defaults
  const out: BlockEdits = { ...defaults }
  for (const id of ids) {
    const m = mine[id]!
    const d = defaults[id]
    const p: BlockPatch = { ...d }
    if (m.visual !== undefined) {
      if (m.visual) p.visual = m.visual
      else delete p.visual
    }
    // only the chart type is the viewer's (older saved sizes / order / hidden / columns in this browser are ignored)
    if (isEmptyPatch(p)) delete out[id]
    else out[id] = p
  }
  return out
}

/**
 * What this viewer changed: `next` (the edits as they now see them, after a drag, a ✕, a pencil, a sort) compared with
 * the defaults, field by field, for the blocks of `page`. A field equal to the default is not kept (it follows the
 * owner again). The view tabs stood on are carried over from `prev`.
 */
export function mineFrom(defaults: BlockEdits, next: BlockEdits, page: string, prev: MyBlocks = {}): MyBlocks {
  const ids = new Set([...Object.keys(next), ...Object.keys(defaults), ...Object.keys(prev)].filter((id) => id.startsWith(page + ':')))
  const out: MyBlocks = {}
  for (const id of ids) {
    const n = next[id]
    const d = defaults[id]
    const b: MyBlock = {}
    // owner, 2026-10-26: a viewer may change the filters, the look (Ko'rinish) and a chart's TYPE — nothing else
    // (no sizes, order, hiding, columns); those stay the owner's, set in edit mode
    if (!same(n?.visual, d?.visual)) b.visual = n?.visual ?? null
    const view = prev[id]?.view
    if (view) b.view = view
    if (Object.keys(b).length) out[id] = b
  }
  // the other pages' entries (a stored key is per page, but be safe) are kept as they were
  for (const [id, b] of Object.entries(prev)) if (!id.startsWith(page + ':')) out[id] = b
  return out
}

/** the view tab stood on in a block, remembered (or forgotten with undefined) */
export function withMyView(m: MyBlocks, id: string, view: string | undefined): MyBlocks {
  const cur = m[id]
  if ((cur?.view ?? undefined) === view) return m
  const b: MyBlock = { ...cur }
  if (view && WORD_RX.test(view)) b.view = view
  else delete b.view
  const out = { ...m }
  if (Object.keys(b).length) out[id] = b
  else delete out[id]
  return out
}

/** "Asl holiga": the look back to the dashboard's defaults; the view tabs stood on are kept (they are not the look) */
export function withoutLook(m: MyBlocks): MyBlocks {
  const out: MyBlocks = {}
  for (const [id, b] of Object.entries(m)) if (b.view) out[id] = { view: b.view }
  return out
}
