import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from '@/lib/storage'
import type { Job, JobState } from './types'

/**
 * Shared client-side state for the project flow, with no knowledge of HTTP (api.ts plugs the fetchers in):
 *
 * - `ResourceCache`: a keyed cache of server resources (one project, the project list, a live dashboard …) read through
 *   `useSyncExternalStore`. It fetches when the first subscriber arrives, polls while anyone subscribes (the interval
 *   is chosen from the data, e.g. 2 s while a job runs), refreshes on window focus, pauses while the tab is hidden,
 *   ignores a response that an optimistic write overtook, and applies optimistic "layers" on top of the server data.
 * - `DraftMirror`: the offline copy of unsent, non-secret edits (`localStorage['d365.project.<id>.draft']`).
 * - Job helpers and the countdown smoothing behind `useJobEta`.
 *
 *   const cache = new ResourceCache<string, Project, ApiError>({ fetch: (id, signal) => getProject(id, { signal }) })
 *   const snap = useResource(cache, pid)   // { data, error, status, fetching, updatedAt }
 */

// ───────────────────────────── jobs ─────────────────────────────

const ACTIVE: ReadonlySet<JobState> = new Set<JobState>(['queued', 'running'])

/** queued or running: the server is (about to be) working on it */
export function isJobActive(job: Pick<Job, 'state'> | null | undefined): boolean {
  return !!job && ACTIVE.has(job.state)
}

// ───────────────────────────── resource cache ─────────────────────────────

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ResourceSnapshot<T, E> {
  /** server data with the optimistic layers applied; undefined until the first load */
  data: T | undefined
  /** the last fetch error (cleared by the next successful fetch) */
  error: E | null
  /** idle = no key / never asked; loading = first fetch in flight; ready = has data; error = no data and the fetch failed */
  status: ResourceStatus
  /** any fetch in flight (also background polls) */
  fetching: boolean
  /** Date.now() of the last successful fetch or write */
  updatedAt: number | null
}

export interface ResourceOptions<K, T, E> {
  fetch: (key: K, signal: AbortSignal) => Promise<T>
  /** ms until the next background refresh; null = no polling. Called after every fetch. */
  interval?: (data: T | undefined, error: E | null, consecutiveErrors: number) => number | null
  /** refetch when the window regains focus (default true) */
  refreshOnFocus?: boolean
  /** string identity of a key (default String(key)) */
  id?: (key: K) => string
}

type Layer<T> = (data: T) => T

interface Entry<K, T, E> {
  key: K
  base: T | undefined
  layers: Map<string, Layer<T>>
  error: E | null
  errors: number
  fetching: Promise<T | undefined> | null
  controller: AbortController | null
  /** bumped by every write; a fetch that started before a write is discarded */
  version: number
  updatedAt: number | null
  stale: boolean
  listeners: Set<() => void>
  timer: ReturnType<typeof setTimeout> | null
  snapshot: ResourceSnapshot<T, E>
}

const IDLE: ResourceSnapshot<never, never> = Object.freeze({ data: undefined, error: null, status: 'idle', fetching: false, updatedAt: null })
const LOADING: ResourceSnapshot<never, never> = Object.freeze({ ...IDLE, status: 'loading' })

const hasDocument = typeof document !== 'undefined'
const isHidden = () => hasDocument && document.visibilityState === 'hidden'

/** every cache, so one focus / visibility listener can wake them all */
const caches = new Set<ResourceCache<never, unknown, unknown>>()
let wired = false
function wireWindowEvents() {
  if (wired || typeof window === 'undefined') return
  wired = true
  const wake = () => {
    if (isHidden()) return
    caches.forEach((c) => c.wake())
  }
  window.addEventListener('focus', wake)
  window.addEventListener('online', wake)
  if (hasDocument) document.addEventListener('visibilitychange', wake)
}

export class ResourceCache<K, T, E = unknown> {
  private readonly entries = new Map<string, Entry<K, T, E>>()
  private readonly opts: ResourceOptions<K, T, E>

  constructor(opts: ResourceOptions<K, T, E>) {
    this.opts = opts
    caches.add(this as unknown as ResourceCache<never, unknown, unknown>)
    wireWindowEvents()
  }

  private idOf(key: K): string {
    return this.opts.id ? this.opts.id(key) : String(key)
  }

  private entry(key: K): Entry<K, T, E> {
    const id = this.idOf(key)
    let e = this.entries.get(id)
    if (!e) {
      e = {
        key,
        base: undefined,
        layers: new Map(),
        error: null,
        errors: 0,
        fetching: null,
        controller: null,
        version: 0,
        updatedAt: null,
        stale: true,
        listeners: new Set(),
        timer: null,
        snapshot: LOADING,
      }
      this.entries.set(id, e)
    }
    return e
  }

  private emit(e: Entry<K, T, E>) {
    let data = e.base
    if (data !== undefined) for (const layer of e.layers.values()) data = layer(data)
    // a stale entry without data is about to be fetched by its subscriber, so it reads as loading (no idle flash)
    const status: ResourceStatus = data !== undefined ? 'ready' : e.fetching ? 'loading' : e.error ? 'error' : e.stale ? 'loading' : 'idle'
    e.snapshot = { data, error: e.error, status, fetching: e.fetching !== null, updatedAt: e.updatedAt }
    e.listeners.forEach((l) => l())
  }

