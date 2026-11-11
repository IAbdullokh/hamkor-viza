import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Check, CircleDot, Loader2, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useT } from '@/i18n'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { createSseParser } from '@/features/ai/stream'
import { useBlockEdit } from '@/features/blockedit/context'
import { ChartView } from '@/charts/ChartView'
import { VISUAL_LABELS } from '@/charts/switcher'
import { withOwnMeasures, type DatasetRuntime, type FieldRuntime } from '@/data/query'
import type { Db } from '@/data/db'
import type { Row } from '@/formula'
import type { Lang } from '@/lib/settings'
import { cx } from '@/lib/cx'
import { readLocal, writeLocal } from '@/lib/storage'
import { Button, Skeleton, TextField } from '@/ui/controls'
import { IconTile, Segmented } from '@/ui/glass'
import { Tooltip } from '@/ui/overlay'
import type { VisualType } from '@/spec'
import { BUILDER_VISUALS, cleanSteps, cleanText, fieldIdOk, isTimeDim, MAX_NOTE, MAX_TITLE, PERSON_DIMS, QUEUE_DATASETS, toSpec, type AddedChart, type Preset } from './model'
import { preflight, standardStages } from './preflight'
import { usePageSelectors } from './selectors'
import { datasetTile } from './tile'
import { useDb } from '@/data/db'
import { useMeta } from '@/data/source'

/**
 * "✨ AI tavsiyasi" (owner, 2026-10-26: "the AI should recommend what to build next, according to the data itself — and
 * that should be done by Opus 5.5 every time"): POST /api/live/{slug}/recommend sends the dashboard's field list and what
 * the page shows; the server builds a profile of the data with nobody in it, asks Opus 5.5 once and checks every chart.
 * Each card: its dataset's tile, name, form pills (flip the chart before adding it), why in three lines (all of it on
 * hover), a live preview on the page's own data, "Qo'shish"; "Hammasini qo'shish" adds the rest; "Yangilash" asks again
 * (the server keeps an answer an hour otherwise, and forgets it on "Yangilash").
 * Three depths (owner, 2026-11-03), all Opus 5.5: ⚡ Tez (medium effort), ◐ O'rta (high), ✦ Maksimal (max — minutes on a
 * big portal). An optional question steers the analysis; every chart shown in this session goes back as "seen", so
 * "Yangilash" always finds a fresh angle.
 * The analysis is a job of its own (owner, 2026-11-03: "leaving never stops it"): it lives in this module, not in the
 * sheet, so closing the sheet or switching tabs keeps it going (the edit bar's pill shows the time, then "tayyor"), and
 * the server goes on even when the browser leaves (the reply waits in its cache; the last result is also kept here).
 */

interface Rec {
  title: string
  why: string
  chart: Preset
}

/** a chart as the server sent it (drawn into a card on the page's own data when shown) */
interface RawItem {
  title: string
  why: string
  chart: Partial<Preset>
  /** up to 3 short actions (a diagnostic / pacing card shows them) */
  steps?: string[] | null
}

interface Reply {
  items?: RawItem[]
  model?: string | null
  cached?: boolean
  error?: string | null
  /** how long the analysis took (a cached reply keeps its own) */
  tookSeconds?: number | null
}

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
/** dimensions that are not worth charting (raw ids, timestamps) — the builder's own rule */
const SKIP_DIMS = new Set(['id', 'vaqt'])

export type Depth = 'fast' | 'medium' | 'max'
const DEPTH_KEY = 'd365.aiRecommend.depth'
const MAX_SEEN = 60

