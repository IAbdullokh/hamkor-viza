import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { BlockChartCtx, type BlockPatch } from './context'
import type { TablePatch } from './patch'
import { cleanTint, tidyTable } from './patch'

/**
 * A block's view tabs (owner, 2026-10-26, "Xaridor va konversiya" with Mas'ul / Manba / Bosqich / Sana: "if I want to
 * delete the Manba table, it should be choosable — delete only the view I'm standing on"). A page that draws a view
 * switcher in a card's header calls useBlockViews: it gets the views as the block's edit shows them (hidden ones left
 * out, reordered, renamed — BlockPatch.views) and the view the person stands on, kept valid. The view stood on is shared
 * by the dashboard's block and its zoomed editor (one store, by block id), and a block with views keeps its table
 * settings per view (BlockPatch.viewTables; the block-wide `table` stays the fallback of old saved edits).
 */

export interface ViewsPatch {
  hidden?: string[]
  order?: string[]
  labels?: Record<string, string>
}
export interface ViewOption<T extends string = string> {
  value: T
  label: string
}

export const MAX_VIEW_LABEL = 30

/** the views as the patch shows them: ordered, renamed, the hidden ones left out (never all of them) */
export function shownViews<T extends string>(options: ViewOption<T>[], p?: ViewsPatch): ViewOption<T>[] {
  if (!p) return options
  const keys = options.map((o) => o.value as string)
  const byKey = new Map(options.map((o) => [o.value as string, o]))
  const hidden = new Set(p.hidden ?? [])
  const shown = orderedViews(keys, p)
    .map((k) => byKey.get(k)!)
    .filter((o) => !hidden.has(o.value))
  const out = shown.length ? shown : options.slice(0, 1)
  return out.map((o) => (p.labels?.[o.value] ? { ...o, label: p.labels[o.value]! } : o))
}

/** the keys in their shown order: the saved order first (known keys only), then the others in the block's own order */
export function orderedViews(keys: string[], p?: ViewsPatch): string[] {
  const known = new Set(keys)
  const first = (p?.order ?? []).filter((k, i, a) => known.has(k) && a.indexOf(k) === i)
  return [...first, ...keys.filter((k) => !first.includes(k))]
}

/** the view stood on if it is shown, else the first shown one */
export const validView = <T extends string>(cur: string | undefined, shown: ViewOption<T>[]): T | undefined =>
  (shown.find((o) => o.value === cur) ?? shown[0])?.value

function tidyViews(p: ViewsPatch): ViewsPatch | undefined {
  const out: ViewsPatch = {}
  if (p.hidden?.length) out.hidden = p.hidden
  if (p.order?.length) out.order = p.order
  if (p.labels && Object.keys(p.labels).length) out.labels = p.labels
  return Object.keys(out).length ? out : undefined
}

/** the view hidden (the last shown one cannot be) or shown again */
export function toggleView(p: ViewsPatch | undefined, key: string, keys: string[]): ViewsPatch | undefined {
  const hidden = new Set(p?.hidden ?? [])
  if (hidden.has(key)) hidden.delete(key)
  else if (keys.filter((k) => !hidden.has(k)).length > 1) hidden.add(key)
  return tidyViews({ ...p, hidden: keys.filter((k) => hidden.has(k)) })
}

/** every hidden view shown again */
export const showAllViews = (p: ViewsPatch | undefined): ViewsPatch | undefined => tidyViews({ ...p, hidden: undefined })

/** the view's new name (≤ 30); empty or its own name again drops the rename */
export function renameView(p: ViewsPatch | undefined, key: string, label: string, original: string): ViewsPatch | undefined {
  const labels = { ...p?.labels }
  const name = label.trim().slice(0, MAX_VIEW_LABEL)
  if (!name || name === original || /[<>]/.test(name)) delete labels[key]
  else labels[key] = name
  return tidyViews({ ...p, labels })
}

/** the view moved one place back (-1) or forward (+1) among the shown ones (a hidden one is stepped over) */
export function moveView(p: ViewsPatch | undefined, key: string, step: -1 | 1, keys: string[]): ViewsPatch | undefined {
  const order = orderedViews(keys, p)
  const hidden = new Set(p?.hidden ?? [])
  const shown = order.filter((k) => !hidden.has(k))
  const i = shown.indexOf(key)
  const other = shown[i + step]
  if (i < 0 || other === undefined) return p
  const next = order.filter((k) => k !== key)
  next.splice(next.indexOf(other) + (step > 0 ? 1 : 0), 0, key)
  return tidyViews({ ...p, order: next.every((k, i) => k === keys[i]) ? undefined : next })
}

/** Nova's views change (only the fields it sent; its own keys only, never all hidden) on top of the block's */
export interface NovaViews {
  hidden?: string[] | null
  order?: string[] | null
  labels?: Record<string, string> | null
}
export function mergeNovaViews(cur: ViewsPatch | undefined, n: NovaViews, keys: string[]): ViewsPatch | undefined {
  const known = (xs: string[]) => xs.filter((k, i) => keys.includes(k) && xs.indexOf(k) === i)
  const next: ViewsPatch = { ...cur }
  if (n.hidden) next.hidden = known(n.hidden)
  if (n.order) next.order = orderedViews(keys, { order: known(n.order) })
  if (n.labels) {
    const labels = { ...cur?.labels }
    for (const [k, v] of Object.entries(n.labels)) if (keys.includes(k) && typeof v === 'string' && v.trim() && !/[<>]/.test(v)) labels[k] = v.trim().slice(0, MAX_VIEW_LABEL)
    next.labels = labels
  }
  if (next.hidden && keys.length && next.hidden.length >= keys.length) next.hidden = next.hidden.slice(0, keys.length - 1)
  return tidyViews(next)
}

