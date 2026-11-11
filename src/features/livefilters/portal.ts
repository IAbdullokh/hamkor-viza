import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import type { FilterKind } from './fields'

/**
 * The CRM's lead / deal fields the dashboard's data does not hold yet (owner, 2026-11-09: a field made in Bitrix after the
 * last pull, or one never fetched): «Filtr maydonlari» lists them with a quiet ⬇ marker; ticking them and «Qo'llash» reads
 * those fields for every record (a server job), then the dashboard is rebuilt and reloads — the field is then a filter
 * like any other. While another job writes the project's data (a refresh, a pull, another read) the server keeps the read
 * queued and starts it when that job ends («Yangilanish tugagach olinadi»), also with the page closed.
 * apps/api Platform/Live/LiveFields.cs: GET /live/{slug}/fields · POST /live/{slug}/fields/fill (Studio's own people only).
 */
export interface PortalField {
  entity: 'lead' | 'deal'
  code: string
  title: string
  kind: FilterKind
}

export type FillState = 'queued' | 'running' | 'paused' | 'done' | 'error' | 'cancelled'

export interface FillJob {
  id: string
  state: FillState
  progress: number
  etaSec?: number | null
  entity: 'lead' | 'deal' | ''
  codes: string[]
  /** the server's error code of an ended read (FIELD_GONE, TIMEOUT, ACCESS_DENIED …) */
  error?: string | null
  /** queued behind another job that writes the project's data (a refresh, a pull, another read) */
  waiting?: boolean
}

export interface PortalFields {
  /** false: this dashboard's CRM cannot be read field by field (no Bitrix24 webhook) */
  available: boolean
  fields: PortalField[]
  /** the newest read */
  job: FillJob | null
  /** the reads still to end and the ones ended in the last day, newest first (an older server sends only `job`) */
  jobs?: FillJob[]
}

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const enc = encodeURIComponent

export async function loadPortalFields(slug: string, signal?: AbortSignal): Promise<PortalFields> {
  const res = await fetch(`${BASE}/live/${enc(slug)}/fields`, { credentials: 'include', headers: { Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`fields ${res.status}`)
  return (await res.json()) as PortalFields
}

/** a refused start: the server's code (FIELDS_NOT_SUPPORTED, NEEDS_BITRIX, VALIDATION …), or NOT_ALLOWED / UNREACHABLE */
export class FillError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status: number) {
    super(`fill ${status} ${code}`)
    this.code = code
    this.status = status
  }
}

export async function startFill(slug: string, entity: 'lead' | 'deal', codes: string[]): Promise<FillJob> {
  let res: Response
  try {
    res = await fetch(`${BASE}/live/${enc(slug)}/fields/fill`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
      body: JSON.stringify({ entity, codes }),
    })
  } catch {
    throw new FillError('UNREACHABLE', 0)
  }
  if (!res.ok) {
    let code = ''
    try {
      code = String(((await res.json()) as { code?: unknown }).code ?? '')
    } catch {
      // not JSON: the status says it
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) code = 'NOT_ALLOWED'
    throw new FillError(code || (res.status >= 500 ? 'INTERNAL' : 'VALIDATION'), res.status)
  }
  return (await res.json()) as FillJob
}

/** the Uzbek key of why a field could not be read (a job's error, or a refused start) */
export function fillErrorText(code: string | null | undefined): string {
  switch (code) {
    case 'FIELDS_NOT_SUPPORTED':
      return "Bu ulanish turida maydon olib bo'lmaydi"
    case 'TIMEOUT':
    case 'UNREACHABLE':
    case 'OVERLOAD_LIMIT':
    case 'CONNECT_BLOCKED':
      return "Bitrix javob bermadi — qayta urinib ko'ring"
    case 'ACCESS_DENIED':
    case 'INVALID_CREDENTIALS':
    case 'NO_AUTH_FOUND':
    case 'NOT_A_WEBHOOK':
    case 'PORTAL_DELETED':
      return 'Bitrix ruxsat bermadi'
    case 'FIELD_GONE':
      return "Bu maydon Bitrixda endi yo'q"
    case 'NOT_ALLOWED':
    case 'FORBIDDEN':
      return "Maydon olishga ruxsat yo'q"
    case 'NEEDS_BITRIX':
      return 'Bitrix24 ulanmagan'
    case 'VALIDATION':
      return "Bu maydonni olib bo'lmaydi"
    default:
      return "Ma'lumotini olib bo'lmadi"
  }
}

export const isRunning = (j: FillJob | null | undefined): boolean => !!j && (j.state === 'queued' || j.state === 'running' || j.state === 'paused')

/** the filter key a portal field gets once it is in the data (fields.ts portal fields: "uf:lead:CODE") */
export const portalKey = (f: { entity: string; code: string }) => `uf:${f.entity}:${f.code}`

/** the reads the server reported, newest first (`jobs`, or the one `job` of an older server) */
export const jobsOf = (d: PortalFields | null | undefined): FillJob[] => (d ? (d.jobs ?? (d.job ? [d.job] : [])) : [])

/**
 * One portal field the data lacks: `idle` — not read; `waiting` — its read waits for another job of the project to end;
 * `filling` — being read (`progress` 0–1); `ready` — read, the dashboard is reloading; `failed` — the last read of it (or
 * its start) stopped with `error`, it can start again.
 */
export type MissingState = 'idle' | 'waiting' | 'filling' | 'ready' | 'failed'
export interface MissingRow {
  key: string
  field: PortalField
  state: MissingState
  progress: number
  error?: string
}

