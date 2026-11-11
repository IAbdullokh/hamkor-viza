import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { DraftMirror, isJobActive, ResourceCache, useResource, type ResourceSnapshot } from './store'
import type {
  AiAccountId,
  AiAccounts,
  AiAccountsPatch,
  AiCliLogin,
  AiProvider,
  AiSettingsPatch,
  AiStatus,
  AiTestResult,
  AssistantMessage,
  AssistantRequest,
  Answer,
  ApiError as ApiErrorBody,
  BitrixParseResult,
  ChatMessage,
  ChatRequest,
  Check,
  ConnectRequest,
  Connection,
  Draft,
  CreateProjectRequest,
  DatasetSnapshot,
  ErrorCode,
  ImpactPreview,
  Job,
  LiveInfo,
  LiveStateKey,
  LoadEstimate,
  LoadSectionChoice,
  LoadSpeed,
  NovaConfirmResult,
  NovaSummary,
  NovaThread,
  PageAccess,
  PortfolioProject,
  Project,
  ProjectPatch,
  ProjectSummary,
  Question,
  QuestionId,
  SheetsInfo,
  Structure,
  TableInfo,
  TableMapping,
  TablePreview,
  UploadResult,
} from './types'

export { isJobActive } from './store'
export { useJobEta, type JobEta } from './store'

/**
 * Typed client for the C# API (SPEC §4) + the React hooks every project screen uses.
 *
 *   const { project, status, error, patch, refresh } = useProject(pid)
 *   await patch({ ui: 'glass' })                       // optimistic, then the server's answer
 *   const save = useAutosave(pid); save.text({ name }) // 600 ms debounce, indicator in the step rail
 *   try { await connect(pid, { source: 'bitrix24', demo: true }) } catch (e) { if (e instanceof ApiError) e.code }
 *
 * The base URL is `import.meta.env.VITE_API_BASE` or `/api` (Vite proxies /api → http://localhost:5190 in dev).
 */
const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

// ───────────────────────────── errors ─────────────────────────────

/** Every failed call throws this. `status` 0 = the request never reached the server (offline, API down). */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly params?: Record<string, string | number>
  readonly checks?: Check[]
  readonly detail?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.code)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.params = body.params
    this.checks = body.checks
    this.detail = body.detail
  }

  /** true when the server was not reached at all (the draft mirror keeps the edit) */
  get isNetwork(): boolean {
    return this.status === 0
  }

  get body(): ApiErrorBody {
    return { code: this.code, params: this.params, checks: this.checks, detail: this.detail }
  }

  static network(cause: unknown): ApiError {
    return new ApiError(0, { code: 'UNREACHABLE', detail: cause instanceof Error ? cause.message : String(cause) })
  }

  static fromStatus(status: number, raw: string): ApiError {
    try {
      const body = JSON.parse(raw) as Partial<ApiErrorBody>
      if (body && typeof body.code === 'string') return new ApiError(status, body as ApiErrorBody)
    } catch {
      // not JSON: fall through to the status mapping
    }
    // no ApiError body: the proxy answered for a server that is down, or something outside the API failed
    const code: ErrorCode = status === 404 ? 'NOT_FOUND' : status === 413 ? 'FILE_TOO_LARGE' : status === 408 || status === 504 ? 'TIMEOUT' : status >= 500 ? 'UNREACHABLE' : 'INTERNAL'
    return new ApiError(status, { code, detail: `HTTP ${status}` })
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/** turn anything thrown into an ApiError (keeps AbortError out of the UI: callers check `signal.aborted` first) */
export function toApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : ApiError.network(e)
}

// ───────────────────────────── transport ─────────────────────────────

interface CallOptions {
  signal?: AbortSignal
  /** extra request headers (e.g. a versioned page-state save's X-State-Version) */
  headers?: Record<string, string>
}