  /** the current snapshot (stable identity until something changes) */
  get(key: K | null | undefined): ResourceSnapshot<T, E> {
    if (key == null) return IDLE
    return this.entry(key).snapshot
  }

  /** server data with layers, without subscribing */
  peek(key: K): T | undefined {
    return this.entry(key).snapshot.data
  }

  subscribe(key: K | null | undefined, listener: () => void): () => void {
    if (key == null) return () => {}
    const e = this.entry(key)
    e.listeners.add(listener)
    if (e.listeners.size === 1) {
      if (e.stale || e.base === undefined) void this.refresh(key)
      else this.schedule(e)
    }
    return () => {
      e.listeners.delete(listener)
      if (e.listeners.size === 0 && e.timer) {
        clearTimeout(e.timer)
        e.timer = null
      }
    }
  }

  /** fetch now (deduplicated while one is in flight); resolves with the fresh data or undefined on error */
  refresh(key: K): Promise<T | undefined> {
    const e = this.entry(key)
    if (e.fetching) return e.fetching
    if (e.timer) {
      clearTimeout(e.timer)
      e.timer = null
    }
    const startVersion = e.version
    const controller = new AbortController()
    e.controller = controller
    const run: Promise<T | undefined> = this.opts
      .fetch(key, controller.signal)
      .then(
        (data) => {
          if (controller.signal.aborted) return e.base
          // a write (PATCH response, optimistic set) landed while this was in flight: keep the newer write
          if (e.version === startVersion) {
            e.base = data
            e.updatedAt = Date.now()
          }
          e.error = null
          e.errors = 0
          e.stale = false
          return e.base
        },
        (err: E) => {
          if (controller.signal.aborted) return e.base
          e.error = err
          e.errors += 1
          e.stale = false
          return undefined
        },
      )
      .finally(() => {
        if (e.fetching !== run) return // superseded (remove() started a new fetch)
        e.fetching = null
        e.controller = null
        this.emit(e)
        this.schedule(e)
      })
    e.fetching = run
    this.emit(e)
    return run
  }

  private schedule(e: Entry<K, T, E>) {
    if (e.timer) clearTimeout(e.timer)
    e.timer = null
    if (e.listeners.size === 0 || e.fetching) return
    const ms = this.opts.interval ? this.opts.interval(e.base, e.error, e.errors) : null
    if (ms == null) return
    e.timer = setTimeout(() => {
      e.timer = null
      // a hidden tab does not poll; the visibility listener wakes it up
      if (isHidden()) {
        e.stale = true
        return
      }
      void this.refresh(e.key)
    }, ms)
  }

  /** window focus / back online / tab visible: refresh what people are looking at */
  wake(): void {
    const onFocus = this.opts.refreshOnFocus !== false
    this.entries.forEach((e) => {
      if (!e.listeners.size) return
      const age = e.updatedAt === null ? Infinity : Date.now() - e.updatedAt
      // stale = a poll was skipped while hidden (or an invalidate); otherwise only refresh data older than 1.5 s
      if (e.stale || (onFocus && age > 1500)) void this.refresh(e.key)
    })
  }

  /** write server data (e.g. the response of a PATCH); overtakes any fetch in flight */
  set(key: K, data: T | ((prev: T | undefined) => T)): void {
    const e = this.entry(key)
    e.base = typeof data === 'function' ? (data as (prev: T | undefined) => T)(e.base) : data
    e.version += 1
    e.updatedAt = Date.now()
    e.error = null
    e.stale = false
    this.emit(e)
    this.schedule(e)
  }

  /** add / replace (fn) or remove (null) an optimistic layer applied on top of the server data */
  setLayer(key: K, layerId: string, fn: Layer<T> | null): void {
    const e = this.entry(key)
    if (fn) e.layers.set(layerId, fn)
    else if (!e.layers.delete(layerId)) return
    this.emit(e)
  }

  /** mark stale; refetches at once when someone is subscribed */
  invalidate(key?: K): void {
    const list = key === undefined ? [...this.entries.values()] : [this.entry(key)]
    for (const e of list) {
      e.stale = true
      if (e.listeners.size) void this.refresh(e.key)
    }
  }

  /** forget a key (e.g. a deleted project) */
  remove(key: K): void {
    const id = this.idOf(key)
    const e = this.entries.get(id)
    if (!e) return
    e.controller?.abort()
    e.controller = null
    e.fetching = null
    if (e.timer) clearTimeout(e.timer)
    e.timer = null
    e.base = undefined
    e.layers.clear()
    e.error = null
    e.version += 1
    e.updatedAt = null
    e.stale = true
    if (e.listeners.size) void this.refresh(e.key)
    else this.entries.delete(id)
  }
}