/** elapsed time: "42 s" under a minute, "3:07" after */
export function elapsedText(seconds: number, unit: string): string {
  return seconds < 60 ? `${seconds} ${unit}` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** a chart already offered in this session (sent back so it is never offered again) */
interface Seen {
  title: string
  dataset: string
  measure: string
  dim?: string
  color?: string
  visual: string
}

/** the forms a card flips between: its own, then the ones its cut fits (stacked only with a second cut) */
export function formsOf(p: Preset): VisualType[] {
  // a block without a cut flips between the cut-less Bento blocks
  if (!p.dim && (p.visual === 'queue' || p.visual === 'pacing' || p.visual === 'diagnostic'))
    return [...new Set<VisualType>([p.visual, 'diagnostic', 'pacing', ...(QUEUE_DATASETS.has(p.dataset) ? (['queue'] as const) : [])])]
  if (!p.dim || p.visual === 'kpi') return []
  const more: VisualType[] = isTimeDim(p.dim)
    ? ['column', 'line', 'area', ...(p.color ? (['heatmap', 'matrix'] as const) : [])]
    : ['bar', 'column', 'donut', ...(p.color ? (['stacked', 'heatmap', 'matrix'] as const) : [])]
  // a manager / operator cut also reads as a multi-metric leaderboard
  if (PERSON_DIMS.has(p.dim)) more.push('scorecard')
  return [...new Set([p.visual, ...more])]
}

/** the dashboard's fields as the server's catalog: only what the builder can chart */
export function catalog(datasets: DatasetRuntime[]) {
  return datasets.flatMap((ds) =>
    ds.fields
      .filter((f) => f.compiled && fieldIdOk(f.field.id) && (f.field.kind === 'measure' || !SKIP_DIMS.has(f.field.id)))
      .map((f) => ({ dataset: ds.spec.id, id: f.field.id, name: f.field.name, kind: f.field.kind, ...(isDateField(f) ? { date: true } : {}) })),
  )
}

/**
 * The catalog with each choice-like dimension's values, for the block chat's exact filters. A field with many values (a
 * name, a phone) is sent without them, so no person's details go along, and dates have none.
 */
export function catalogWithValues(datasets: DatasetRuntime[], db: Db) {
  const MAX = 50
  return catalog(datasets).map((f) => {
    if (f.kind !== 'dimension' || f.date) return f
    const ds = datasets.find((d) => d.spec.id === f.dataset)
    const rt = ds?.byId.get(f.id)
    if (!ds || !rt?.compiled || rt.compiled.agg) return f
    const seen = new Set<string>()
    for (const r of ds.table.rows(db) as Row[]) {
      const v = rt.compiled.row(r)
      if (typeof v !== 'string' || !v.trim() || v.length > 80 || /[<>]/.test(v)) continue
      seen.add(v.trim())
      if (seen.size > MAX) return f
    }
    return seen.size ? { ...f, values: [...seen].sort() } : f
  })
}

/** a dimension holding a date: what a period can count by */
const isDateField = (f: FieldRuntime | undefined): boolean =>
  f?.field.kind === 'dimension' && !f.compiled?.agg && (f.compiled?.type === 'date' || f.compiled?.type === 'datetime')

/**
 * A chart's rows and columns logic (which rows, by which date, which columns), checked on this dashboard: null when any of
 * it names something this dataset does not have. Nothing is quietly dropped: a smaller condition would mean other numbers.
 */
function logicOf(c: Partial<Preset>, base: DatasetRuntime, stageLabels?: Record<string, string>): Partial<Preset> | null {
  const own = (c.calc ?? []).slice(0, 6)
  const ds = withOwnMeasures(base, own)
  if (own.some((o) => !ds.byId.get(o.id)?.compiled)) return null
  const dimOk = (id: string) => ds.byId.get(id)?.field.kind === 'dimension' && !!ds.byId.get(id)?.compiled
  const measureOk = (id: string) => ds.byId.get(id)?.field.kind === 'measure' && !!ds.byId.get(id)?.compiled
  const dims = (c.dims ?? []).filter((d) => d !== c.dim)
  const measures = (c.measures ?? []).filter((m) => m !== c.measure)
  if (!dims.every(dimOk) || !measures.every(measureOk)) return null
  if (c.dateField && !isDateField(ds.byId.get(c.dateField))) return null
  const where: NonNullable<Preset['where']> = []
  for (const w of c.where ?? []) {
    if (!dimOk(w.field) || (w.op !== 'in' && w.op !== 'not_in') || !Array.isArray(w.values) || !w.values.length) return null
    const values = w.values.map(String).slice(0, 20)
    where.push({ field: w.field, op: w.op, values: w.field === 'bosqich' ? standardStages(values, stageLabels) : values })
  }
  return {
    ...(own.length ? { calc: own } : {}),
    ...(dims.length ? { dims: dims.slice(0, 3) } : {}),
    ...(measures.length ? { measures: measures.slice(0, 8) } : {}),
    ...(c.dateField ? { dateField: c.dateField } : {}),
    ...(where.length ? { where: where.slice(0, 5) } : {}),
  }
}

/** a returned chart this dashboard can draw (its fields compile here), as builder settings */
export function toPreset(c: Partial<Preset>, title: string, datasets: DatasetRuntime[], stageLabels?: Record<string, string>): Preset | null {
  const found = datasets.find((d) => d.spec.id === c.dataset)
  if (!found) return null
  const logic = logicOf(c, found, stageLabels)
  if (!logic) return null
  const ds = withOwnMeasures(found, logic.calc)
  if (!c.measure || !ds.byId.get(c.measure)?.compiled) return null
  if (c.dim && !ds.byId.get(c.dim)?.compiled) return null
  let visual = (c.visual && (BUILDER_VISUALS as string[]).includes(c.visual) ? c.visual : c.dim ? 'bar' : 'kpi') as VisualType
  // several cuts or columns can only be a table
  if (c.dim && (logic.dims?.length || logic.measures?.length)) visual = 'table'
  // a second cut / line measure this dashboard has, or the form falls back to a plain one (never a half-drawn chart)
  const isDim = (id?: string | null) => !!id && ds.byId.get(id)?.field.kind === 'dimension' && !!ds.byId.get(id)?.compiled
  const isMeasure = (id?: string | null) => !!id && ds.byId.get(id)?.field.kind === 'measure' && !!ds.byId.get(id)?.compiled
  const color = isDim(c.color) && c.color !== c.dim ? c.color! : undefined
  const second = isMeasure(c.secondMeasure) && c.secondMeasure !== c.measure ? c.secondMeasure! : undefined
  if ((visual === 'stacked' || visual === 'heatmap' || visual === 'matrix') && !color) visual = visual === 'stacked' ? 'bar' : visual === 'matrix' ? 'scorecard' : 'column'
  if (visual === 'scorecard' && !c.dim) visual = 'diagnostic'
  if (visual === 'combo' && !second) visual = 'column'
  // current stages are shares of one whole, not steps (an answer cached before the server's rule)
  if (visual === 'funnel' && c.dim === 'bosqich') visual = 'donut'
  // the model may still name a portal's own stage ("Bekor bo'ldi"); the dataset's Bosqich uses the standard names
  const filter = c.filter && c.filter.field === 'bosqich' ? { ...c.filter, values: standardStages(c.filter.values, stageLabels) } : c.filter
  // "all but these" (a chart tuned in words: "Biriktirilmagan'siz"): a dimension of this dataset, its values as text
  const exclude = c.exclude && isDim(c.exclude.field) && Array.isArray(c.exclude.values) && c.exclude.values.length
    ? { field: c.exclude.field, values: c.exclude.values.map(String).slice(0, 20) }
    : undefined
  return {
    title: title.slice(0, MAX_TITLE),
    dataset: ds.spec.id,
    measure: c.measure,
    dim: c.dim || undefined,
    visual: c.dim || visual === 'queue' || visual === 'pacing' || visual === 'diagnostic' ? visual : 'kpi',
    top: c.top ?? undefined,
    wide: c.wide || undefined,
    filter: filter ?? undefined,
    exclude,
    color: (visual === 'stacked' || visual === 'heatmap' || visual === 'matrix') && color ? color : undefined,
    secondMeasure: visual === 'combo' ? second : undefined,
    goal: typeof c.goal === 'number' && Number.isFinite(c.goal) ? c.goal : undefined,
    ...logic,
  }
}

/** a real step of the analysis, as the server reports it (POST …/recommend/stream) */
export type RecStep =
  | { stage: 'data'; leads: number; deals: number; calls: number; ads: number; fields: number; checkpoints?: string[] }
  | { stage: 'cached' }
  | { stage: 'thinking'; words?: number; snippet?: string | null }
  | { stage: 'writing'; charts: number }
  | { stage: 'checking'; charts: number }

/** where the analysis is: what was read, the step it is on, the charts written so far */
export interface Progress {
  data: Extract<RecStep, { stage: 'data' }> | null
  step: 'reading' | 'thinking' | 'writing' | 'checking'
  charts: number
  /** when Opus started thinking (ms): the checkpoints move on from there */
  thinkingAt: number
  /** thinking text so far, when the stream carries it (Claude Code 2.1 sends thinking without text: then 0 / null) */
  words: number
  snippet: string | null
}

export const START: Progress = { data: null, step: 'reading', charts: 0, thinkingAt: 0, words: 0, snippet: null }

/** seconds per checkpoint while Opus thinks */
export const CHECKPOINT_SECONDS = 6

/** seconds per step of the client's own list (no checkpoints from the server) */
export const FALLBACK_SECONDS = 3.5

/** the checkpoint the status points at after `since` seconds of thinking (it stays on the last one) */
export function checkpointAt(count: number, since: number, per = CHECKPOINT_SECONDS): number {
  return count ? Math.min(count - 1, Math.max(0, Math.floor(since / per))) : -1
}

/** the progress after a step (a step never goes back: a late "thinking" while writing is ignored) */
export function advance(p: Progress, e: RecStep, now = 0): Progress {
  const order = ['reading', 'thinking', 'writing', 'checking'] as const
  const at = (s: Progress['step']) => order.indexOf(s)
  switch (e.stage) {
    case 'data':
      return { ...p, data: e }
    case 'cached':
      return { ...p, step: 'checking' }
    case 'thinking': {
      const words = Math.max(p.words, e.words ?? 0)
      const snippet = e.snippet || p.snippet
      if (at(p.step) < at('thinking')) return { ...p, step: 'thinking', thinkingAt: now, words, snippet }
      return p.step === 'thinking' ? { ...p, words, snippet } : p
    }
    case 'writing':
      return at(p.step) <= at('writing') ? { ...p, step: 'writing', charts: Math.max(p.charts, e.charts) } : p
    case 'checking':
      return { ...p, step: 'checking', charts: e.charts }
  }
}

/** the reply over server-sent events, each real step to onStep; an older server without the stream gets the plain call */
async function askLive(slug: string, body: unknown, signal: AbortSignal, onStep: (e: RecStep) => void, onStarted?: (ms: number) => void): Promise<Reply> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/recommend/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(body),
    signal,
  })
  if (res.status === 404 || res.status === 405) return ask(slug, body, signal)
  if (!res.ok || !res.body) throw new Error(`recommend ${res.status}`)
  let reply: Reply | null = null
  let failed: string | null = null
  const parser = createSseParser((f) => {
    try {
      const data = JSON.parse(f.data) as Record<string, unknown>
      if (f.event === 'stage') onStep(data as unknown as RecStep)
      else if (f.event === 'done') reply = data.reply as Reply
      else if (f.event === 'error') failed = String(data.code ?? 'error')
      if (f.event === 'stage' && typeof data.startedAt === 'number') onStarted?.(data.startedAt)
    } catch {
      // a broken frame is skipped
    }
  })
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parser.push(value)
  }
  parser.end()
  if (reply) return reply
  throw new Error(`recommend ${failed ?? 'ended'}`)
}