async function request<T>(method: string, path: string, body?: unknown, opts: CallOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      // X-Requested-With: the API's CSRF rule for state-changing calls (features/auth/csrf.ts)
      headers: {
        Accept: 'application/json',
        [CSRF_HEADER]: CSRF_VALUE,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...opts.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e) {
    if (opts.signal?.aborted) throw e
    throw ApiError.network(e)
  }
  if (!res.ok) throw ApiError.fromStatus(res.status, await res.text().catch(() => ''))
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const enc = encodeURIComponent
const p = (pid: string) => `/projects/${enc(pid)}`

/** absolute-or-relative URL of an API resource (for <img src>, <a href download>) */
export function apiUrl(path: string): string {
  return BASE + path
}

// ───────────────────────────── endpoints (SPEC §4) ─────────────────────────────

export const getHealth = (o?: CallOptions) => request<{ ok: true; version: string; claude: boolean; assistantProvider?: 'cli' | 'api' | 'none' }>('GET', '/health', undefined, o)
export const getPortfolio = (o?: CallOptions) => request<PortfolioProject[]>('GET', '/portfolio', undefined, o)
export const setPortfolioUrl = (id: string, url: string, o?: CallOptions) =>
  request<PortfolioProject>('PUT', `/portfolio/${enc(id)}/url`, { url }, o)
export const clearPortfolioUrl = (id: string, o?: CallOptions) => request<PortfolioProject>('DELETE', `/portfolio/${enc(id)}/url`, undefined, o)

export const listProjects = (o?: CallOptions) => request<ProjectSummary[]>('GET', '/projects', undefined, o)
export const createProject = (body: CreateProjectRequest, o?: CallOptions) => request<Project>('POST', '/projects', body, o)
export const getProject = (pid: string, o?: CallOptions) => request<Project>('GET', p(pid), undefined, o)
export const patchProject = (pid: string, body: ProjectPatch, o?: CallOptions) => request<Project>('PATCH', p(pid), body, o)
export const deleteProject = (pid: string, o?: CallOptions) => request<void>('DELETE', p(pid), undefined, o)

/** instant, no network to the portal: splits the pasted link into host / user / masked */
export const parseBitrixUrl = (pid: string, url: string, o?: CallOptions) =>
  request<BitrixParseResult>('POST', `${p(pid)}/connections/bitrix24/parse`, { url }, o)
/** validates and saves; 409 ALREADY_CONNECTED, 422 CONNECT_BLOCKED (error.checks) and the connect error codes */
export const connectSource = (pid: string, body: ConnectRequest, o?: CallOptions) =>
  request<{ connection: Connection; project: Project }>('POST', `${p(pid)}/connections`, body, o)
export const recheckConnection = (pid: string, cid: string, o?: CallOptions) =>
  request<Connection>('POST', `${p(pid)}/connections/${enc(cid)}/recheck`, undefined, o)
export interface ConnectionPatch {
  /** Meta: the chosen ad accounts */
  selectedAdAccounts?: string[]
  /** Instagram: the chosen page (one of details.pages) */
  pageId?: string
  /** table sources: the full new set of mappings (409 ALREADY_CONNECTED for leads / deals next to another CRM, 422 MAPPING_INVALID) */
  mappings?: TableMapping[]
  /** Excel: replace the file (an UploadResult.fileId); the mappings stay */
  fileId?: string
}
export const patchConnection = (pid: string, cid: string, body: ConnectionPatch, o?: CallOptions) =>
  request<Connection>('PATCH', `${p(pid)}/connections/${enc(cid)}`, body, o)
export const deleteConnection = (pid: string, cid: string, o?: CallOptions) => request<Project>('DELETE', `${p(pid)}/connections/${enc(cid)}`, undefined, o)

/** Google Sheets: the service account e-mail a spreadsheet can be shared with (null = only "anyone with the link") */
export const getSheetsInfo = (o?: CallOptions) => request<SheetsInfo>('GET', '/sources/sheets', undefined, o)
/** the sheets / tables / views a table connection can read now */
export const listTables = (pid: string, cid: string, o?: CallOptions) => request<TableInfo[]>('GET', `${p(pid)}/connections/${enc(cid)}/tables`, undefined, o)
/** the first rows of one table, column kinds and the engine's guesses (best first); 404 TABLE_NOT_FOUND */
export const previewTable = (pid: string, cid: string, table: string, o?: CallOptions) =>
  request<TablePreview>('GET', `${p(pid)}/connections/${enc(cid)}/tables/preview?table=${enc(table)}`, undefined, o)

export const getStructure = (pid: string, o?: CallOptions) => request<Structure>('GET', `${p(pid)}/structure`, undefined, o)
export const getLoadEstimate = (pid: string, speed: LoadSpeed, o?: CallOptions) =>
  request<LoadEstimate>('GET', `${p(pid)}/load/estimate?speed=${speed}`, undefined, o)
export const startPull = (pid: string, speed: LoadSpeed, o?: CallOptions) => request<Job>('POST', `${p(pid)}/load/pull`, { speed }, o)
/** the owner's skip / period per section (the whole list; [] = take everything); a running job applies it to the sections not started yet */
export const putLoadSections = (pid: string, sections: LoadSectionChoice[], o?: CallOptions) =>
  request<Project>('PUT', `${p(pid)}/load/sections`, { sections }, o)
/** URL of the demo portal's Bitrix24-style export file (demo connections only) */
export const demoExportUrl = (pid: string, entity: 'leads' | 'deals') => apiUrl(`${p(pid)}/load/demo-export/${entity}`)

export interface UploadOptions extends CallOptions {
  /** 0..1 of the bytes sent */
  onProgress?: (fraction: number) => void
}

/** multipart POST through XMLHttpRequest, so the bytes sent can be shown (fetch has no upload progress) */
function uploadForm<T>(path: string, form: FormData, opts: UploadOptions = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', BASE + path)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader(CSRF_HEADER, CSRF_VALUE)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) opts.onProgress(e.total > 0 ? e.loaded / e.total : 0)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(1)
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch (e) {
          reject(ApiError.network(e))
        }
      } else reject(ApiError.fromStatus(xhr.status, xhr.responseText))
    }
    xhr.onerror = () => reject(ApiError.network(new Error('upload failed')))
    xhr.ontimeout = () => reject(new ApiError(0, { code: 'TIMEOUT' }))
    xhr.onabort = () => reject(new DOMException('aborted', 'AbortError'))
    if (opts.signal) {
      if (opts.signal.aborted) return reject(new DOMException('aborted', 'AbortError'))
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(form)
  })
}

