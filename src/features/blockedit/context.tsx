import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { readLocal, writeLocal } from '@/lib/storage'
import { dropAliased, withAliases } from './aliases'
import type { VisualType } from '@/spec'
import type { AddedChart } from '@/features/addchart/model'
import { useT } from '@/i18n'
import { useToast } from '@/ui/overlay'
import { isEmptyPatch, titleFromId } from './order'
import { watchJobs } from './blockjob'
import { applyStep, diffStep, emptyHistory, historyKey, nextRedo, nextUndo, ofLayer, pushLayer, redoLayer, settingStep, splitStep, stepKeys, undoKey, undoLayer, type History, type Layer, type Setting, type Step } from './history'
import { hasMine, mergeBlocks, mineFrom, myBlocksKey, readMyBlocks, withMyView, withoutLook, writeMyBlocks, type MyBlocks } from './personal'
import { stepLabel } from './steplabel'
import type { BlockTint, TableColumnInfo, TablePatch } from './patch'
import { onViewChange, setCurrentView, type ViewOption, type ViewsPatch } from './views'
import { draftSync, type PutResult } from './draftsync'

/**
 * Editing a dashboard by pointing at it (owner, 2026-10-24, the boss's "Google AI Studio / Pinterest" idea): ✎ turns edit
 * mode on, a click on any block opens it zoomed with its title editable, chart-form chips, "hide", and "ask Nova". The
 * edits are block id → { title?, hidden?, visual? }: a live project keeps them on the server (everyone opening the link
 * sees them, only a signed-in user saves), the demo designs keep them in this browser.
 */
export interface BlockPatch {
  title?: string
  hidden?: boolean
  visual?: VisualType
  /** the one measure a one-measure form (treemap, donut, funnel…) draws: a series / number column's name (unset = the first) */
  visualMeasure?: string
  /** the block's place among the blocks of its container (grid / column), 0 = first; set by dragging (order.ts) */
  order?: number
  /** the block's colour: its tile / accent and its chart's series (patch.ts BLOCK_COLORS, or a custom "#rrggbb") */
  color?: BlockTint
  /** the block's table: hidden columns, their order, new names, a sort, a top-N (patch.ts, kit/DataTable) */
  table?: TablePatch
  /** the block's width in columns of a 12-column grid, 1..12 (layout.ts; unset = its automatic share) */
  span?: number
  /** the block's height (layout.ts): 'compact' = a KPI without sparkline / a ~200px chart, 'tall' = a ~420px chart; unset = normal */
  h?: 'compact' | 'tall'
  /** "Qo'lda": a height of its own in px, dragged freely (layout.ts manualHeight; the card is exactly this tall) */
  hpx?: number
  /** a size set aside by the old page-wide "Avtomatik": kept but not applied (a new drag starts from the screen, fromScreen) */
  off?: true
  /**
   * the block's own data (owner, 2026-11-03: "a person changes which field the card takes its number from — everything
   * should be possible"): a chart in the added charts' shape drawn in the block's place (OwnBlock); unset = the page's own
   */
  source?: AddedChart
  /** a block with view tabs: its views hidden / reordered / renamed, and its table settings per view (views.ts) */
  views?: ViewsPatch
  viewTables?: Record<string, TablePatch>
}
export type BlockEdits = Record<string, BlockPatch>

/** a block as the project chat reads it (no render function) */
export type BlockSummary = Pick<BlockInfo, 'id' | 'kind' | 'title' | 'chart' | 'table' | 'views' | 'explain'>

export type BlockScope = { kind: 'live'; slug: string } | { kind: 'demo'; id: string }

export interface BlockInfo {
  id: string
  kind: 'stat' | 'card'
  title: string
  /** set by a chart inside the block: its own form and the forms it can switch to */
  chart?: { origin: VisualType; visuals: VisualType[]; measures?: string[] }
  /** set by a table inside the block (kit/DataTable): all its columns, the hidden ones too, in the table's own order */
  table?: { columns: TableColumnInfo[] }
  /** set by a table that can be nested (kit/hier HierTable): its own breakdown and the ones it may open into */
  hier?: HierInfo
  /** draws the block with a given edit (the zoomed overlay's live preview) */
  render?: (patch: BlockPatch) => ReactNode
  /** set by a view switcher in the block's header (views.ts useBlockViews): all its views in the block's own order */
  views?: ViewOption[]
  /** how the block's number is computed (a KPI card's definition, e.g. pages/lead/explain.ts): sent to Nova as `metric` */
  explain?: () => unknown
}