async function ask(slug: string, body: unknown, signal: AbortSignal): Promise<Reply> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`recommend ${res.status}`)
  return (await res.json()) as Reply
}

/** "28 s", or "1 daq 42 s" from a minute */
export function fmtElapsed(seconds: number, t: (k: string) => string): string {
  const s = Math.max(0, Math.round(seconds))
  return s < 60 ? `${s} ${t('s')}` : `${Math.floor(s / 60)} ${t('daq')} ${s % 60} ${t('s')}`
}

const ESTIMATE: Record<Depth, string> = { fast: 'Odatda 15–30 soniya', medium: 'Odatda 30–60 soniya', max: 'Odatda 1–3 daqiqa (10 daqiqagacha)' }

// ───────────────────────────── one job per dashboard page, outside the sheet ─────────────────────────────
// Like the deploy watcher (publish/DeployButton.tsx): the analysis lives in the module, so closing the sheet, switching
// tabs or another page of the app never stops it. Only "Yangilash", another depth or a new question replaces it.

export interface AiJob {
  phase: 'loading' | 'done' | 'error'
  depth: Depth
  prompt: string
  progress: Progress
  /** when the analysis began (ms; the server's start when this browser joined a running one) */
  startedAt: number
  finishedAt: number | null
  tookSeconds: number | null
  items: RawItem[]
  model: string | null
  error: string | null
  /** every chart offered on this page so far: sent back so none is offered again */
  seen: Seen[]
  /** the cards added to the page, and the forms the cards were flipped to (they survive closing the sheet) */
  added: number[]
  forms: Record<number, VisualType>
  /** the result has been on screen (else the edit bar's pill says "tayyor") */
  viewed: boolean
  ac: AbortController | null
}