/** the newest read of a field (jobs newest first) */
const jobOf = (jobs: readonly FillJob[], f: PortalField) => jobs.find((j) => j.entity === f.entity && j.codes.includes(f.code))

/** a field's state from its newest read */
export function stateOf(job: FillJob | undefined): { state: MissingState; progress: number; error?: string } {
  if (!job) return { state: 'idle', progress: 0 }
  if (isRunning(job)) return job.waiting && job.state === 'queued' ? { state: 'waiting', progress: 0 } : { state: 'filling', progress: Math.max(0, Math.min(1, job.progress)) }
  if (job.state === 'done') return { state: 'ready', progress: 1 }
  if (job.state === 'error') return { state: 'failed', progress: 0, error: job.error ?? undefined }
  return { state: 'idle', progress: 0 }
}

/**
 * The portal's fields the data lacks, minus the ones the data now has (`have`: the picker's own keys), each with its
 * state from its newest read. A field a read just finished stays `ready` until the reloaded data has it (`known` keeps
 * the fields seen before: the server no longer lists them once read). `refused`: starts the server turned down (by key).
 */
export function missingRows(
  portal: PortalField[],
  known: PortalField[],
  have: ReadonlySet<string>,
  jobs: readonly FillJob[] | FillJob | null,
  refused: Readonly<Record<string, string>> = {},
): MissingRow[] {
  const list = Array.isArray(jobs) ? jobs : jobs ? [jobs as FillJob] : []
  const byKey = new Map<string, PortalField>()
  for (const f of portal) byKey.set(portalKey(f), f)
  // read by a finished job, not in the data yet: shown until the reload brings it
  for (const f of known) if (!byKey.has(portalKey(f)) && jobOf(list, f)?.state === 'done') byKey.set(portalKey(f), f)
  const rows: MissingRow[] = []
  for (const [key, field] of byKey) {
    if (have.has(key)) continue
    const s = refused[key] ? { state: 'failed' as const, progress: 0, error: refused[key] } : stateOf(jobOf(list, field))
    rows.push({ key, field, ...s })
  }
  return rows
}

/** the fields of `rows` a read already takes care of (waiting, being read, or read): no second read */
export const inFlight = (rows: readonly MissingRow[]): Set<string> =>
  new Set(rows.filter((r) => r.state === 'waiting' || r.state === 'filling' || r.state === 'ready').map((r) => r.key))

const POLL_MS = 2000

export interface FillOutcome {
  /** reads started (or already queued) */
  started: FillJob[]
  /** refused starts: the field keys and why */
  refused: { keys: string[]; code: string }[]
}

/**
 * The portal fields of a live dashboard for a Studio user (`enabled`): read when the window opens or a field waits for
 * its data (`open`), and every 2 s while a read is queued or runs, so the waiting chips move and the field turns up
 * when it is done. `fill` starts the reads (one call per entity, 20 fields a call — picker.ts fillCalls).
 */
export function usePortalFields(slug: string | null, enabled: boolean, open: boolean) {
  const [data, setData] = useState<PortalFields | null>(null)
  const [known, setKnown] = useState<PortalField[]>([])
  const [error, setError] = useState(false)
  // starts the server refused, by field key → code (cleared when the field starts again)
  const [refused, setRefused] = useState<Record<string, string>>({})
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const read = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug || !enabled) return
      try {
        const d = await loadPortalFields(slug, signal)
        if (!alive.current) return
        setData(d)
        setError(false)
        setKnown((k) => {
          const seen = new Set(k.map(portalKey))
          const add = d.fields.filter((f) => !seen.has(portalKey(f)))
          return add.length ? [...k, ...add] : k
        })
      } catch (e) {
        if (alive.current && !(e instanceof DOMException && e.name === 'AbortError')) setError(true)
      }
    },
    [slug, enabled],
  )
  useEffect(() => {
    if (!open) return
    const ac = new AbortController()
    void read(ac.signal)
    return () => ac.abort()
  }, [open, read])
  const jobs = useMemo(() => jobsOf(data), [data])
  const running = jobs.some(isRunning)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => void read(), POLL_MS)
    return () => window.clearInterval(id)
  }, [running, read])
  const fill = useCallback(
    async (calls: { entity: 'lead' | 'deal'; codes: string[] }[], titles: PortalField[] = []): Promise<FillOutcome> => {
      const out: FillOutcome = { started: [], refused: [] }
      if (!slug || !calls.length) return out
      for (const c of calls) {
        const keys = c.codes.map((code) => portalKey({ entity: c.entity, code }))
        try {
          const job = await startFill(slug, c.entity, c.codes)
          out.started.push(job)
          if (!alive.current) continue
          setRefused((r) => (keys.some((k) => k in r) ? Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k))) : r))
          setData((d) => {
            const base: PortalFields = d ?? { available: true, fields: titles, job: null }
            const rest = jobsOf(base).filter((j) => j.id !== job.id)
            return { ...base, job, jobs: [job, ...rest] }
          })
        } catch (e) {
          const code = e instanceof FillError ? e.code : 'INTERNAL'
          out.refused.push({ keys, code })
          if (alive.current) setRefused((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, code])) }))
        }
      }
      if (out.refused.length) void read()
      return out
    },
    [slug, read],
  )
  return { data, jobs, known, error, refused, fill, read }
}

export type PortalState = ReturnType<typeof usePortalFields>