interface Ctx {
  page: string
  /** where this dashboard's edits live (live slug / demo design) — the added filters and charts are stored beside them */
  scope: BlockScope
  edits: BlockEdits
  canEdit: boolean
  editing: boolean
  setEditing: (v: boolean) => void
  focused: BlockInfo | null
  focus: (b: BlockInfo | null) => void
  /**
   * Edit mode left in the middle comes back as it was (owner, 2026-11-03: "Tahrirlash shouldn't be done until the person
   * presses it"): the block whose editor was open opens again once — true for that block's id, the first time it asks.
   */
  takeResume: (id: string) => boolean
  /** what viewers see now (the published edits): the change log compares the draft with it (changelog.ts) */
  published: BlockEdits
  /** saves one block (null = back to the original); resolves when stored */
  save: (id: string, patch: BlockPatch | null) => Promise<void>
  /** true while something is being saved or asked — the dashboard shows it (DataLens style) */
  busy: boolean
  setBusy: (v: boolean) => void
  /** replaces all edits at once and shows it at once (a drag, a delete, an undo); rolls back and throws if not stored */
  apply: (next: BlockEdits | ((prev: BlockEdits) => BlockEdits)) => Promise<void>
  /** the original titles of the blocks seen on this page (also the hidden ones) — the "Yashirilgan bloklar" list */
  known: Record<string, string>
  remember: (id: string, title: string) => void
  /** each block tells what it is (kind, chart forms, table columns, views) for the project chat (features/novaedit) */
  describe: (info: BlockSummary) => void
  /** the blocks seen on this page as they last told it (id → summary) */
  described: () => Record<string, BlockSummary>
  /**
   * This editor's unpublished changes (owner, 2026-11-03: "whenever a person leaves everything is kept until confirm or
   * cancel, from any device"): in edit mode every change goes to their draft on the server (LiveDrafts), viewers keep the
   * published dashboard. `at` = when it was last written; null = no draft.
   */
  draft: { at: string | null }
  /** "Saqlash": the draft (blocks + added charts) becomes the dashboard; 'stale' = someone published since — ask before `force` */
  publish: (force?: boolean) => Promise<'ok' | 'stale'>
  /** "Bekor qilish": the draft is dropped, the dashboard stays as published */
  discard: () => Promise<void>
  /** the draft changed on the server (an earlier version restored into it, VersionsPanel): read it again */
  reloadDraft: () => Promise<void>
  /** bumped when the draft is published or dropped: the added charts read theirs again */
  draftVersion: number
  /** bumped by "Tartibni tiklash": the page body remounts so the cards come back in the page's own order */
  epoch: number
  bumpEpoch: () => void
  /** "Grafik qo'shish" / "Filtr qo'shish" in the edit bar: set by the feature that handles them (useEditAction) */
  addChart?: () => void
  addFilter?: () => void
  /** "✨ AI tavsiyasi": Opus 5.5 suggests charts for the page (features/addchart/AiRecommend) */
  aiRecommend?: () => void
  setAction: (name: EditAction, fn: (() => void) | undefined) => void
  /**
   * A block says its id and, when the title read back from a translation gave it another one before, that old id
   * (aliases.ts): what was kept under the old id is read under the new one and moves with the next change. Called again
   * with `old` = null when the block has no other id; `forget` when it leaves the page.
   */
  alias: (id: string, old: string | null) => void
  forget: (id: string) => void
  /** the block's old id, if it has one (its chat kept there is still its own) */
  oldIdOf: (id: string) => string | null
  /** "← Ortga" / "Oldinga →" for the layer in view: the defaults in edit mode, this viewer's own view outside it */
  history: HistoryApi
  /** a page setting (the filter section, the background) changed in edit mode: one step for the arrows (useSettingHistory) */
  recordSetting: (setting: Setting, label: string, before: unknown, after: unknown) => void
  /** how a setting shows and stores a value again on an undo / redo; returns the function that drops it */
  onSettingUndo: (setting: Setting, restore: (value: unknown) => void) => () => void
  /** this viewer changed the page for themselves (kept in this browser only, personal.ts) — "Mening ko'rinishim" */
  mine: boolean
  /** "Asl holiga": the viewer's own changes of this page go, the dashboard's defaults again */
  resetMine: () => void
}

/** the page's history of changes as the arrows and each block's "↶ Bekor qilish" use it (history.ts) */
export interface HistoryApi {
  /** the step "Ortga" would take back (its name), none = nothing to undo */
  undoLabel?: string
  redoLabel?: string
  undo: () => void
  redo: () => void
  /** the last change of this block taken back on its own */
  undoBlock: (id: string) => void
  /** the name of the last change of this block, none = nothing to undo on it */
  blockLabel: (id: string) => string | undefined
}

export type EditAction = 'addChart' | 'addFilter' | 'aiRecommend'

const BlockEditCtx = createContext<Ctx | null>(null)

/** the block-edit state of the dashboard around, or null outside one (cards then render as before) */
export const useBlockEdit = () => useContext(BlockEditCtx)

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const localKey = (id: string) => `d365.blocks.${id}`
/**
 * A catalog dashboard's edit session (owner, 2026-11-04: "there is no cancel button — it should be in every dashboard
 * type"): a demo's change is stored in this browser at once, so what it was when edit mode opened is kept beside it —
 * "Bekor qilish" puts it back (blocks and added charts), "Saqlash" keeps the changes. A reload in the middle keeps it.
 */
const beforeKey = (id: string) => `d365.blocks.${id}.before`
const chartsKey = (id: string) => `d365.charts.${id}`
// the page's filters and background are part of the session too (livefilters/store, pagebg/store keep them under these)
const filtersKey = (id: string) => `d365.filters.${id}`
const prefsKey = (id: string) => `d365.prefs.demo:${id}`
interface DemoBefore {
  blocks: BlockEdits
  charts: unknown
  filters?: unknown
  prefs?: unknown
  at: string
}
const readBefore = (id: string): DemoBefore | null => {
  const b = readLocal<DemoBefore | null>(beforeKey(id), null)
  return b && typeof b === 'object' && typeof b.at === 'string' ? b : null
}

/**
 * The dashboard's published block edits. A failed read throws (owner, 2026-11-09: a read that failed while the server was
 * busy with a refresh was taken as "no edits" — the cards showed in the page's own places, and the next change in edit
 * mode was saved on top of nothing): the caller keeps what it has and asks again.
 */