/** multipart upload of a Bitrix24 export file; entity null = the server takes it from the headers. A running pull is cancelled by it. */
/**
 * An export file for the import job: it is added next to the files already in (another entity) or replaces its entity's file;
 * `replaces` names a refused file this one replaces. Never waits for a running pull or top-up (the server stops or joins it).
 */
export function importFile(pid: string, file: File, entity: 'leads' | 'deals' | null, opts: UploadOptions & { replaces?: string } = {}): Promise<Job> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('entity', entity ?? '')
  if (opts.replaces) form.append('replaces', opts.replaces)
  return uploadForm<Job>(`${p(pid)}/load/import`, form, opts)
}

/** a file refused for holding the other entity (FILE_WRONG_ENTITY, `kept`) re-queued as that entity; NOT_FOUND = drop it again */
export const retryImportFile = (pid: string, fileId: string, entity: 'leads' | 'deals', o?: CallOptions) =>
  request<Job>('POST', `${p(pid)}/load/files/${enc(fileId)}/retry`, { entity }, o)

/** Excel / CSV for a table source: upload first, then connect { source: 'excel', fileId } or PATCH { fileId } */
export function uploadTableFile(pid: string, file: File, opts: UploadOptions = {}): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  return uploadForm<UploadResult>(`${p(pid)}/uploads`, form, opts)
}

export type JobAction = 'pause' | 'resume' | 'cancel'
export const jobAction = (pid: string, jobId: string, action: JobAction, o?: CallOptions) =>
  request<Job>('POST', `${p(pid)}/jobs/${enc(jobId)}/${action}`, undefined, o)

export const getAccess = (pid: string, o?: CallOptions) => request<PageAccess[]>('GET', `${p(pid)}/access`, undefined, o)

/** idempotent: returns the running analysis job if there is one */
export const startAnalysis = (pid: string, o?: CallOptions) => request<Job>('POST', `${p(pid)}/analysis`, undefined, o)
export const getQuestions = (pid: string, o?: CallOptions) => request<Question[]>('GET', `${p(pid)}/questions`, undefined, o)
export const answerQuestion = (pid: string, qid: QuestionId, answer: Answer, o?: CallOptions) =>
  request<Question>('PUT', `${p(pid)}/questions/${enc(qid)}`, { answer }, o)
export const previewAnswer = (pid: string, qid: QuestionId, answer: Answer, o?: CallOptions) =>
  request<ImpactPreview>('POST', `${p(pid)}/questions/${enc(qid)}/preview`, { answer }, o)

export const getChat = (pid: string, o?: CallOptions) => request<ChatMessage[]>('GET', `${p(pid)}/chat`, undefined, o)
export const sendChat = (pid: string, body: ChatRequest, o?: CallOptions) => request<ChatMessage>('POST', `${p(pid)}/chat`, body, o)