/** React binding: subscribes while mounted; a null key returns the idle snapshot and does nothing */
export function useResource<K, T, E>(cache: ResourceCache<K, T, E>, key: K | null | undefined): ResourceSnapshot<T, E> {
  const subscribe = useCallback((l: () => void) => cache.subscribe(key, l), [cache, key])
  const get = useCallback(() => cache.get(key), [cache, key])
  return useSyncExternalStore(subscribe, get, get)
}

// ───────────────────────────── offline draft mirror ─────────────────────────────

/**
 * localStorage copy of edits the server has not acknowledged yet, so typing offline survives a reload.
 * Only non-secret fields may be written here (secrets never go through the project PATCH at all).
 */
export class DraftMirror<P extends object> {
  private readonly prefix: string
  constructor(prefix = 'd365.project.') {
    this.prefix = prefix
  }
  key(id: string): string {
    return `${this.prefix}${id}.draft`
  }
  read(id: string): P | null {
    const v = readLocal<P | null>(this.key(id), null)
    return v && typeof v === 'object' && Object.keys(v).length > 0 ? v : null
  }
  write(id: string, patch: P | null): void {
    if (!patch || Object.keys(patch).length === 0) {
      try {
        localStorage.removeItem(this.key(id))
      } catch {
        // storage unavailable: nothing to clear
      }
      return
    }
    writeLocal(this.key(id), patch)
  }
}

// ───────────────────────────── countdown smoothing ─────────────────────────────

/** largest single upward correction of the shown ETA (seconds) */
export const ETA_MAX_JUMP_UP = 15
/** upward drift allowed per real second after that (15 s per 10 s) */
export const ETA_UP_RATE = 1.5
/** differences this small are not corrected (avoids a countdown that flickers back up by a second) */
export const ETA_DEADBAND = 3

export interface EtaState {
  /** what the user sees, seconds (fractional) */
  shown: number
  /** the server's estimate, aged by local time */
  target: number
  /** Date.now() of the last update */
  at: number
}

export function etaStart(etaSec: number, now: number): EtaState {
  const v = Math.max(0, etaSec)
  return { shown: v, target: v, at: now }
}

/** age the state to `now`: both values tick down; a higher target pulls the display up at ETA_UP_RATE at most */
export function etaTick(s: EtaState, now: number, ticking = true): EtaState {
  const dt = ticking ? Math.max(0, (now - s.at) / 1000) : 0
  const target = Math.max(0, s.target - dt)
  let shown = Math.max(0, s.shown - dt)
  if (target > shown + ETA_DEADBAND) shown = Math.min(target, shown + dt * (1 + ETA_UP_RATE))
  return { shown, target, at: now }
}

/** a new server estimate arrives: down moves are taken at once, up moves by at most ETA_MAX_JUMP_UP */
export function etaServer(s: EtaState, etaSec: number, now: number, ticking = true): EtaState {
  const aged = etaTick(s, now, ticking)
  const target = Math.max(0, etaSec)
  let shown = aged.shown
  if (target < shown - ETA_DEADBAND) shown = target
  else if (target > shown + ETA_DEADBAND) shown = Math.min(target, shown + ETA_MAX_JUMP_UP)
  return { shown, target, at: now }
}

export interface JobEta {
  /** smoothed seconds left (whole), null when unknown / not applicable */
  seconds: number | null
  /** whole minutes left, rounded up (0 only when seconds is 0) */
  minutes: number | null
  /** true while the display counts down every second */
  ticking: boolean
}

/**
 * Seconds left for a job, counting down locally every second between polls. A higher server estimate never makes the
 * display jump up by more than 15 s at once (ux.md §13). Paused jobs freeze, finished jobs read 0, failed ones null.
 *
 *   const eta = useJobEta(project.analysis.job)   // <Countdown seconds={eta.seconds} />
 */
export function useJobEta(job: Pick<Job, 'id' | 'state' | 'etaSec'> | null | undefined): JobEta {
  const ticking = job?.state === 'running'
  // `seen` = the job object last folded in: every poll brings a new object, a plain re-render keeps the same one
  const state = useRef<{ jobId: string; seen: object; eta: EtaState } | null>(null)
  const [, force] = useState(0)

  const etaSec = job?.etaSec ?? null
  const jobId = job?.id ?? null
  if (job && jobId && etaSec !== null) {
    const now = Date.now()
    const cur = state.current
    if (!cur || cur.jobId !== jobId) state.current = { jobId, seen: job, eta: etaStart(etaSec, now) }
    else if (cur.seen !== job) {
      cur.eta = etaServer(cur.eta, etaSec, now, ticking)
      cur.seen = job
    }
  } else state.current = null

  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => {
      const cur = state.current
      if (cur) cur.eta = etaTick(cur.eta, Date.now())
      force((n) => n + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [ticking, jobId])

  if (!job) return { seconds: null, minutes: null, ticking: false }
  if (job.state === 'done') return { seconds: 0, minutes: 0, ticking: false }
  if (job.state === 'error' || job.state === 'cancelled' || !state.current) return { seconds: null, minutes: null, ticking: false }
  const seconds = Math.max(0, Math.round(state.current.eta.shown))
  return { seconds, minutes: Math.ceil(seconds / 60), ticking }
}