async function loadEdits(scope: BlockScope, signal: AbortSignal): Promise<BlockEdits> {
  if (scope.kind === 'demo') return readLocal<BlockEdits>(localKey(scope.id), {})
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/blocks`, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`blocks ${res.status}`)
  const body = (await res.json()) as unknown
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('blocks: not a map')
  return body as BlockEdits
}

/** an editor's draft of a live dashboard: its block edits, added charts, the page's filters and background (LiveDrafts) */
export interface EditorDraft {
  blocks?: BlockEdits
  charts?: unknown
  filters?: unknown
  prefs?: { background?: string }
  updatedAt?: string
  /** each part's version as the server holds it (the draft's value, or the live one while the draft has none) */
  versions?: Partial<Record<DraftPart, string>>
}
export type DraftPart = 'blocks' | 'charts' | 'filters' | 'prefs'

/** the signed-in editor's draft of a live dashboard; null when none / not signed in */
export async function loadDraft(scope: BlockScope, signal?: AbortSignal): Promise<EditorDraft | null> {
  if (scope.kind !== 'live') return null
  try {
    const d = await readDraft(scope, signal)
    return d && (d.blocks || d.charts || d.filters || d.prefs) ? d : null
  } catch {
    return null
  }
}

/**
 * The editor's draft as the server answers (with the parts' versions); null = none for this person (not signed in);
 * throws when it could not be read — then nobody may take "no draft" for an answer (it would hide the person's changes
 * and the next save would put the published dashboard over them).
 */
async function readDraft(scope: BlockScope & { kind: 'live' }, signal?: AbortSignal): Promise<EditorDraft | null> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/draft`, { headers: { Accept: 'application/json' }, signal })
  if (res.status === 401 || res.status === 403 || res.status === 404) return null
  if (!res.ok) throw new Error(`draft ${res.status}`)
  return (await res.json()) as EditorDraft
}

/** said on the window after each part of the draft is stored (the change log reads it again, ChangesPanel) */
export const DRAFT_STORED = 'd365:draft-stored'

/** the longest one save of the draft may take before it counts as lost on the way (and is tried again) */
const PUT_MS = 8_000
/** "Saqlash" ends within this: published, or a clear error with a way to try again (owner, 2026-11-09: the spinner never stopped) */
const PUBLISH_MS = 15_000
const READ_MS = 8_000

/**
 * writes one part of the editor's draft (PUT …/draft {part}); the live dashboard does not change. With `version` (the one
 * the value was made on) a stale save gets 409 back as `conflict` instead of overwriting a newer one.
 */
async function putDraftPart(scope: BlockScope, part: DraftPart, value: unknown, version?: string): Promise<PutResult> {
  if (scope.kind !== 'live') return { ok: true }
  for (let attempt = 0; ; attempt++) {
    let status = 0
    try {
      const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
        body: JSON.stringify(version ? { [part]: value, versions: { [part]: version } } : { [part]: value }),
        signal: AbortSignal.timeout(PUT_MS),
      })
      if (res.ok) {
        window.dispatchEvent(new Event(DRAFT_STORED))
        const d = (await res.json().catch(() => null)) as EditorDraft | null
        return { ok: true, version: d?.versions?.[part] }
      }
      status = res.status
      if (status === 409) {
        const e = (await res.json().catch(() => null)) as { code?: string; params?: { version?: string; value?: unknown } } | null
        const p = e?.params
        if (e?.code === 'STATE_CONFLICT' && p && typeof p.version === 'string' && p.value && typeof p.value === 'object')
          return { ok: false, conflict: { version: p.version, value: p.value as BlockEdits } }
      }
    } catch {
      status = 0
    }
    const transient = status === 0 || status >= 500
    if (!transient || attempt >= RETRY_MS.length) throw new Error(`draft ${status}`)
    await new Promise((r) => setTimeout(r, RETRY_MS[attempt]))
  }
}

/** writes one part of the editor's draft (PUT …/draft {blocks} or {charts}); the live dashboard does not change */
export async function storeDraftPart(scope: BlockScope, part: DraftPart, value: unknown): Promise<void> {
  await putDraftPart(scope, part, value)
}

/** a save that meets a restarting server / a network blip tries again: ~5 s in all, then it fails loudly (never silently) */
const RETRY_MS = [500, 1500, 3000]