// the questions step's Nova as jobs of the server's own (QuestionNova.cs): q = the question, none = the general setup chat
// row = a stage row's «Boshqa…» box (its own thread of the question)
const nq = (q?: QuestionId | null, row?: string | null) => (q ? `?q=${enc(q)}${row ? `&row=${enc(row)}` : ''}` : '')
export const getNovaSummaries = (pid: string, o?: CallOptions) => request<NovaSummary[]>('GET', `${p(pid)}/nova`, undefined, o)
export const getNovaThread = (pid: string, q: QuestionId | null, row?: string | null, o?: CallOptions) =>
  request<NovaThread>('GET', `${p(pid)}/nova/thread${nq(q, row)}`, undefined, o)
export const askNova = (pid: string, q: QuestionId | null, body: ChatRequest, row?: string | null, o?: CallOptions) =>
  request<NovaThread>('POST', `${p(pid)}/nova/ask${nq(q, row)}`, body, o)
export const retryNova = (pid: string, q: QuestionId | null, row?: string | null, o?: CallOptions) =>
  request<NovaThread>('POST', `${p(pid)}/nova/retry${nq(q, row)}`, undefined, o)
export const takeNova = (pid: string, q: QuestionId | null, row?: string | null, o?: CallOptions) =>
  request<NovaThread>('POST', `${p(pid)}/nova/take${nq(q, row)}`, undefined, o)
export const confirmNova = (pid: string, q: QuestionId, messageId: string, o?: CallOptions) =>
  request<NovaConfirmResult>('POST', `${p(pid)}/nova/confirm${nq(q)}`, { messageId }, o)
export const declineNova = (pid: string, q: QuestionId, messageId: string, o?: CallOptions) =>
  request<NovaThread>('POST', `${p(pid)}/nova/decline${nq(q)}`, { messageId }, o)

// drafts of what a person types, per place (DraftStore.cs; lib/drafts.ts keeps them)
export const getDrafts = (q: { scope?: string; prefix?: string }, o?: CallOptions) =>
  request<Draft[]>('GET', `/drafts?${q.scope ? `scope=${enc(q.scope)}` : `prefix=${enc(q.prefix ?? '')}`}`, undefined, o)
export const putDraft = (draft: Draft, o?: CallOptions) => request<Draft[]>('PUT', '/drafts', draft, o)
/** the same save that outlives the page (pagehide, a closed tab): fetch keepalive, fire and forget */
export function putDraftKeepalive(draft: Draft): void {
  try {
    void fetch(BASE + '/drafts', {
      method: 'PUT',
      keepalive: true,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_VALUE },
      body: JSON.stringify(draft),
    }).catch(() => undefined)
  } catch {
    // the page is going away: its own copy (localStorage) still has it
  }
}

export const startBuild = (pid: string, o?: CallOptions) => request<Job>('POST', `${p(pid)}/build`, undefined, o)
/** the dashboard's QR code: of `url` (its published internet address) when given, else of its Studio link */
export const qrUrl = (pid: string, url?: string | null) => apiUrl(`${p(pid)}/qr.svg${url ? `?url=${enc(url)}` : ''}`)

export const getLive = (slug: string, o?: CallOptions) => request<LiveInfo>('GET', `/live/${enc(slug)}`, undefined, o)
export const getLiveDataset = (slug: string, tables?: (keyof DatasetSnapshot['tables'])[], o?: CallOptions) =>
  request<DatasetSnapshot>('GET', `/live/${enc(slug)}/dataset${tables?.length ? `?tables=${tables.join(',')}` : ''}`, undefined, o)
/** the page values with each one's version (an older server answers the bare values: no versions, saves overwrite) */
export type LiveStateRead = Partial<Record<LiveStateKey, unknown>> | { values: Partial<Record<LiveStateKey, unknown>>; versions: Partial<Record<LiveStateKey, string>> }
export const getLiveState = (slug: string, o?: CallOptions) => request<LiveStateRead>('GET', `/live/${enc(slug)}/state?versions=true`, undefined, o)
/** `version` = what the value was based on ('none': nothing saved yet); a stale one is 409 STATE_CONFLICT (params: value, version) */
export const putLiveState = (slug: string, key: LiveStateKey, value: unknown, version?: string, o?: CallOptions) =>
  request<{ version: string } | undefined>('PUT', `/live/${enc(slug)}/state/${key}`, value, version ? { ...o, headers: { ...o?.headers, 'X-State-Version': version } } : o)
