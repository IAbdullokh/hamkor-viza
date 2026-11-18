import { useCallback, useSyncExternalStore } from 'react'
import { ApiError, putLiveState, type LiveStateRead } from '@/features/projects/api'
import type { LiveStateKey } from '@/features/projects/types'
import { useProjectSlug } from '@/data/source'
import { WORKSPACE_ID } from '@/data/workspaces'
import { readLocal, writeLocal } from './storage'

/**
 * User-entered page state of a dashboard (Reja targets, Taqsimot shares / days off, Hisobot sections / plans).
 *
 * - Demo (/d/glass/*): localStorage under the keys the pages always used, so existing demo edits stay.
 * - Live project (/l/$slug/*): the server's copy (GET /api/live/{slug}/state, loaded together with the snapshot and
 *   handed in by `seedProjectState`), written with PUT /api/live/{slug}/state/{key}. Writes are optimistic: the page
 *   updates at once, and a failed save rolls the value back and tells the `onProjectStateError` listeners.
 * - Versioned saves (owner, 2026-11-04: two people on one plan): each save sends the version its value was based on, one
 *   save per key at a time (edits meanwhile go in the next one). Someone else's newer save (409 STATE_CONFLICT) is merged
 *   with the user's change — object values entry by entry (Reja: per month) — and saved again; when both changed the same
 *   entry, theirs is shown and the `onProjectStateReloaded` listeners are told. An older server has no versions: saves
 *   overwrite as before.
 *
 * It is Data365's own copy — nothing here is ever written to the client's portal.
 */
export type Setter<T> = (next: T | ((prev: T) => T)) => void

type Values = Partial<Record<LiveStateKey, unknown>>

/** localStorage layout of the demo, exactly as the pages stored it before. */
const DEMO_STORAGE: Record<LiveStateKey, { read(): unknown; write(v: unknown): void }> = {
  reja: { read: () => readLocal<unknown>('d365.reja', undefined), write: (v) => writeLocal('d365.reja', v) },
  hisobotSections: { read: () => readLocal<unknown>('d365.hisobot.sections', undefined), write: (v) => writeLocal('d365.hisobot.sections', v) },
  hisobotPlans: { read: () => readLocal<unknown>('d365.hisobot.plans', undefined), write: (v) => writeLocal('d365.hisobot.plans', v) },
  // Taqsimot kept one object per workspace id
  taqsimot: {
    read: () => readLocal<Record<string, unknown>>('d365.taqsimot', {})?.[WORKSPACE_ID],
    write: (v) => writeLocal('d365.taqsimot', { ...readLocal<Record<string, unknown>>('d365.taqsimot', {}), [WORKSPACE_ID]: v }),
  },
}

interface Scope {
  values: Values
  /** the server's version of each saved value; null = an older server (saves overwrite) */
  versions: Partial<Record<LiveStateKey, string>> | null
  /** the value each version stands for (what the user's next change is based on) */
  bases: Values
  /** keys with a save on the way / another one to send after it */
  saving: Set<LiveStateKey>
  queued: Set<LiveStateKey>
  listeners: Set<() => void>
}

const DEMO = '\u0000demo'
const scopes = new Map<string, Scope>()
const errorListeners = new Set<(key: LiveStateKey, error: unknown) => void>()
const reloadListeners = new Set<(key: LiveStateKey) => void>()

function scopeOf(id: string): Scope {
  let s = scopes.get(id)
  if (!s) scopes.set(id, (s = { values: {}, versions: null, bases: {}, saving: new Set(), queued: new Set(), listeners: new Set() }))
  return s
}

function emit(s: Scope) {
  for (const l of [...s.listeners]) l()
}

/** Seed a live project's state with what GET /api/live/{slug}/state returned (called by the data source loader). */
export function seedProjectState(slug: string, read: LiveStateRead): void {
  const s = scopeOf(slug)
  const r = read as Record<string, unknown>
  const versioned = isRecord(r) && isRecord(r.values) && isRecord(r.versions)
  const values = (versioned ? r.values : read) as Values
  s.values = { ...values }
  s.bases = { ...values }
  s.versions = versioned ? { ...(r.versions as Partial<Record<LiveStateKey, string>>) } : null
  emit(s)
}

/** Listen for values replaced by someone else's newer save («Boshqa odam o'zgartirdi — yangilandi»). Returns the unsubscribe function. */
export function onProjectStateReloaded(fn: (key: LiveStateKey) => void): () => void {
  reloadListeners.add(fn)
  return () => reloadListeners.delete(fn)
}

/** Listen for failed saves of a live project (the live page shows a toast). Returns the unsubscribe function. */
export function onProjectStateError(fn: (key: LiveStateKey, error: unknown) => void): () => void {
  errorListeners.add(fn)
  return () => errorListeners.delete(fn)
}