/* ── Per-view tables ───────────────────────────────────────────────────────────────────────────────────── */

/** the table settings of one view (its own, else the block-wide ones of an older edit); the block's own without a view */
export const tableFor = (p: BlockPatch | undefined, view: string | undefined): TablePatch | undefined =>
  view ? (p?.viewTables?.[view] ?? p?.table) : p?.table

/** the edit as the column tools of one view see it: `table` is that view's */
export const viewDraft = (p: BlockPatch, view: string | undefined): BlockPatch => (view ? { ...p, table: tableFor(p, view) } : p)

/** a view-local edit put back on the block's edit: its `table` goes to viewTables[view], the block-wide one stays */
export function liftDraft(base: BlockPatch, next: BlockPatch, view: string | undefined): BlockPatch {
  if (!view) return next
  const out: BlockPatch = { ...next, table: base.table }
  if (out.table === undefined) delete out.table
  out.viewTables = withViewTable(base.viewTables, view, next.table)
  if (!out.viewTables) delete out.viewTables
  return out
}

/** the per-view tables with one view's replaced (an empty one dropped; nothing left = undefined) */
export function withViewTable(tables: Record<string, TablePatch> | undefined, view: string, table: TablePatch | undefined): Record<string, TablePatch> | undefined {
  const next = { ...tables }
  const t = tidyTable(table)
  if (t) next[view] = t
  else delete next[view]
  return Object.keys(next).length ? next : undefined
}

/* ── The view stood on, shared by the block and its zoomed editor ─────────────────────────────────────── */

const current = new Map<string, string>()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function setCurrentView(id: string, view: string) {
  if (current.get(id) === view) return
  current.set(id, view)
  for (const fn of listeners) fn()
  for (const fn of chosen) fn(id, view)
}
/** told of each view chosen (the viewer's own layer remembers the last one per block, personal.ts) */
const chosen = new Set<(id: string, view: string) => void>()
export function onViewChange(fn: (id: string, view: string) => void): () => void {
  chosen.add(fn)
  return () => {
    chosen.delete(fn)
  }
}
/** the view stood on in the block `id` ('' = none): as stored (validate it with validView) */
export function useCurrentView(id: string): string | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? current.get(id) : undefined),
    () => undefined,
  )
}

/**
 * The views of a block's view switcher as its edit shows them and the view stood on (always one of them). Inside a
 * dashboard's block the choice is shared with its zoomed editor and the block learns its views (the editor's
 * "Ko'rinishlar", Nova); elsewhere it is the switcher's own state.
 */
export function useBlockViews<T extends string>(
  options: ViewOption<T>[],
  /** the switcher's own state (outside a dashboard's block; also the first view inside one) */
  own?: { value: T; set: (v: T) => void },
): { options: ViewOption<T>[]; value: T; setValue: (v: T) => void } {
  const ctx = useContext(BlockChartCtx)
  const id = ctx?.blockId ?? ''
  const [local, setLocal] = useState<string | undefined>()
  const stored = useCurrentView(id)
  const shown = shownViews(options, ctx?.views)
  const value = (validView(id ? (stored ?? own?.value) : (own?.value ?? local), shown) ?? options[0]!.value) as T
  const report = ctx?.reportViews
  const sig = options.map((o) => `${o.value}\u0001${o.label}`).join('\u0002')
  useEffect(() => {
    report?.(options.map((o) => ({ value: o.value, label: o.label })))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sig is the options
  }, [report, sig])
  const set = own?.set
  const setValue = useCallback(
    (v: T) => {
      if (id) setCurrentView(id, v)
      if (set) set(v)
      else if (!id) setLocal(v)
    },
    [id, set],
  )
  return { options: shown, value, setValue }
}

/** a view switcher in a card's header: the views shown (none when only one is left) and the switch (data-block-keep: it
 * keeps working in edit mode) */
export const VIEW_KEEP = { 'data-block-keep': '' } as const

/**
 * Nova's change for a block with views: a table change goes to the view stood on (viewTables), its views change is put
 * on the block's (only its own views). Null when nothing is left.
 */
export function liftChange(
  change: BlockPatch | null,
  nv: NovaViews | null | undefined,
  draft: BlockPatch,
  view: string | undefined,
  viewKeys: string[],
  /** column colours Nova gives every view (Bitrix's stage colours, NovaPatch.everyView): put on each view's table too */
  everyView?: Record<string, string> | null,
): BlockPatch | null {
  const out: BlockPatch = { ...change }
  if (view && change && Object.prototype.hasOwnProperty.call(change, 'table')) {
    out.viewTables = withViewTable(draft.viewTables, view, change.table)
    delete out.table
    const colors = Object.entries(everyView ?? {}).flatMap(([k, c]) => (cleanTint(c) ? [[k, cleanTint(c)!] as const] : []))
    for (const v of colors.length ? viewKeys : [])
      if (v !== view) {
        const t = tableFor(draft, v)
        out.viewTables = withViewTable(out.viewTables, v, { ...t, colColors: { ...t?.colColors, ...Object.fromEntries(colors) } })
      }
  }
  if (nv && viewKeys.length) {
    const v = mergeNovaViews(draft.views, nv, viewKeys)
    if (JSON.stringify(v ?? null) !== JSON.stringify(draft.views ?? null)) out.views = v
  }
  return Object.keys(out).length ? out : null
}