export const refreshLive = (slug: string, o?: CallOptions) => request<Job>('POST', `/live/${enc(slug)}/refresh`, undefined, o)

/** «Taqsimot»: automatic lead distribution — apps/api …/Data365.Bitrix24/Distribution (owners and managers) */
export type DistributionMode = 'off' | 'test' | 'on'
export interface DistributionSettings {
  mode: DistributionMode
  mainUserIds: string[]
  operatorIds: string[]
  startHour: number
  endHour: number
  onSince?: string | null
  lastRunAt?: string | null
  lastError?: string | null
}
export interface DistributionEntry {
  at: string
  leadId: number
  operatorId: string
  /** 'share' = by the percentages; 'returning' = the client's earlier operator */
  why: 'share' | 'returning' | 'failed'
  test: boolean
}
export const getDistribution = (slug: string, o?: CallOptions) =>
  // published: the dashboard has a server to run on (distribution never runs on Studio); reached: that server answered now;
  // pending: that server still runs with other settings than Studio's (the last change did not reach it)
  request<{ settings: DistributionSettings; log: DistributionEntry[]; published: boolean; reached: boolean; pending: boolean }>('GET', `/live/${enc(slug)}/distribution`, undefined, o)
export const putDistribution = (slug: string, s: DistributionSettings, o?: CallOptions) =>
  request<DistributionSettings>('PUT', `/live/${enc(slug)}/distribution`, s, o)

/** what answers right now (Claude Code login, own API key, or the free built-in answerer) */
export const getAiStatus = (o?: CallOptions) => request<AiStatus>('GET', '/ai/status', undefined, o)
/** apiKey: a new key (the server verifies it: 422 AI_KEY_INVALID), null removes the saved key, omitted = unchanged */
export const putAiSettings = (body: AiSettingsPatch, o?: CallOptions) => request<AiStatus>('PUT', '/ai/settings', body, o)
/** the Claude Code sign-in: start (switch = sign the current account out first) → URL, the pasted code → done, cancel, sign out */
export const getCliLogin = (o?: CallOptions) => request<AiCliLogin>('GET', '/ai/cli/login', undefined, o)
export const postCliLogin = (switchAccount: boolean, o?: CallOptions) => request<AiCliLogin>('POST', '/ai/cli/login', { switch: switchAccount }, o)
export const postCliLoginCode = (code: string, o?: CallOptions) => request<AiCliLogin>('POST', '/ai/cli/login/code', { code }, o)
export const deleteCliLogin = (o?: CallOptions) => request<AiCliLogin>('DELETE', '/ai/cli/login', undefined, o)
export const postCliLogout = (o?: CallOptions) => request<AiStatus>('POST', '/ai/cli/logout', undefined, o)
// "AI akkauntlar": each provider's row, the provider for Nova, and the per-provider sign-in (one at a time on the server)
export const getAiAccounts = (o?: CallOptions) => request<AiAccounts>('GET', '/ai/accounts', undefined, o)
export const putAiAccounts = (body: AiAccountsPatch, o?: CallOptions) => request<AiAccounts>('PUT', '/ai/accounts', body, o)
export const getAccountLogin = (o?: CallOptions) => request<AiCliLogin>('GET', '/ai/accounts/login', undefined, o)
export const postAccountLogin = (provider: AiAccountId, switchAccount: boolean, o?: CallOptions) =>
  request<AiCliLogin>('POST', `/ai/accounts/${enc(provider)}/login`, { switch: switchAccount }, o)
export const postAccountLoginCode = (code: string, o?: CallOptions) => request<AiCliLogin>('POST', '/ai/accounts/login/code', { code }, o)
export const deleteAccountLogin = (o?: CallOptions) => request<AiCliLogin>('DELETE', '/ai/accounts/login', undefined, o)
export const postAccountLogout = (provider: AiAccountId, o?: CallOptions) => request<AiAccounts>('POST', `/ai/accounts/${enc(provider)}/logout`, undefined, o)
/** a tiny real question through the chosen (or the active) provider */
export const testAi = (provider?: Exclude<AiProvider, 'auto'>, o?: CallOptions) =>
  request<AiTestResult>('POST', '/ai/test', provider ? { provider } : {}, o)