const jobs = new Map<string, AiJob>()
const jobListeners = new Set<() => void>()
const mounted = new Map<string, number>()
const jobKey = (slug: string, page: string) => `${slug}|${page}`

function setJob(key: string, job: AiJob) {
  jobs.set(key, job)
  jobListeners.forEach((l) => l())
}

function patchJob(key: string, of: AiJob, patch: Partial<AiJob>) {
  // a replaced job's late answer never overwrites the new one
  if (jobs.get(key)?.ac !== of.ac) return
  setJob(key, { ...jobs.get(key)!, ...patch })
}

function useJob(key: string | null): AiJob | undefined {
  return useSyncExternalStore(
    (l) => {
      jobListeners.add(l)
      return () => jobListeners.delete(l)
    },
    () => (key ? jobs.get(key) : undefined),
  )
}

/** the elapsed seconds of a job, live while it runs */
export function jobSeconds(job: Pick<AiJob, 'startedAt' | 'finishedAt'>, now = Date.now()): number {
  return Math.max(0, Math.floor(((job.finishedAt ?? now) - job.startedAt) / 1000))
}

/** re-render every second while `on` */
function useTick(on: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [on])
  return now
}

// the last finished result per page, kept an hour in this browser (a reload still shows it, with how long it took)
const LAST_KEY = 'd365.aiRecommend.last'
const LAST_FOR = 3600_000
interface LastEntry {
  at: number
  depth: Depth
  prompt: string
  tookSeconds: number | null
  items: RawItem[]
  model: string | null
  seen: Seen[]
}

function readLast(key: string): LastEntry | null {
  const e = readLocal<Record<string, LastEntry>>(LAST_KEY, {})[key]
  return e && Date.now() - e.at < LAST_FOR && Array.isArray(e.items) ? e : null
}

function writeLast(key: string, e: LastEntry) {
  const all = readLocal<Record<string, LastEntry>>(LAST_KEY, {})
  const fresh = Object.fromEntries(Object.entries({ ...all, [key]: e }).filter(([, v]) => Date.now() - v.at < LAST_FOR).slice(-20))
  writeLocal(LAST_KEY, fresh)
}