export function BlockEditProvider({ scope, page, canEdit, children }: { scope: BlockScope; page: string; canEdit: boolean; children: ReactNode }) {
  const { t } = useT()
  const toast = useToast()
  // a save that still failed after its retries says so: an edit must never vanish without a word
  const lost = () => toast(t("Bloklardagi o'zgarish saqlanmadi — internetni tekshirib, qayta o'zgartiring"), 'error')
  // the dashboard's edits for everyone (edit mode changes them; a live project keeps them on the server)
  const [defaults, setDefaults] = useState<BlockEdits>({})
  // what viewers see (the published edits); `defaults` is what edit mode changes — the editor's draft when they have one
  const [published, setPublished] = useState<BlockEdits>({})
  const latestPub = useRef(published)
  latestPub.current = published
  const [draftAt, setDraftAt] = useState<string | null>(null)
  const [draftVersion, setDraftVersion] = useState(0)
  const [editing, setEditing] = useState(false)
  const [focused, setFocused] = useState<BlockInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [known, setKnown] = useState<Record<string, string>>({})
  const [epoch, setEpoch] = useState(0)
  const [actions, setActions] = useState<Partial<Record<EditAction, () => void>>>({})
  const scopeKey = scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`
  // this viewer's own changes of the page, outside edit mode (personal.ts): only in this browser, never on the server
  const myKey = myBlocksKey(scopeKey, page)
  const [mine, setMine] = useState<MyBlocks>(() => readMyBlocks(myKey))
  // the page's history of changes (history.ts): for this page session only, both layers; a step's values are block
  // patches and, under "#filters" / "#bg", the page's settings
  const [hist, setHist] = useState<History<unknown>>(emptyHistory)
  const editingNow = canEdit && editing
  // edit mode is left only by Saqlash / Bekor qilish / Tayyor: leaving the page in the middle keeps it on (this browser
  // remembers it and the open block; another device comes back to edit mode through the draft)
  const resumeKey = `d365.editing.${scopeKey}`
  const resume = useRef<string | null>(null)
  const setEditingKept = useCallback(
    (v: boolean) => {
      setEditing(v)
      writeLocal(resumeKey, v ? { block: null } : null)
      // a catalog dashboard: edit mode opens a session "Bekor qilish" can take back (beforeKey)
      if (scope.kind === 'demo') {
        if (v && !readBefore(scope.id)) {
          const at = new Date().toISOString()
          writeLocal(beforeKey(scope.id), {
            blocks: latest.current,
            charts: readLocal<unknown>(chartsKey(scope.id), {}),
            filters: readLocal<unknown>(filtersKey(scope.id), null),
            prefs: readLocal<unknown>(prefsKey(scope.id), null),
            at,
          } satisfies DemoBefore)
          setDraftAt(at)
        } else if (!v) {
          writeLocal(beforeKey(scope.id), null)
          setDraftAt(null)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [resumeKey, scopeKey],
  )
  const focusKept = useCallback(
    (b: BlockInfo | null) => {
      setFocused(b)
      if (editingRef.current) writeLocal(resumeKey, { block: b?.id ?? null })
    },
    [resumeKey],
  )
  const takeResume = useCallback((id: string) => {
    if (resume.current !== id) return false
    resume.current = null
    return true
  }, [])
  // a block's old id (its title read back from a translation, aliases.ts) and the blocks on the page now
  const aliases = useRef(new Map<string, string>())
  const mounted = useRef(new Set<string>())
  const [aliasTick, setAliasTick] = useState(0)
  const alias = useCallback((id: string, old: string | null) => {
    const had = aliases.current.get(id) ?? null
    const was = mounted.current.has(id)
    if (old && old !== id) aliases.current.set(id, old)
    else aliases.current.delete(id)
    mounted.current.add(id)
    if (had !== (old && old !== id ? old : null) || !was) setAliasTick((n) => n + 1)
  }, [])
  const forget = useCallback((id: string) => {
    if (!mounted.current.delete(id)) return
    aliases.current.delete(id)
    setAliasTick((n) => n + 1)
  }, [])
  const oldIdOf = useCallback((id: string) => aliases.current.get(id) ?? null, [])
  const aliased = useCallback((e: BlockEdits) => withAliases(e, aliases.current, mounted.current), [])
  const unaliased = useCallback((e: BlockEdits) => dropAliased(e, aliases.current, mounted.current), [])
  // what the page shows: in edit mode the defaults (what everyone gets), else the defaults with this viewer's own on top
  const edits = useMemo(
    () => aliased(editingNow ? defaults : mergeBlocks(published, mine, page)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aliasTick: a block said its old id
    [editingNow, defaults, published, mine, page, aliased, aliasTick],
  )
  // the latest of each, for changes that follow each other quickly (a drag right after a delete)
  const latest = useRef(defaults)
  latest.current = defaults
  const latestMine = useRef(mine)
  latestMine.current = mine
  const latestHist = useRef(hist)
  latestHist.current = hist
  const editingRef = useRef(editingNow)
  editingRef.current = editingNow
  const knownRef = useRef(known)
  knownRef.current = known

  // the draft's block saves of a live dashboard: one after another, each on the version the one before left, merged
  // when another tab or device saved meanwhile (draftsync.ts)
  const sync = useMemo(
    () => draftSync((value, version) => putDraftPart(scope, 'blocks', value, version)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey],
  )
  // the stored edits (and the draft) were read: until then nothing is saved — a save before would be made on nothing
  const ready = useRef(false)
  /** edit mode's save: a demo's at once (this browser), a live dashboard's into the editor's draft; resolves with what was stored */
  const storeEdits = useCallback(
    async (next: BlockEdits): Promise<BlockEdits> => {
      if (scope.kind === 'demo') {
        writeLocal(localKey(scope.id), next)
        return next
      }
      if (!ready.current) throw new Error('blocks not loaded yet')
      return sync.store(next)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, sync],
  )
  /** the save was merged with a newer one from elsewhere: that is shown, unless a newer change of this page already is */
  const adopt = useCallback((asked: BlockEdits, kept: BlockEdits) => {
    if (kept === asked || latest.current !== asked) return
    latest.current = kept
    setDefaults(kept)
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    let timer: number | undefined
    ready.current = false
    // the published edits, and this editor's draft over them (left as it was — any device, same profile). A read that fails
    // is asked again (1 s, 2 s, 4 s … 30 s): never taken for "no edits", never saved over
    const load = (attempt: number) =>
      Promise.all([loadEdits(scope, ac.signal), canEdit && scope.kind === 'live' ? readDraft(scope, ac.signal) : Promise.resolve(null)])
        .then(([live, read]) => {
          if (ac.signal.aborted) return
          const draft = read && (read.blocks || read.charts || read.filters || read.prefs) ? read : null
          latestPub.current = live
          setPublished(live)
          const working = draft?.blocks ?? live
          latest.current = working
          setDefaults(working)
          sync.reset(read?.versions?.blocks, working)
          ready.current = true
          // a catalog dashboard's open edit session (beforeKey) is its draft
          const before = scope.kind === 'demo' ? readBefore(scope.id) : null
          setDraftAt(draft ? (draft.updatedAt ?? new Date().toISOString()) : (before?.at ?? null))
          // Nova's answers worked out on the server for this dashboard's blocks: their signs, also after a reload (blockjob.ts)
          // (a catalog design's too: its jobs are on the server per Studio user, blockjob.ts spaceOf)
          if (canEdit) void watchJobs(scope, ac.signal).catch(() => undefined)
          // back in edit mode when it was left in the middle: an open draft (any device) or this browser's note of it
          const left = readLocal<{ block?: string | null } | null>(resumeKey, null)
          if (canEdit && (draft || before || left)) {
            resume.current = left?.block ?? null
            setEditing(true)
          }
        })
        .catch(() => {
          if (!ac.signal.aborted) timer = window.setTimeout(() => void load(attempt + 1), Math.min(30_000, 1000 * 2 ** attempt))
        })
    void load(0)
    return () => {
      ac.abort()
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey, canEdit])

  // another dashboard / page: its own stored view, a fresh history
  const loadedKey = useRef(myKey)
  useEffect(() => {
    if (loadedKey.current === myKey) return
    loadedKey.current = myKey
    const m = readMyBlocks(myKey)
    latestMine.current = m
    setMine(m)
    setHist(emptyHistory())
  }, [myKey])

  // the view tab stood on last in each block comes back (views.ts), and a new choice is remembered in this browser
  useEffect(() => {
    for (const [id, b] of Object.entries(latestMine.current)) if (b.view && id.startsWith(page + ':')) setCurrentView(id, b.view)
    return onViewChange((id, view) => {
      if (!id.startsWith(page + ':')) return
      const next = withMyView(latestMine.current, id, view)
      if (next === latestMine.current) return
      latestMine.current = next
      setMine(next)
      writeMyBlocks(myKey, next)
    })
  }, [myKey, page])

  // a part of the draft stored by its own feature (added charts, the page's filters, its background): the edit bar shows
  // "Bekor qilish / Saqlash" for it as for a block's change
  useEffect(() => {
    if (scope.kind !== 'live') return
    const on = () => setDraftAt(new Date().toISOString())
    window.addEventListener(DRAFT_STORED, on)
    return () => window.removeEventListener(DRAFT_STORED, on)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey])

  // leaving edit mode closes the zoomed block
  useEffect(() => {
    if (!editing) setFocused(null)
  }, [editing])

  const name = useCallback((id: string) => latest.current[id]?.title ?? knownRef.current[id] ?? titleFromId(id), [])
  const remember_ = useCallback(
    (layer: Layer, prev: BlockEdits, next: BlockEdits) => {
      const step = diffStep<BlockPatch>('', layer, pageOnly(prev, page), pageOnly(next, page))
      if (!step) return
      step.label = stepLabel(step, name, t)
      const h = pushLayer(latestHist.current, step)
      latestHist.current = h
      setHist(h)
    },
    [page, name, t],
  )

  /** a viewer's change: the page as they now see it → what differs from the defaults, kept in this browser */
  const keepMine = useCallback(
    (next: BlockEdits) => {
      const m = mineFrom(latestPub.current, next, page, latestMine.current)
      latestMine.current = m
      setMine(m)
      writeMyBlocks(myKey, m)
    },
    [page, myKey],
  )

  // an undo / redo of the defaults is stored once the clicks stop (one PUT for a run of them)
  const pending = useRef<number | undefined>(undefined)
  const storeSoon = useCallback(() => {
    window.clearTimeout(pending.current)
    pending.current = window.setTimeout(() => {
      pending.current = undefined
      const asked = latest.current
      storeEdits(asked).then((kept) => {
        adopt(asked, kept)
        stored(kept)
      }, lost)
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey, storeEdits])
  useEffect(
    () => () => {
      // leaving the page with an undo not stored yet: stored now
      if (pending.current !== undefined) {
        window.clearTimeout(pending.current)
        pending.current = undefined
        storeEdits(latest.current).catch(lost)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey],
  )

  /** the edit-mode store went through: a demo's change is the dashboard at once, a live one's waits in the draft */
  const stored = useCallback(
    (next: BlockEdits) => {
      if (scope.kind === 'demo') {
        latestPub.current = next
        setPublished(next)
      } else setDraftAt(new Date().toISOString())
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey],
  )

  const save = useCallback(
    async (id: string, patch: BlockPatch | null) => {
      if (!editingRef.current) {
        const prev = mergeBlocks(latestPub.current, latestMine.current, page)
        const changed = { ...aliased(prev) }
        if (patch && !isEmptyPatch(patch)) changed[id] = patch
        else delete changed[id]
        // what was kept under a block's old id moves to its own (aliases.ts)
        const next = unaliased(changed)
        keepMine(next)
        remember_('mine', prev, next)
        return
      }
      const before = latest.current
      const changed = { ...aliased(before) }
      if (patch && !isEmptyPatch(patch)) changed[id] = patch
      else delete changed[id]
      const next = unaliased(changed)
      setBusy(true)
      try {
        window.clearTimeout(pending.current)
        pending.current = undefined
        const kept = await storeEdits(next)
        latest.current = kept
        setDefaults(kept)
        stored(kept)
        remember_('defaults', before, kept)
      } finally {
        // a short beat so the change is seen, not just snapped in
        window.setTimeout(() => setBusy(false), 280)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, page, keepMine, remember_, aliased, unaliased, storeEdits],
  )

  const apply = useCallback(
    async (change: BlockEdits | ((prev: BlockEdits) => BlockEdits)) => {
      if (!editingRef.current) {
        const prev = mergeBlocks(latestPub.current, latestMine.current, page)
        // a change reads a block's settings under its id (aliases.ts), and they are stored there
        const next = unaliased(typeof change === 'function' ? change(aliased(prev)) : change)
        keepMine(next)
        remember_('mine', prev, next)
        return
      }
      const before = latest.current
      const next = unaliased(typeof change === 'function' ? change(aliased(before)) : change)
      latest.current = next
      setDefaults(next)
      try {
        window.clearTimeout(pending.current)
        pending.current = undefined
        const kept = await storeEdits(next)
        adopt(next, kept)
        stored(kept)
        remember_('defaults', before, kept)
      } catch (e) {
        // not stored: back to what was there — unless a newer change of this page is on screen already
        if (latest.current === next) {
          latest.current = before
          setDefaults(before)
        }
        throw e
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, page, keepMine, remember_, aliased, unaliased, storeEdits, adopt],
  )

  /** "Saqlash": an undo still waiting is stored first, then the whole draft is published (LiveDrafts) */
  const publish = useCallback(
    async (force = false): Promise<'ok' | 'stale'> => {
      if (scope.kind !== 'live') {
        // a catalog dashboard's changes are already stored: the session ends, they stay
        writeLocal(beforeKey(scope.id), null)
        setDraftAt(null)
        return 'ok'
      }
      if (pending.current !== undefined) {
        window.clearTimeout(pending.current)
        pending.current = undefined
        await storeEdits(latest.current)
      }
      // every change already asked lands in the draft first: a save still on its way after the publish would start a new
      // draft over the dashboard just published (2026-11-09)
      await sync.idle()
      // the whole "Saqlash" ends in PUBLISH_MS: saved, or an error the bar shows with "Qayta urinish" (owner, 2026-11-09: the
      // spinner never stopped). Pressed again after an answer lost on the way, the server finds nothing waiting: ok.
      let res: Response
      try {
        res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/draft/publish${force ? '?force=true' : ''}`, {
          method: 'POST',
          headers: { Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
          signal: AbortSignal.timeout(PUBLISH_MS),
        })
      } catch {
        throw new Error('publish: no answer')
      }
      if (res.status === 409) return 'stale'
      if (!res.ok) throw new Error(`publish ${res.status}`)
      // what is live now; if it cannot be read this moment, it is the draft just published
      const live = await loadEdits(scope, AbortSignal.timeout(READ_MS)).catch(() => latest.current)
      latestPub.current = live
      setPublished(live)
      latest.current = live
      setDefaults(live)
      // the next change starts a new draft from what is live: its version read again (none known = overwrite, as before)
      sync.reset(undefined, live)
      void readDraft(scope, AbortSignal.timeout(READ_MS)).then(
        (d) => {
          if (latest.current === live) sync.reset(d?.versions?.blocks, live)
        },
        () => undefined,
      )
      setDraftAt(null)
      setDraftVersion((n) => n + 1)
      return 'ok'
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
    [scopeKey, storeEdits, sync],
  )
  /** "Bekor qilish": the draft dropped, edit mode back on the published dashboard */
  const reloadDraft = useCallback(async () => {
    if (scope.kind !== 'live') return
    await sync.idle()
    const read = await readDraft(scope, AbortSignal.timeout(READ_MS))
    const draft = read && (read.blocks || read.charts || read.filters || read.prefs) ? read : null
    const working = draft?.blocks ?? latestPub.current
    window.clearTimeout(pending.current)
    pending.current = undefined
    latest.current = working
    setDefaults(working)
    sync.reset(read?.versions?.blocks, working)
    setDraftAt(draft ? (draft.updatedAt ?? new Date().toISOString()) : null)
    // the added charts, the filters and the background read theirs again; the page draws afresh
    setDraftVersion((n) => n + 1)
    setHist(emptyHistory())
    setEpoch((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey])

  const discard = useCallback(async () => {
    if (scope.kind !== 'live') {
      // a catalog dashboard goes back to what it was when edit mode opened (blocks, added charts, filters, background)
      window.clearTimeout(pending.current)
      pending.current = undefined
      const before = readBefore(scope.id)
      if (before) {
        writeLocal(localKey(scope.id), before.blocks)
        writeLocal(chartsKey(scope.id), before.charts)
        // the filters and the background as they were (the page reads them again: draftVersion)
        if ('filters' in before) writeLocal(filtersKey(scope.id), before.filters ?? null)
        if ('prefs' in before) writeLocal(prefsKey(scope.id), before.prefs ?? null)
        latest.current = before.blocks
        latestPub.current = before.blocks
        setDefaults(before.blocks)
        setPublished(before.blocks)
      }
      writeLocal(beforeKey(scope.id), null)
      setDraftAt(null)
      setDraftVersion((n) => n + 1)
      setHist(emptyHistory())
      setEpoch((n) => n + 1)
      return
    }
    window.clearTimeout(pending.current)
    pending.current = undefined
    // a save still on its way would bring the dropped draft back after the delete
    await sync.idle()
    const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/draft`, {
      method: 'DELETE',
      headers: { [CSRF_HEADER]: CSRF_VALUE },
      signal: AbortSignal.timeout(READ_MS),
    })
    if (!res.ok && res.status !== 404) throw new Error(`discard ${res.status}`)
    latest.current = latestPub.current
    setDefaults(latestPub.current)
    sync.reset(undefined, latestPub.current)
    setDraftAt(null)
    setDraftVersion((n) => n + 1)
    setHist(emptyHistory())
    setEpoch((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey])

  // each page setting's own way back (useSettingHistory): it shows and stores the value like a change of its own
  const restorers = useRef<Partial<Record<Setting, (value: unknown) => void>>>({})
  const onSettingUndo = useCallback((setting: Setting, restore: (value: unknown) => void) => {
    restorers.current[setting] = restore
    return () => {
      if (restorers.current[setting] === restore) delete restorers.current[setting]
    }
  }, [])
  const recordSetting = useCallback((setting: Setting, label: string, before: unknown, after: unknown) => {
    // the viewer's own filters / look are not in this history: only the defaults, in edit mode
    if (!editingRef.current) return
    const h = pushLayer(latestHist.current, settingStep(label, 'defaults', setting, before, after))
    latestHist.current = h
    setHist(h)
  }, [])

  /** a step taken back or again, in its own layer: the viewer's in this browser, the defaults stored soon */
  const take = useCallback(
    (whole: Step<unknown>, side: 'before' | 'after') => {
      const { blocks, settings } = splitStep(whole)
      for (const c of settings) restorers.current[c.setting]?.(c[side])
      if (!blocks) return
      const step = blocks as Step<BlockPatch>
      // a block that goes back to "no place" needs the page drawn again to stand where the page puts it (order.ts)
      const unplaced = Object.keys(step[side]).some((k) => step[side][k]?.order === undefined && (side === 'before' ? step.after : step.before)[k]?.order !== undefined)
      if (step.layer === 'mine') {
        const view = mergeBlocks(latestPub.current, latestMine.current, page)
        keepMine(applyStep(view, step, side))
      } else {
        const next = applyStep(latest.current, step, side)
        latest.current = next
        setDefaults(next)
        storeSoon()
      }
      if (unplaced) setEpoch((n) => n + 1)
    },
    [page, keepMine, storeSoon],
  )
  const layerNow = (): Layer => (editingRef.current ? 'defaults' : 'mine')
  const undo = useCallback(() => {
    const r = undoLayer(latestHist.current, layerNow())
    if (!r) return
    latestHist.current = r.history
    setHist(r.history)
    take(r.step, 'before')
  }, [take])
  const redo = useCallback(() => {
    const r = redoLayer(latestHist.current, layerNow())
    if (!r) return
    latestHist.current = r.history
    setHist(r.history)
    take(r.step, 'after')
  }, [take])
  const undoBlock = useCallback(
    (id: string) => {
      const r = undoKey(latestHist.current, id, layerNow())
      if (!r) return
      latestHist.current = r.history
      setHist(r.history)
      take(r.step, 'before')
    },
    [take],
  )
  // Cmd/Ctrl+Z → "Ortga", Cmd/Ctrl+Shift+Z → "Oldinga" anywhere on the page (not while typing in a field)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = historyKey(e, e.target)
      if (!k) return
      e.preventDefault()
      if (k === 'undo') undo()
      else redo()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [undo, redo])
  const layer: Layer = editingNow ? 'defaults' : 'mine'
  const history = useMemo<HistoryApi>(() => {
    const mineH = ofLayer(hist, layer)
    return {
      undoLabel: nextUndo(mineH)?.label,
      redoLabel: nextRedo(mineH)?.label,
      undo,
      redo,
      undoBlock,
      blockLabel: (id: string) => {
        for (let i = mineH.past.length - 1; i >= 0; i--) if (stepKeys(mineH.past[i]!).includes(id)) return mineH.past[i]!.label
        return undefined
      },
    }
  }, [hist, layer, undo, redo, undoBlock])

  /** "Asl holiga": this viewer's own changes of the page go (an "Ortga" brings them back) */
  const resetMine = useCallback(() => {
    const prev = mergeBlocks(latestPub.current, latestMine.current, page)
    const m = withoutLook(latestMine.current)
    latestMine.current = m
    setMine(m)
    writeMyBlocks(myKey, m)
    remember_('mine', prev, mergeBlocks(latestPub.current, m, page))
    setEpoch((n) => n + 1)
  }, [page, myKey, remember_])

  const remember = useCallback((id: string, title: string) => setKnown((k) => (k[id] === title ? k : { ...k, [id]: title })), [])
  const summaries = useRef<Record<string, BlockSummary>>({})
  const describe = useCallback((info: BlockSummary) => {
    summaries.current[info.id] = info
  }, [])
  const described = useCallback(() => ({ ...summaries.current }), [])
  const bumpEpoch = useCallback(() => setEpoch((n) => n + 1), [])
  const setAction = useCallback(
    (name: EditAction, fn: (() => void) | undefined) => setActions((a) => (a[name] === fn ? a : { ...a, [name]: fn })),
    [],
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  const stableScope = useMemo(() => scope, [scopeKey])
  const isMine = useMemo(() => hasMine(Object.fromEntries(Object.entries(mine).filter(([id]) => id.startsWith(page + ':')))), [mine, page])
  const value = useMemo<Ctx>(
    () => ({
      page,
      scope: stableScope,
      edits,
      canEdit,
      editing: editingNow,
      setEditing: setEditingKept,
      focused,
      focus: focusKept,
      takeResume,
      published,
      save,
      busy,
      setBusy,
      apply,
      known,
      remember,
      describe,
      described,
      epoch,
      bumpEpoch,
      addChart: actions.addChart,
      addFilter: actions.addFilter,
      aiRecommend: actions.aiRecommend,
      setAction,
      history,
      recordSetting,
      onSettingUndo,
      mine: isMine,
      alias,
      forget,
      oldIdOf,
      resetMine,
      draft: { at: draftAt },
      publish,
      discard,
      reloadDraft,
      draftVersion,
    }),
    [page, stableScope, edits, canEdit, editingNow, setEditingKept, focused, focusKept, takeResume, published, save, busy, apply, known, remember, describe, described, epoch, bumpEpoch, actions, setAction, history, recordSetting, onSettingUndo, isMine, resetMine, draftAt, publish, discard, draftVersion, alias, forget, oldIdOf, reloadDraft],
  )
  return <BlockEditCtx.Provider value={value}>{children}</BlockEditCtx.Provider>
}

/** the blocks of one page (a history step and the viewer's layer are per page) */
function pageOnly(e: BlockEdits, page: string): BlockEdits {
  const out: BlockEdits = {}
  for (const [id, p] of Object.entries(e)) if (id.startsWith(page + ':')) out[id] = p
  return out
}

/** a stable id for a block on a page: its kind and original title */
export const blockId = (page: string, kind: BlockInfo['kind'], title: string) =>
  `${page}:${kind}:${title.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100)}`

/**
 * A block that ✕ really deletes instead of hiding (a chart added with "Grafik qo'shish": hidden, it would stay in the
 * page's charts for good). Set around the block; resolves with the undo that puts it back (the toast's "Qaytarish").
 */
export type BlockDelete = () => Promise<() => Promise<void>>
export const BlockDeleteCtx = createContext<BlockDelete | null>(null)

/**
 * What a chart or a table inside a block reads (the visual, colour and table settings chosen for the block) and tells
 * (a chart its forms, a table its columns)
 */
export interface BlockChart {
  visual?: VisualType
  color?: BlockTint
  table?: TablePatch
  report: (origin: VisualType, visuals: VisualType[], measures?: string[]) => void
  /** the measure a one-measure form draws (BlockPatch.visualMeasure) */
  measure?: string
  /** the chart pencil saves the block's form (null = back to the original): in edit mode for everyone, else `mine` */
  setVisual?: (visual: VisualType | null) => void
  /** outside edit mode: what the block's tools change is this viewer's own view (personal.ts), not everyone's */
  mine?: boolean
  /**
   * the table's columns dragged into another order / to another width on their headers (kit/coldrag.ts): in edit mode
   * the dashboard's defaults (the view stood on's table when the block has views), in the zoomed editor its draft.
   * Unset = the table keeps such a change for this visit only.
   */
  setTable?: (table: TablePatch | undefined) => void
  reportTable?: (columns: TableColumnInfo[]) => void
  /** a nestable table tells its breakdowns (the zoomed editor's "Ierarxiya", Nova) */
  reportHier?: (hier: HierInfo) => void
  /** the zoomed editor only: the column picked in its preview (a header or cell click picks it, again clears it) */
  pick?: { key: string | null; set: (key: string | null) => void }
  /** the block's id, its views' edit and the report of its views (views.ts useBlockViews) */
  blockId?: string
  views?: ViewsPatch
  reportViews?: (views: ViewOption[]) => void
  /** the chart pencil hands over how to open its gallery (null when it goes): edit mode opens it from the block's corner */
  registerPen?: (open: (() => void) | null) => void
}
export const BlockChartCtx = createContext<BlockChart | null>(null)

/** a nestable table's breakdowns: `base` is its own (always the first level), `dims` every one it may use (base first) */
export interface HierInfo {
  base: string
  dims: { key: string; label: string }[]
}

/**
 * A page setting in the arrows' history (history.ts Setting): `restore` puts a value back — shown and stored as its own
 * change is, but not remembered again — and the returned function remembers a change (its name, the value before and
 * after; only in edit mode). Outside a dashboard it does nothing.
 */
export function useSettingHistory<T>(setting: Setting, restore: (value: T | undefined) => void) {
  const be = useContext(BlockEditCtx)
  const fn = useRef(restore)
  fn.current = restore
  const on = be?.onSettingUndo
  useEffect(() => on?.(setting, (v) => fn.current(v as T | undefined)), [on, setting])
  const rec = be?.recordSetting
  return useCallback((label: string, before: T | undefined, after: T | undefined) => rec?.(setting, label, before, after), [rec, setting])
}

/**
 * Wires a button of the edit bar ("Grafik qo'shish" / "Filtr qo'shish") to a feature: call it in a component inside the
 * dashboard with the handler; the button shows while that component is mounted. Pass a stable function (useCallback).
 */
export function useEditAction(name: EditAction, fn: (() => void) | undefined) {
  const set = useContext(BlockEditCtx)?.setAction
  useEffect(() => {
    if (!set || !fn) return
    set(name, fn)
    return () => set(name, undefined)
  }, [set, name, fn])
}