/** the app-wide assistant: thread = global | p:<projectId> | l:<slug> (oldest first) */
export const getAssistantMessages = (thread: string, o?: CallOptions) =>
  request<AssistantMessage[]>('GET', `/assistant/messages?thread=${enc(thread)}`, undefined, o)
export const sendAssistantMessage = (body: AssistantRequest, o?: CallOptions) => request<AssistantMessage>('POST', '/assistant/messages', body, o)

// ───────────────────────────── shared caches ─────────────────────────────

/** the jobs of a project that the UI follows */
export function projectJobs(project: Project): Job[] {
  return [project.load.job, project.analysis.job, project.build.job].filter((j): j is Job => j !== null)
}

/** a fresh Project whose list row is out of date (finished build, new step…) marks the list stale */
function syncProjectRow(project: Project): Project {
  // a build (or a rebuild after adding a page) just finished: the open live dashboard reads its new page list
  const before = projectCache.peek(project.id)?.build.job
  const slug = project.build.slug
  if (slug && before && isJobActive(before) && !isJobActive(project.build.job)) liveCache.invalidate(slug)
  const row = projectsCache.peek('all')?.find((r) => r.id === project.id)
  if (row && (row.status !== project.status || row.step !== project.step || row.slug !== project.slug ||
    row.stepsDoneCount !== project.stepsDone.length || row.name !== project.name)) projectsCache.invalidate()
  return project
}

/** backoff while the server is unreachable: 2 s, 4 s … capped at 30 s */
const backoff = (errors: number) => Math.min(30_000, 2_000 * 2 ** Math.max(0, errors - 1))

export const projectCache = new ResourceCache<string, Project, ApiError>({
  fetch: (pid, signal) =>
    getProject(pid, { signal }).then(syncProjectRow, (e: unknown) => Promise.reject(toApiError(e))),
  interval: (data, error, errors) => {
    if (error?.code === 'NOT_FOUND') return null
    if (error) return backoff(errors)
    return data && projectJobs(data).some(isJobActive) ? 2_000 : 20_000
  },
})

export const projectsCache = new ResourceCache<'all', ProjectSummary[], ApiError>({
  fetch: (_k, signal) => listProjects({ signal }).catch((e: unknown) => Promise.reject(toApiError(e))),
  interval: (data, error, errors) => (error ? backoff(errors) : data?.some((r) => r.activeJob && isJobActive(r.activeJob)) ? 5_000 : 30_000),
})

export const portfolioCache = new ResourceCache<'all', PortfolioProject[], ApiError>({
  fetch: (_k, signal) => getPortfolio({ signal }).catch((e: unknown) => Promise.reject(toApiError(e))),
  interval: (_d, error, errors) => (error ? backoff(errors) : null),
  refreshOnFocus: false,
})

export const liveCache = new ResourceCache<string, LiveInfo, ApiError>({
  fetch: (slug, signal) => getLive(slug, { signal }).catch((e: unknown) => Promise.reject(toApiError(e))),
  interval: (data, error, errors) => (error?.code === 'NOT_FOUND' ? null : error ? backoff(errors) : isJobActive(data?.job) ? 2_000 : 60_000),
})

/** the AI connection: every 60 s while anything shows it, and on focus */
export const aiStatusCache = new ResourceCache<'ai', AiStatus, ApiError>({
  fetch: (_k, signal) => getAiStatus({ signal }).catch((e: unknown) => Promise.reject(toApiError(e))),
  interval: (_d, error, errors) => (error ? Math.max(backoff(errors), 15_000) : 60_000),
})

/** write a fresh Project (e.g. from connectSource) into the cache and mark the list stale */
export function acceptProject(project: Project): void {
  projectCache.set(project.id, project)
  projectsCache.invalidate()
}

// ───────────────────────────── autosave ─────────────────────────────

export type SaveState = 'saved' | 'saving' | 'failed'

export interface SaveStatus {
  state: SaveState
  /** Date.now() of the last acknowledged save, null = nothing saved in this session */
  savedAt: number | null
  /** the last failure; isNetwork = offline (the edit is kept on this device) */
  error: ApiError | null
}

/** fields that may sit in the offline mirror (never `step`: moving is not an edit, and never anything secret) */
type DraftPatch = Omit<ProjectPatch, 'step'>
const mirror = new DraftMirror<DraftPatch>()
const TEXT_DEBOUNCE_MS = 600

interface Waiter {
  resolve: (p: Project) => void
  reject: (e: ApiError) => void
}