/** starts (or replaces) the page's analysis; the old one's request is dropped and the server cancels it ("refresh") */
function startJob(slug: string, page: string, opts: { depth: Depth; prompt: string; refresh: boolean; body: Record<string, unknown>; failed: string }) {
  const key = jobKey(slug, page)
  const before = jobs.get(key)
  before?.ac?.abort()
  const ac = new AbortController()
  const seen = before?.seen ?? []
  const job: AiJob = {
    phase: 'loading',
    depth: opts.depth,
    prompt: opts.prompt,
    progress: START,
    startedAt: Date.now(),
    finishedAt: null,
    tookSeconds: null,
    items: [],
    model: null,
    error: null,
    seen,
    added: [],
    forms: {},
    viewed: false,
    ac,
  }
  setJob(key, job)
  const body = { ...opts.body, depth: opts.depth, prompt: opts.prompt.trim().replace(/[<>]/g, '').slice(0, 300) || undefined, seen, refresh: opts.refresh }
  askLive(
    slug,
    body,
    ac.signal,
    (e) => patchJob(key, job, { progress: advance(jobs.get(key)!.progress, e, Date.now()) }),
    // this browser joined an analysis that began earlier (a reload mid-run): the timer counts from its real start
    (ms) => {
      const now = jobs.get(key)
      if (now && ms < now.startedAt - 2000) patchJob(key, job, { startedAt: ms })
    },
  )
    .then((r) => {
      const finishedAt = Date.now()
      const items = r.items ?? []
      const cur = jobs.get(key)!
      const tookSeconds = r.tookSeconds ?? jobSeconds({ startedAt: cur.startedAt, finishedAt })
      const viewed = (mounted.get(key) ?? 0) > 0
      if (!items.length) {
        patchJob(key, job, { phase: 'error', error: r.error ?? opts.failed, finishedAt, tookSeconds, viewed, ac: null })
        return
      }
      const nextSeen = [
        ...cur.seen,
        ...items.map((i) => ({ title: i.title, dataset: String(i.chart.dataset ?? ''), measure: String(i.chart.measure ?? ''), dim: i.chart.dim, color: i.chart.color, visual: String(i.chart.visual ?? '') })),
      ].slice(-MAX_SEEN)
      patchJob(key, job, { phase: 'done', items, model: r.model ?? null, finishedAt, tookSeconds, seen: nextSeen, viewed })
      writeLast(key, { at: finishedAt, depth: opts.depth, prompt: opts.prompt, tookSeconds, items, model: r.model ?? null, seen: nextSeen })
    })
    .catch((e: unknown) => {
      if ((e as Error).name === 'AbortError') return
      patchJob(key, job, { phase: 'error', error: opts.failed, finishedAt: Date.now(), viewed: (mounted.get(key) ?? 0) > 0 })
    })
    .finally(() => {
      if (jobs.get(key)?.ac === ac) setJob(key, { ...jobs.get(key)!, ac: null })
    })
}

/**
 * The edit bar's "✨ AI tavsiyasi" pill: the page's analysis while it runs (with its time), and "tayyor" with the number
 * of charts once it finished while the sheet was closed.
 */
export function useAiRecommendStatus(slug: string | null, page: string): { phase: AiJob['phase'] | 'idle'; seconds: number; count: number; ready: boolean } {
  const job = useJob(slug ? jobKey(slug, page) : null)
  const now = useTick(job?.phase === 'loading')
  if (!job) return { phase: 'idle', seconds: 0, count: 0, ready: false }
  return { phase: job.phase, seconds: jobSeconds(job, now), count: job.items.length, ready: job.phase === 'done' && !job.viewed }
}