function read(id: string, key: LiveStateKey): unknown {
  const s = scopeOf(id)
  if (id === DEMO && !(key in s.values)) s.values[key] = DEMO_STORAGE[key].read()
  return s.values[key]
}

function write(id: string, key: LiveStateKey, value: unknown): void {
  const s = scopeOf(id)
  s.values = { ...s.values, [key]: value }
  emit(s)
  if (id === DEMO) {
    DEMO_STORAGE[key].write(value)
    return
  }
  save(id, s, key)
}

/** One save per key at a time: a change made while one is on the way goes in the next, with the version it returns. */
function save(id: string, s: Scope, key: LiveStateKey): void {
  if (s.saving.has(key)) {
    s.queued.add(key)
    return
  }
  s.saving.add(key)
  const value = s.values[key]
  const version = s.versions ? (s.versions[key] ?? 'none') : undefined
  putLiveState(id, key, value, version)
    .then((r) => {
      s.bases = { ...s.bases, [key]: value }
      if (s.versions && r?.version) s.versions = { ...s.versions, [key]: r.version }
    })
    .catch((e: unknown) => {
      if (s.versions && e instanceof ApiError && (e.code as string) === 'STATE_CONFLICT') {
        rebase(s, key, e.params as unknown as { value?: unknown; version?: string } | undefined)
        return
      }
      // roll back to the saved value only when nothing newer was written meanwhile
      if (s.values[key] === value) {
        s.values = { ...s.values, [key]: s.bases[key] }
        emit(s)
      }
      for (const l of errorListeners) l(key, e)
    })
    .finally(() => {
      s.saving.delete(key)
      if (s.queued.delete(key)) save(id, s, key)
    })
}

/** Someone else saved first: their value with the user's change on top (saved again), or theirs alone when both changed the same entry. */
function rebase(s: Scope, key: LiveStateKey, current: { value?: unknown; version?: string } | undefined): void {
  const theirs = current?.value ?? undefined
  const merged = merge3(s.bases[key], s.values[key], theirs)
  s.bases = { ...s.bases, [key]: theirs }
  s.versions = { ...s.versions, [key]: current?.version ?? 'none' }
  if (merged === CLASH) {
    s.values = { ...s.values, [key]: theirs }
    s.queued.delete(key)
    emit(s)
    for (const l of reloadListeners) l(key)
    return
  }
  s.values = { ...s.values, [key]: merged }
  emit(s)
  if (!same(merged, theirs)) s.queued.add(key)
}

const CLASH = Symbol('clash')

/** Three-way merge of plain JSON: the user's changes (base → mine) applied onto theirs, object entries one by one. */
export function merge3(base: unknown, mine: unknown, theirs: unknown): unknown {
  if (same(mine, base) || same(mine, theirs)) return theirs
  if (same(theirs, base)) return mine
  if (!isRecord(mine) || !isRecord(theirs)) return CLASH
  const b = isRecord(base) ? base : {}
  const out: Record<string, unknown> = { ...theirs }
  for (const k of new Set([...Object.keys(b), ...Object.keys(mine)])) {
    if (same(b[k], mine[k])) continue
    const m = merge3(b[k], mine[k], theirs[k])
    if (m === CLASH) return CLASH
    if (m === undefined) delete out[k]
    else out[k] = m
  }
  return out
}

/** Merge result when both sides changed the same entry differently. */
export const MERGE_CLASH = CLASH

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/** Test hook: forget every cached value. */
export function resetProjectState(): void {
  scopes.clear()
}

/** Test hooks: one change as a page's setter makes it, and the value the page shows. */
export const writeProjectState = (slug: string, key: LiveStateKey, value: unknown) => write(slug, key, value)
export const readProjectState = (slug: string, key: LiveStateKey) => read(slug, key)

/**
 * `[value, set]` for one state key. `fallback` is returned while nothing is stored (keep it a stable constant).
 * `valid` rejects stored values of the wrong shape (older saves, hand-edited storage).
 */
export function useProjectState<T>(key: LiveStateKey, fallback: T, valid?: (v: unknown) => v is T): [T, Setter<T>] {
  const id = useProjectSlug() ?? DEMO
  const subscribe = useCallback(
    (cb: () => void) => {
      const s = scopeOf(id)
      s.listeners.add(cb)
      return () => s.listeners.delete(cb)
    },
    [id],
  )
  const raw = useSyncExternalStore(subscribe, () => read(id, key))
  const value = raw === undefined || raw === null || (valid && !valid(raw)) ? fallback : (raw as T)
  const set = useCallback<Setter<T>>(
    (next) => {
      const cur = read(id, key)
      const base = cur === undefined || cur === null || (valid && !valid(cur)) ? fallback : (cur as T)
      write(id, key, typeof next === 'function' ? (next as (p: T) => T)(base) : next)
    },
    [id, key, fallback, valid],
  )
  return [value, set]
}

export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