/** One per project: merges edits into one PATCH, shows them at once (optimistic layer), mirrors unsent ones offline. */
class Autosaver {
  private pending: ProjectPatch = {}
  private inflight: ProjectPatch | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private waiters: Waiter[] = []
  private listeners = new Set<() => void>()
  status: SaveStatus = { state: 'saved', savedAt: null, error: null }
  private readonly pid: string

  constructor(pid: string) {
    this.pid = pid
    const draft = mirror.read(pid)
    if (draft) {
      this.pending = { ...draft }
      this.applyLayer()
      this.schedule(0)
    }
    if (typeof window !== 'undefined') window.addEventListener('online', () => this.hasPending() && this.schedule(0))
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getStatus = () => this.status

  private setStatus(s: Partial<SaveStatus>) {
    this.status = { ...this.status, ...s }
    this.listeners.forEach((l) => l())
  }

  private hasPending() {
    return Object.keys(this.pending).length > 0
  }

  private applyLayer() {
    const overlay = { ...(this.inflight ?? {}), ...this.pending }
    const { step: _step, loadSpeed, ...fields } = overlay
    void _step
    projectCache.setLayer(
      this.pid,
      'autosave',
      Object.keys(overlay).length
        ? (prj) => ({ ...prj, ...fields, load: loadSpeed ? { ...prj.load, speed: loadSpeed } : prj.load })
        : null,
    )
  }

  private writeMirror() {
    const { step: _s, ...rest } = { ...(this.inflight ?? {}), ...this.pending }
    void _s
    mirror.write(this.pid, rest)
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, ms)
  }

  /** queue a change; `debounce` for typing, 0 for choices. Resolves with the server's project once this change is saved. */
  save(patch: ProjectPatch, debounce: number): Promise<Project> {
    this.pending = { ...this.pending, ...patch }
    this.applyLayer()
    this.writeMirror()
    this.setStatus({ state: 'saving', error: null })
    const done = new Promise<Project>((resolve, reject) => this.waiters.push({ resolve, reject }))
    // fire-and-forget callers (typing) must not raise unhandled rejections; the status shows the failure
    done.catch(() => undefined)
    this.schedule(debounce)
    return done
  }

  /** send what is queued now (e.g. before navigating away) */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inflight || !this.hasPending()) return
    const body = this.pending
    const waiters = this.waiters
    this.pending = {}
    this.waiters = []
    this.inflight = body
    try {
      const project = await patchProject(this.pid, body)
      this.inflight = null
      projectCache.set(this.pid, project)
      projectsCache.invalidate()
      this.applyLayer()
      this.writeMirror()
      waiters.forEach((w) => w.resolve(project))
      this.setStatus({ state: this.hasPending() ? 'saving' : 'saved', savedAt: Date.now(), error: null })
    } catch (e) {
      const err = toApiError(e)
      this.inflight = null
      if (err.isNetwork) {
        // offline: keep the edit (shown + mirrored) and retry on reconnect / the next change / "Qayta urinish"
        this.pending = { ...body, ...this.pending }
      }
      this.applyLayer()
      this.writeMirror()
      waiters.forEach((w) => w.reject(err))
      this.setStatus({ state: 'failed', error: err })
      if (err.isNetwork) this.schedule(15_000)
    }
    if (this.hasPending() && !this.timer) this.schedule(0)
  }

  retry(): void {
    if (this.hasPending()) this.schedule(0)
    else this.setStatus({ state: 'saved', error: null })
  }
}

const savers = new Map<string, Autosaver>()
function saver(pid: string): Autosaver {
  let s = savers.get(pid)
  if (!s) savers.set(pid, (s = new Autosaver(pid)))
  return s
}

// ───────────────────────────── hooks ─────────────────────────────

export interface UseProject extends ResourceSnapshot<Project, ApiError> {
  project: Project | undefined
  /** optimistic PATCH (immediate); resolves with the server's project, rejects with ApiError (e.g. STEP_LOCKED) */
  patch: (patch: ProjectPatch) => Promise<Project>
  refresh: () => Promise<Project | undefined>
}

/** one project, polled every 2 s while a job is queued/running, else on focus and every 20 s */
export function useProject(pid: string | null | undefined): UseProject {
  const snap = useResource(projectCache, pid)
  const patch = useCallback(
    (body: ProjectPatch) => (pid ? saver(pid).save(body, 0) : Promise.reject(new ApiError(400, { code: 'VALIDATION' }))),
    [pid],
  )
  const refresh = useCallback(() => (pid ? projectCache.refresh(pid) : Promise.resolve(undefined)), [pid])
  return { ...snap, project: snap.data, patch, refresh }
}