export function AiRecommend({
  page,
  datasets,
  existing,
  disabled,
  onAdd,
  onTune,
}: {
  page: string
  datasets: DatasetRuntime[]
  /** the page's added charts (their settings are sent so nothing is suggested twice) */
  existing: AddedChart[]
  disabled: boolean
  /** adds these charts to the page and keeps the sheet open */
  onAdd: (charts: Preset[]) => Promise<void>
  /** opens a card in the builder ("Sozlash"): changed by hand or in words before it is added */
  onTune?: (chart: Preset) => void
}) {
  const { t, lang } = useT()
  const be = useBlockEdit()
  const scope = be?.scope
  const slug = scope?.kind === 'live' ? scope.slug : null
  const key = slug ? jobKey(slug, page) : null
  const job = useJob(key)
  const now = useTick(job?.phase === 'loading')
  const [depth, setDepth] = useState<Depth>(() => job?.depth ?? readLocal<Depth>(DEPTH_KEY, 'medium'))
  const [hint, setHint] = useState(() => job?.prompt ?? '')

  // the page's own blocks (their names, hidden or not) and its added charts: what is already there
  const blocks = () => {
    if (!be) return []
    const own = Object.entries(be.known)
      .filter(([id]) => id.startsWith(`${page}:`))
      .map(([id, title]) => ({ title, hidden: !!be.edits[id]?.hidden }))
    const mine = existing.map((c) => ({ title: c.title, dataset: c.dataset, measure: c.measure, dim: c.dim, visual: c.visual, hidden: false }))
    return [...own, ...mine].filter((b) => b.title.trim() && !/[<>]/.test(b.title)).slice(0, 60)
  }
  const fields = useMemo(() => catalog(datasets), [datasets])
  // the page's own data, period and filters: every recommendation is checked on them before it is shown (preflight)
  const db = useDb()
  const meta = useMeta()
  const { range, selectors } = usePageSelectors()
  const stageLabels = meta.leadStageLabels as Record<string, string> | undefined

  const start = (refresh: boolean, d = depth, prompt = hint) => {
    if (!slug || !fields.length) return
    startJob(slug, page, { depth: d, prompt, refresh, body: { page, lang: lang as Lang, fields, existing: blocks() }, failed: t("Tavsiya kelmadi — qayta urinib ko'ring") })
  }

  // opening the sheet: a running or finished analysis of this page is shown as it is; else the last one this browser
  // kept (an hour); else a new one. Closing the sheet never stops it.
  useEffect(() => {
    if (!key) return
    mounted.set(key, (mounted.get(key) ?? 0) + 1)
    if (!jobs.get(key)) {
      const last = readLast(key)
      if (last) {
        setJob(key, {
          phase: 'done', depth: last.depth, prompt: last.prompt, progress: START, startedAt: last.at - (last.tookSeconds ?? 0) * 1000, finishedAt: last.at,
          tookSeconds: last.tookSeconds, items: last.items, model: last.model, error: null, seen: last.seen ?? [], added: [], forms: {}, viewed: true, ac: null,
        })
        setDepth(last.depth)
        setHint(last.prompt)
      } else start(false)
    }
    return () => {
      mounted.set(key, Math.max(0, (mounted.get(key) ?? 1) - 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page; the job lives on after
  }, [key])

  // a result on screen is seen: the edit bar's pill stops saying "tayyor"
  useEffect(() => {
    if (key && job && job.phase !== 'loading' && !job.viewed) setJob(key, { ...job, viewed: true })
  }, [key, job])

  const recs: Rec[] = useMemo(
    () =>
      (job?.items ?? []).flatMap((i) => {
        const draft = toPreset(i.chart, i.title, datasets, stageLabels)
        // never an empty card: bots out of manager cuts, a dead filter dropped, an empty chart not offered
        const chart = draft && preflight(db, draft, range, selectors)
        // the card keeps its insight and actions on the dashboard (a diagnostic / pacing block shows them)
        return chart ? [{ title: i.title, why: i.why, chart: { ...chart, note: cleanText(i.why, MAX_NOTE), steps: cleanSteps(i.steps) } }] : []
      }),
    [job?.items, datasets, stageLabels, db, range, selectors],
  )
  const phase = job?.phase ?? 'loading'
  const added = new Set(job?.added ?? [])
  const forms = job?.forms ?? {}
  const seconds = job ? jobSeconds(job, now) : 0

  const again = () => start(true)

  // another depth is a fresh analysis at that depth
  const pickDepth = (d: Depth) => {
    if (d === depth) return
    setDepth(d)
    writeLocal(DEPTH_KEY, d)
    start(true, d)
  }

  const setForm = (i: number, v: VisualType) => {
    if (key && job) setJob(key, { ...job, forms: { ...job.forms, [i]: v } })
  }

  const chartOf = (i: number): Preset => {
    const own = recs[i]!.chart
    return forms[i] && forms[i] !== own.visual ? { ...own, visual: forms[i] } : own
  }

  const add = async (idx: number[]) => {
    const todo = idx.filter((i) => !added.has(i))
    if (!todo.length || !key) return
    await onAdd(todo.map(chartOf))
    const cur = jobs.get(key)
    if (cur) setJob(key, { ...cur, added: [...new Set([...cur.added, ...todo])] })
  }

  if (!slug)
    return <p className="px-5 py-10 text-center text-[0.875rem] text-ink-3">{t('AI tavsiyasi jonli loyihada ishlaydi')}</p>

  const left = recs.map((_, i) => i).filter((i) => !added.has(i))
  return (
    <div className="px-5 pt-1 pb-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="me-auto flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-ink-2">
          <Sparkles aria-hidden size={15} className="shrink-0 text-primary-strong" />
          {phase === 'loading'
            ? t('Opus tahlil qilyapti…')
            : job?.model === 'fake'
              ? t('Sinov rejimi — model ulanmagan')
              : t("Opus 5.5 ma'lumotingizga qarab tavsiya qildi")}
          {phase === 'done' && job?.tookSeconds != null && (
            <span className="num ms-1 inline-flex shrink-0 items-center rounded-full bg-primary-soft px-2 py-0.5 text-[0.75rem] font-semibold text-primary-strong">
              {DEPTH_MARK[job.depth]} {t(DEPTH_LABEL[job.depth])} · {t("{time} da tayyor bo'ldi", { time: fmtElapsed(job.tookSeconds, t) })}
            </span>
          )}
        </p>
        {phase === 'done' && left.length > 1 && (
          <Button size="sm" variant="primary" icon={Plus} disabled={disabled} onClick={() => void add(left)}>
            {t("Hammasini qo'shish")}
          </Button>
        )}
        <Segmented<Depth>
          size="xs"
          label={t('Tahlil chuqurligi')}
          value={depth}
          onChange={pickDepth}
          options={[
            { value: 'fast', label: `⚡ ${t('Tez')}` },
            { value: 'medium', label: `◐ ${t("O'rta")}` },
            { value: 'max', label: `✦ ${t('Maksimal')}` },
          ]}
        />
        <Button size="sm" variant="ghost" icon={RefreshCw} disabled={disabled} onClick={again}>
          {t('Yangilash')}
        </Button>
      </div>
      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!disabled) again()
        }}
      >
        <TextField
          aria-label={t('Nimani tahlil qilaylik?')}
          placeholder={t("Nimani tahlil qilaylik? (ixtiyoriy — masalan: kechki qo'ng'iroqlar, mebel modellari, zaklad…)")}
          value={hint}
          maxLength={300}
          onChange={(e) => setHint(e.target.value)}
        />
      </form>

      {phase === 'loading' && (
        <div aria-live="polite" aria-busy="true">
          <LiveSteps progress={job?.progress ?? START} depth={job?.depth ?? depth} seconds={seconds} now={now} />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[230px] rounded-[20px]" />
            ))}
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-[20px] border border-line bg-surface-2/50 px-4 py-8 text-center">
          <p className="text-[0.875rem] text-ink-2">{job?.error}</p>
          <Button size="sm" variant="soft" icon={RefreshCw} className="mt-3" onClick={again}>
            {t("Qayta so'rash")}
          </Button>
        </div>
      )}

      {phase === 'done' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recs.map((r, i) => {
            const chart = chartOf(i)
            const tile = datasetTile(chart.dataset)
            const options = formsOf(r.chart)
            return (
              <article key={`${i}:${r.title}`} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-surface-2/50 p-3">
                <header className="flex items-start gap-2.5">
                  <IconTile icon={tile.icon} color={tile.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.875rem] leading-snug font-semibold text-ink">{r.title}</h3>
                    {options.length > 1 ? (
                      <div role="group" aria-label={t('Grafik turi')} className="mt-1.5 flex flex-wrap gap-1">
                        {options.map((v) => (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={v === chart.visual}
                            disabled={added.has(i)}
                            onClick={() => setForm(i, v)}
                            className={cx(
                              'rounded-full px-2 py-0.5 text-[0.6875rem] font-medium transition-colors disabled:opacity-60',
                              v === chart.visual ? 'bg-primary-soft text-primary-strong' : 'bg-surface text-ink-3 enabled:hover:text-ink',
                            )}
                          >
                            {t(VISUAL_LABELS[v])}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[0.75rem] text-ink-3">{t(VISUAL_LABELS[chart.visual])}</p>
                    )}
                  </div>
                </header>
                <Tooltip content={<span className="block max-w-[320px] leading-snug">{r.why}</span>}>
                  {/* the visual is the card's hero: three lines here, the whole why on hover / focus */}
                  <p tabIndex={0} className="mt-2 line-clamp-3 rounded-[6px] text-[0.8125rem] leading-snug text-ink-2">
                    {r.why}
                  </p>
                </Tooltip>
                <Mini preset={chart} />
                <div className="mt-2 flex items-center gap-2">
                  {added.has(i) ? (
                    <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-primary-strong">
                      <Check aria-hidden size={15} /> {t("Qo'shildi")}
                    </span>
                  ) : (
                    <Button size="sm" variant="primary" icon={Plus} disabled={disabled} onClick={() => void add([i])}>
                      {t("Qo'shish")}
                    </Button>
                  )}
                  {onTune && !added.has(i) && (
                    <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onTune(chart)}>
                      {t('Sozlash')}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

const DEPTH_LABEL: Record<Depth, string> = { fast: 'Tez', medium: "O'rta", max: 'Maksimal' }
const DEPTH_MARK: Record<Depth, string> = { fast: '⚡', medium: '◐', max: '✦' }

/** the analysis as it really goes: what was read (with its numbers), Opus thinking, the charts written, the check */
function LiveSteps({ progress, depth, seconds, now }: { progress: Progress; depth: Depth; seconds: number; now: number }) {
  const { t, lang } = useT()
  const n = (v: number) => v.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')
  const d = progress.data
  const read = d
    ? [
        d.leads ? t('{n} lid', { n: n(d.leads) }) : null,
        d.calls ? t("{n} qo'ng'iroq", { n: n(d.calls) }) : null,
        d.deals ? t('{n} sdelka', { n: n(d.deals) }) : null,
        d.ads ? t('{n} kampaniya', { n: n(d.ads) }) : null,
        d.fields ? t('{n} Bitrix maydoni', { n: n(d.fields) }) : null,
      ].filter(Boolean).join(' · ')
    : ''
  const order = ['reading', 'thinking', 'writing', 'checking'] as const
  const at = order.indexOf(progress.step)
  const rows = [
    { key: 'reading', text: d ? t("O'qildi: {what}", { what: read }) : t("Ma'lumot o'qilmoqda") },
    { key: 'thinking', text: t('Opus 5.5 o\'ylayapti · {depth}', { depth: t(DEPTH_LABEL[depth]) }) },
    { key: 'writing', text: progress.charts ? t('Grafiklar yozilmoqda: {n}', { n: progress.charts }) : t('Grafiklar yozilmoqda') },
    { key: 'checking', text: t("Grafiklar ma'lumotingizda tekshirilmoqda") },
  ]
  return (
    <ol className="mb-3 flex flex-col gap-1.5 text-[0.8125rem]">
      {rows.map((r, i) => (
        <li key={r.key} className={cx('flex flex-wrap items-center gap-2', i < at ? 'text-ink-2' : i === at ? 'font-medium text-ink' : 'text-ink-3')}>
          {i < at ? (
            <Check aria-hidden size={14} className="shrink-0 text-primary-strong" />
          ) : i === at ? (
            <Loader2 aria-hidden size={14} className="shrink-0 animate-spin text-primary-strong" />
          ) : (
            <CircleDot aria-hidden size={14} className="shrink-0 opacity-50" />
          )}
          <span className="min-w-0">{r.text}</span>
          {i === at && (
            <span className="num ms-auto shrink-0 text-ink-3">
              {elapsedText(seconds, t('s'))}
              <span className="ms-1.5 font-normal opacity-80 max-sm:hidden">· {t(ESTIMATE[depth])}</span>
            </span>
          )}
          {r.key === 'thinking' && i === at && <ThinkingFeed progress={progress} now={now} />}
        </li>
      ))}
    </ol>
  )
}

/**
 * Under "Opus o'ylayapti": the data areas Opus was handed (the server's checkpoints, named from this project), one after
 * another every few seconds — timed, the model does not report which part it reads — and, when the stream carries
 * thinking text, how many words it has thought and its latest sentence.
 */
function ThinkingFeed({ progress, now }: { progress: Progress; now: number }) {
  const { t } = useT()
  const own = progress.data?.checkpoints ?? []
  // no checkpoints from the server (an older one): the client names what it knows, so the box is never empty
  const checkpoints = own.length ? own : fallbackCheckpoints(progress.data, t)
  const since = progress.thinkingAt ? (now - progress.thinkingAt) / 1000 : 0
  const current = checkpointAt(checkpoints.length, since, own.length ? CHECKPOINT_SECONDS : FALLBACK_SECONDS)
  return (
    <div className="order-last mt-1 basis-full rounded-[14px] border border-line bg-surface-2/60 px-3 py-2 ps-3 text-[0.75rem] font-normal sm:ms-6">
      {checkpoints.length > 0 && (
        <ul className="flex flex-col gap-1">
          {checkpoints.map((c, i) => (
            <li key={c} className={cx('flex items-center gap-1.5 transition-colors duration-500', i < current ? 'text-ink-3' : i === current ? 'text-ink' : 'text-ink-3/70')}>
              {i < current ? (
                <Check aria-hidden size={12} className="shrink-0 text-primary-strong" />
              ) : i === current ? (
                <Loader2 aria-hidden size={12} className="shrink-0 animate-spin text-primary-strong" />
              ) : (
                <CircleDot aria-hidden size={12} className="shrink-0 opacity-40" />
              )}
              <span className="min-w-0 truncate">{c}</span>
            </li>
          ))}
        </ul>
      )}
      {progress.words > 0 && (
        <p className={cx('text-ink-2', checkpoints.length > 0 && 'mt-2 border-t border-line pt-2')}>
          <span className="num font-semibold text-ink">{t("{n} so'z tahlil qilindi", { n: progress.words })}</span>
          {progress.snippet && <span className="mt-0.5 line-clamp-2 block text-ink-3 italic">“{progress.snippet}”</span>}
        </p>
      )}
    </div>
  )
}

/** the client's own list under "Opus o'ylayapti" when the server sent none: what was read, then the usual deep steps */
export function fallbackCheckpoints(d: Progress['data'], t: (k: string, p?: Record<string, string | number>) => string): string[] {
  return [
    d?.leads ? t("{n} ta lid ko'rib chiqilmoqda", { n: d.leads }) : null,
    d?.calls ? t("{n} ta qo'ng'iroq ko'rib chiqilmoqda", { n: d.calls }) : null,
    d?.deals ? t("{n} ta sdelka ko'rib chiqilmoqda", { n: d.deals }) : null,
    d?.ads ? t("{n} ta kampaniya ko'rib chiqilmoqda", { n: d.ads }) : null,
    d?.fields ? t("{n} ta Bitrix maydoni ko'rib chiqilmoqda", { n: d.fields }) : null,
    t("Voronka va konversiya yo'qotishlari tekshirilmoqda"),
    t('Manbalar va reklama ROI solishtirilmoqda'),
    t("Javob tezligi va mas'ullar samaradorligi o'lchanmoqda"),
    t('Yashirin korrelyatsiyalar qidirilmoqda'),
  ].filter((x): x is string => !!x)
}

/** the recommendation drawn on the page's own data (its Davr and filters) */
function Mini({ preset }: { preset: Preset }) {
  const { range, selectors } = usePageSelectors()
  const spec = useMemo(() => toSpec({ ...preset, id: 'ai-preview' }), [preset])
  return (
    <div className="mt-2 h-[185px] overflow-hidden">
      <ChartView spec={spec} range={range} selectors={selectors} height={185} />
    </div>
  )
}