/** my projects (newest first); 5 s polling while any row has an active job. enabled=false asks nothing (anonymous viewers) */
export function useProjects(enabled = true) {
  const snap = useResource(projectsCache, enabled ? 'all' : null)
  const refresh = useCallback(() => projectsCache.refresh('all'), [])
  return { ...snap, projects: snap.data, refresh }
}

/** Data365's own working projects (internal; the API answers the owner only, so members pass enabled=false) */
export function usePortfolio(enabled = true) {
  const snap = useResource(portfolioCache, enabled ? 'all' : null)
  const refresh = useCallback(() => portfolioCache.refresh('all'), [])
  return { ...snap, portfolio: snap.data, refresh }
}

/** save (url) or clear (null) a portfolio project's live link; the cached list takes the server's answer */
export async function savePortfolioUrl(id: string, url: string | null): Promise<PortfolioProject> {
  const next = await (url === null ? clearPortfolioUrl(id) : setPortfolioUrl(id, url)).catch((e: unknown) => Promise.reject(toApiError(e)))
  portfolioCache.set('all', (prev) => (prev ?? []).map((row) => (row.id === id ? next : row)))
  return next
}

/** a built dashboard by slug; 2 s polling while its refresh job runs */
export function useLive(slug: string | null | undefined) {
  const snap = useResource(liveCache, slug)
  const refresh = useCallback(() => (slug ? liveCache.refresh(slug) : Promise.resolve(undefined)), [slug])
  return { ...snap, live: snap.data, refresh }
}

export interface UseAutosave extends SaveStatus {
  /** text fields: saved 600 ms after the last keystroke */
  text: (patch: DraftPatch) => Promise<Project>
  /** choices (tiles, chips, pages): saved at once */
  choice: (patch: DraftPatch) => Promise<Project>
  flush: () => Promise<void>
  retry: () => void
}

const IDLE_STATUS: SaveStatus = { state: 'saved', savedAt: null, error: null }

/**
 * Autosave of the project's editable fields, shared by every component of the same project (the step rail shows the
 * indicator). Unsent edits are mirrored to localStorage 'd365.project.<id>.draft' and replayed after a reload.
 */
export function useAutosave(pid: string | null | undefined): UseAutosave {
  const s = pid ? saver(pid) : null
  const status = useSyncExternalStore(
    s ? s.subscribe : noopSubscribe,
    s ? s.getStatus : idleStatus,
    s ? s.getStatus : idleStatus,
  )
  useEffect(() => {
    if (!s) return
    const onHide = () => void s.flush()
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [s])
  return useMemo(
    () => ({
      ...status,
      text: (patch: DraftPatch) => (s ? s.save(patch, TEXT_DEBOUNCE_MS) : Promise.reject(new ApiError(400, { code: 'VALIDATION' }))),
      choice: (patch: DraftPatch) => (s ? s.save(patch, 0) : Promise.reject(new ApiError(400, { code: 'VALIDATION' }))),
      flush: () => (s ? s.flush() : Promise.resolve()),
      retry: () => s?.retry(),
    }),
    [status, s],
  )
}

const noopSubscribe = () => () => {}
const idleStatus = () => IDLE_STATUS

// ───────────────────────────── AI connection ─────────────────────────────

/** the AI status shared by the top-bar pill, Nova's panel and the "AI ulanish" page; enabled=false asks nothing */
export function useAiStatus(enabled = true) {
  const snap = useResource(aiStatusCache, enabled ? 'ai' : null)
  const refresh = useCallback(() => aiStatusCache.refresh('ai'), [])
  return { ...snap, ai: snap.data, refresh }
}

/** POST /api/ai/cli/logout; the cached status takes the server's answer */
export async function signOutCli(): Promise<AiStatus> {
  const next = await postCliLogout().catch((e: unknown) => Promise.reject(toApiError(e)))
  aiStatusCache.set('ai', next)
  return next
}

/** PUT /api/ai/settings; the cached status takes the server's answer */
export async function saveAiSettings(patch: AiSettingsPatch): Promise<AiStatus> {
  const next = await putAiSettings(patch).catch((e: unknown) => Promise.reject(toApiError(e)))
  aiStatusCache.set('ai', next)
  return next
}
