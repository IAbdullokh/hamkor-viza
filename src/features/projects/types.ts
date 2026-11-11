/**
 * WIRE CONTRACT between apps/web-dashboard (React) and apps/api (C# ASP.NET Core, .NET 10).
 *
 * This file is the single source of truth for every JSON shape that crosses `/api`. The C# DTOs in
 * apps/api/src/Data365.Api/Contracts mirror it field for field (System.Text.Json, camelCase, string literals exactly as
 * written here — no enums with other spellings). Change it only through the lead (docs/build/SPEC.md §4).
 *
 * Conventions
 * - Timestamps in API objects: ISO-8601 UTC strings ("2026-10-20T09:15:00Z"). The dashboard dataset (DatasetSnapshot)
 *   uses epoch milliseconds, because the existing pages compute with numbers.
 * - Human text is NOT sent by the server for product copy. The server sends codes + params (CheckId, Notice.code,
 *   ErrorCode, QuestionId) and the front end renders Uzbek text through t() with RU/EN dicts. Portal data (stage names,
 *   user names, field titles, campaign names) is sent as is and never translated.
 * - Secrets (Bitrix webhook URL, Meta token, OnlinePBX API key, Moizvonki API key) go to the server once and never come back; only `masked`.
 * - Errors: non-2xx responses carry ApiError.
 */

// ───────────────────────────── shared ids ─────────────────────────────

export type StepId = 'name' | 'sources' | 'structure' | 'load' | 'look' | 'pages' | 'analysis' | 'questions' | 'build'
export const STEPS: StepId[] = ['name', 'sources', 'structure', 'load', 'look', 'pages', 'analysis', 'questions', 'build']
/** route segment of each step: /p/$pid/<segment> */
export const STEP_SEGMENT: Record<StepId, string> = {
  name: 'nom',
  sources: 'manbalar',
  structure: 'tuzilma',
  load: 'yuklash',
  look: 'korinish',
  pages: 'sahifalar',
  analysis: 'tahlil',
  questions: 'savollar',
  build: 'qurish',
}

export type ProjectStatus = 'draft' | 'loading' | 'analysing' | 'questions' | 'building' | 'ready' | 'error'

/** every tile of the source catalog (front-end registry); only ConnectableSourceId can be connected today */
export type SourceId =
  | 'bitrix24'
  | 'amocrm'
  | 'meta'
  | 'google_ads'
  | 'yandex_direct'
  | 'tiktok_ads'
  | 'telegram_ads'
  | 'onlinepbx'
  | 'bitrix_tel'
  | 'zadarma'
  | 'uis'
  | 'sipuni'
  | 'moizvonki'
  | 'excel'
  | 'sheets'
  | 'postgres'
  | 'mysql'
  | 'clickhouse'
  | 'mssql'
  | 'onec'
  | 'moysklad'
  | 'payme'
  | 'click'
  | 'wazzup'
  | 'telegram_bot'
  | 'instagram'
  | 'whatsapp'
  | 'billz'
  | 'request'
export type ConnectableSourceId =
  | 'bitrix24'
  | 'meta'
  | 'onlinepbx'
  | 'moizvonki'
  | 'amocrm' // Kommo / amoCRM: the same leads, deals and stages as Bitrix24
  | 'telegram_bot' // chats + leads from a Telegram bot
  | 'wazzup' // WhatsApp / Telegram chats through Wazzup
  | 'instagram' // Instagram Direct conversations (Meta)
  | 'whatsapp' // WhatsApp Business Cloud API conversations (Meta)
  | 'billz' // Billz POS: sales, products, stock
  | TabularSourceId // tables mapped to pages (see "tables" below)

/** table sources: they feed pages only through ConnectionDetails.mappings */
export type TabularSourceId = 'excel' | 'sheets' | DatabaseSourceId
/** read-only databases (SELECTs on mapped tables only) */
export type DatabaseSourceId = 'postgres' | 'mysql' | 'clickhouse' | 'mssql'

/** pages of the default dashboard (same ids as web/registry.ts PageId) */
export type PageId = 'lead' | 'deal' | 'calls' | 'kampaniyalar' | 'hisobot' | 'reja' | 'taqsimot' | 'chatlar' | 'savdo'
/** the preset dashboard UIs of the catalog (the five Liquid variants + the copied UIs) */
export type PresetUiId = 'glass' | 'klassik' | 'statistik' | 'kompakt' | 'bento' | 'midnight' | 'minimal' | 'glasspro'
/** "Aralash" (look/mix.ts): a base layout + a colour mood + a density, stored as `mix:<base>.<mood>.<density>` (Ids.cs UiIds.IsValid) */
export type MixBase = 'glass' | 'bento' | 'minimal'
export type MixMood = 'light' | 'dark' | 'neon'
export type MixDensity = 'airy' | 'compact'
export type MixUiId = `mix:${MixBase}.${MixMood}.${MixDensity}`
/** the project's look: a preset or an Aralash value */
export type UiId = PresetUiId | MixUiId
export type IndustryId = 'education' | 'clinic' | 'fitness' | 'retail' | 'realestate' | 'services' | 'manufacturing' | 'other'

/** what the structure preview, estimates and counts talk about */
export type EntityId =
  | 'leads'
  | 'deals'
  | 'contacts'
  | 'calls'
  | 'users'
  | 'departments'
  | 'leadStages'
  | 'dealStages'
  | 'pipelines'
  | 'sources'
  | 'fields'
  | 'stageHistory'
  | 'campaigns'
  | 'adDays'
  | 'extensions'
  | 'conversations'
  | 'orders'
  | 'products'
  | 'stock'

/**
 * Every notice code the server may send (the front end has text for each one). Add new codes here first.
 *   job:       RATE_LIMIT_BACKOFF {sec}, OPERATION_TIME_PAUSE {method, sec}, SERVER_RESTARTED, PARTIAL_DATA {entity},
 *              PBX_DAY_SPLIT {day}, META_THROTTLED {sec}, WAITING_FOR_LOAD, NO_NEW_DATA
 *   estimate:  BIG_PORTAL {rows}, NIGHT_RECOMMENDED, PBX_WEEK_CHUNKS, META_HISTORY_37M, DEMO_SPEED {scale}
 *   import:    FILE_OK, FILE_PARTIAL {file, portal}, FILE_STALE {pct}, UNKNOWN_LABELS {count}, DATES_SHIFTED {hours}
 *   access:    NO_BITRIX, NO_CHATS, NO_POS, NO_TELEPHONY, NO_META, NO_DEPARTMENT, NO_PAYMENTS, NO_DEALS, NO_WON_DEALS, NO_FORMS,
 *              NO_UTM_MATCH, VIEW_ONLY
 *   preview:   MASKED, EMPTY, NOT_AVAILABLE
 *   guesses:   GUESS_NAME, GUESS_TEMPLATE, GUESS_SEMANTICS, GUESS_ACTIVITY, GUESS_DEFAULT
 * Job errors (`Job.error`) use ErrorCode values.
 */
export type NoticeCode =
  | 'RATE_LIMIT_BACKOFF'
  | 'OPERATION_TIME_PAUSE'
  | 'SERVER_RESTARTED'
  | 'PARTIAL_DATA'
  | 'PBX_DAY_SPLIT'
  | 'META_THROTTLED'
  | 'WAITING_FOR_LOAD'
  | 'NO_NEW_DATA'
  | 'BIG_PORTAL'
  | 'NIGHT_RECOMMENDED'
  | 'PBX_WEEK_CHUNKS'
  | 'META_HISTORY_37M'
  | 'DEMO_SPEED'
  | 'FILE_OK'
  | 'FILE_PARTIAL'
  | 'FILE_STALE'
  | 'UNKNOWN_LABELS'
  | 'DATES_SHIFTED'
  | 'NO_BITRIX'
  | 'NO_CHATS'
  | 'NO_POS'
  | 'ROWS_SKIPPED' // job: rows of a mapped table skipped (required value missing / unreadable): params.table, params.count
  | 'NO_TELEPHONY'
  | 'NO_META'
  | 'NO_DEPARTMENT'
  | 'NO_PAYMENTS'
  | 'NO_DEALS'
  | 'NO_WON_DEALS'
  | 'NO_FORMS'
  | 'NO_UTM_MATCH'
  | 'VIEW_ONLY'
  | 'MASKED'
  | 'EMPTY'
  | 'NOT_AVAILABLE'
  | 'GUESS_NAME'
  | 'GUESS_TEMPLATE'
  | 'GUESS_SEMANTICS'
  | 'GUESS_ACTIVITY'
  | 'GUESS_DEFAULT'
  | 'SECTION_SKIPPED' // access: a section the page reads was skipped in the load (params.section); the page shows it empty

/** a server message without product copy: the front end turns `code` into text via t() */
export interface Notice {
  code: NoticeCode | ErrorCode
  params?: Record<string, string | number>
}

// ───────────────────────────── errors ─────────────────────────────

export type ErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED' // not signed in
  | 'FORBIDDEN' // signed in but not allowed (e.g. a member opening AI settings)
  | 'INVALID_LOGIN' // wrong e-mail or password
  | 'SETUP_DONE' // the owner already exists
  | 'WEAK_PASSWORD' // at least 10 characters, not a common password
  | 'VALIDATION'
  | 'ALREADY_CONNECTED' // the same source (or the same portal) is already in this project
  | 'CONNECT_BLOCKED' // the keys work but a required check failed (see `checks`); nothing was saved
  | 'EMPTY'
  | 'NO_DATA' // the analysis found neither a lead nor a deal in the portal
  | 'NOT_A_WEBHOOK'
  | 'BROKEN_WEBHOOK'
  | 'LOOKS_LIKE_OAUTH'
  | 'BAD_USER_ID'
  | 'INVALID_CREDENTIALS'
  | 'NO_AUTH_FOUND'
  | 'ACCESS_DENIED' // e.g. Bitrix24 free plan: REST disabled
  | 'PORTAL_DELETED'
  | 'OVERLOAD_LIMIT'
  | 'UNREACHABLE'
  | 'TIMEOUT'
  | 'META_TOKEN_INVALID'
  | 'META_TOKEN_EXPIRED'
  | 'META_PERMISSION'
  | 'META_AD_ACCOUNT' // Meta won't list the token's ad accounts, or a typed ad account id can't be read with it
  | 'PBX_WRONG_DOMAIN'
  | 'PBX_WRONG_KEY'
  | 'PBX_DISABLED'
  | 'PBX_FORBIDDEN_IP'
  | 'FILE_TOO_LARGE'
  | 'FILE_FORMAT'
  | 'FILE_NO_ID'
  | 'FILE_WRONG_PORTAL'
  | 'FILE_WRONG_ENTITY' // the file holds the other entity; params detected, chosen, rows
  | 'JOB_RUNNING'
  | 'STEP_LOCKED'
  | 'SCRATCH_SOON'
  | 'NEEDS_BITRIX'
  | 'CLAUDE_UNAVAILABLE'
  | 'AI_KEY_INVALID' // the saved / pasted Anthropic API key was rejected
  | 'AI_CLI_NOT_FOUND' // Claude Code is not installed on the computer running the API
  | 'AI_CLI_NOT_LOGGED_IN' // Claude Code is installed but not signed in
  | 'AI_LIMIT_REACHED' // the Claude subscription limit (5-hour or weekly) is reached; params.resetsAt
  | 'GEMINI_KEY_INVALID' // the Gemini key was rejected
  | 'GEMINI_NOT_CONFIGURED' // voice needs a Gemini key
  | 'VOICE_LIVE_DISABLED' // live conversation is turned off (for colleagues)
  | 'VOICE_NOTICE_REQUIRED' // accept the voice privacy notice first
  | 'SHEET_NOT_SHARED' // Google Sheets: not shared with our service account, nor open to anyone with the link
  | 'HOST_NOT_ALLOWED' // database host in a blocked range (link-local / metadata; private unless allowed by the server)
  | 'TABLE_NOT_FOUND' // a mapped sheet / table no longer exists (params.table)
  | 'MAPPING_INVALID' // a mapping misses a required field or names an unknown column (params.table, params.field)
  | 'USAGE_NO_COLLECTOR' // POST /portfolio/{id}/usage/refresh on a project without a daily usage collector (409)
  | 'TOO_SOON' // the same action ran moments ago (429); params.retryAfter = seconds
  | 'NOT_PUBLISHED' // «Taqsimot»: switched on before the dashboard has a server to run on
  | 'NOT_SYNCED' // «Taqsimot»: saved on Studio, but its publishing server could not be reached
  | 'INTERNAL'

export interface ApiError {
  code: ErrorCode
  params?: Record<string, string | number>
  /** only for CONNECT_BLOCKED: the full checklist, so the UI can show what failed */
  checks?: Check[]
  /** developer detail; never shown as a headline (a collapsed "Texnik ma'lumot" line at most) */
  detail?: string
}

// ───────────────────────────── checks (connect validation) ─────────────────────────────

export type CheckId =
  // Bitrix24
  | 'bitrix.reachable' // the portal answered
  | 'bitrix.webhook' // the link is a live webhook
  | 'bitrix.plan' // REST available on this plan; params.plan
  | 'bitrix.creator' // who created the link; params.name
  | 'bitrix.admin' // creator is an administrator (warn when not: some rows may be hidden)
  | 'bitrix.scope.crm' // required
  | 'bitrix.scope.user' // required
  | 'bitrix.scope.department' // warn when missing
  | 'bitrix.scope.telephony' // warn when missing
  | 'bitrix.scope.task' // warn when missing
  | 'bitrix.scope.timeman' // warn when missing
  | 'bitrix.data.leads' // params.count
  | 'bitrix.data.deals' // params.count
  | 'bitrix.data.calls' // Bitrix telephony rows; params.count (0 → warn: connect OnlinePBX for calls)
  // Meta Ads
  | 'meta.token' // valid token
  | 'meta.expiry' // params.days (never-expiring → ok, < 14 days → warn)
  | 'meta.perm.ads_read' // required
  | 'meta.perm.leads_retrieval' // warn when missing
  | 'meta.perm.pages' // pages_show_list + pages_read_engagement; warn when missing
  | 'meta.perm.business' // business_management; warn when missing
  | 'meta.accounts' // params.count ad accounts visible (0 → fail)
  | 'meta.insights' // spend readable; params.spend30d
  // OnlinePBX and Moizvonki (same ids)
  | 'pbx.auth'
  | 'pbx.domain'
  | 'pbx.users' // params.count extensions
  | 'pbx.history' // params.count calls in the last 24 h
  // the newer sources share generic checks (params: source, name, count, scopes …)
  | 'src.auth' // the key / token works
  | 'src.account' // which account / bot / shop it opens; params.name
  | 'src.permissions' // the rights the dashboards need; params.missing (comma list) when warn
  | 'src.data' // data is there; params.count (+ params.entity)
  | 'src.webhook' // live updates need a public address; warn when the server has none (data is pulled instead)

export type CheckState = 'ok' | 'warn' | 'fail' | 'skip'

export interface Check {
  id: CheckId
  state: CheckState
  /** a failing required check blocks the connection */
  required: boolean
  params?: Record<string, string | number>
  /** pages that lose something when this check is not ok */
  pages?: PageId[]
}

// ───────────────────────────── connections ─────────────────────────────

export type ConnectionState = 'ok' | 'partial' | 'error'

export interface MetaAdAccount {
  id: string // act_<digits>
  name: string
  currency: string
  status: 'active' | 'disabled' | 'other'
  spend30d?: number
}

export interface ConnectionDetails {
  // bitrix24
  portal?: string // host, e.g. demo-kompaniya.bitrix24.uz
  isCloud?: boolean
  creator?: string
  isAdmin?: boolean
  plan?: string
  scopes?: string[]
  // shared: instant counts known at connect time
  counts?: Partial<Record<EntityId, number>>
  // meta
  adAccounts?: MetaAdAccount[]
  selectedAdAccounts?: string[]
  tokenExpiresAt?: string | null // null = never expires
  pages?: { id: string; name: string }[]
  // onlinepbx / moizvonki
  domain?: string
  extensions?: number
  callsLast24h?: number
  // table sources (excel / sheets / databases)
  tables?: TableInfo[]
  mappings?: TableMapping[]
  fileName?: string // excel: the uploaded file's original name
}

export interface Connection {
  id: string // c_…
  source: ConnectableSourceId
  state: ConnectionState
  /** portal host / ad account name / PBX domain */
  label: string
  /** e.g. https://demo-kompaniya.bitrix24.uz/rest/1/••••••/ , EAAG…••••, ••••••3f9a */
  masked: string
  isDemo: boolean
  checks: Check[]
  connectedAt: string
  lastCheckedAt: string
  details: ConnectionDetails
}

export type ConnectRequest =
  /** Bitrix24: either the inbound webhook `url`, or the BI-analytics key (`portal` + `biKey`, CRM → Analitika → BI-analitika) */
  | { source: 'bitrix24'; demo?: boolean; url?: string; portal?: string; biKey?: string }
  /** Meta Ads: `adAccountIds` (optional, "817191165857341" / "act_…", commas) is read directly when Meta won't list the token's accounts */
  | { source: 'meta'; demo?: boolean; token?: string; adAccountIds?: string }
  | { source: 'onlinepbx'; demo?: boolean; domain?: string; apiKey?: string }
  /** Moizvonki: account host (kompaniya.moizvonki.ru), the supervisor's e-mail as `login`, the API key; same pbx.* checks */
  | { source: 'moizvonki'; demo?: boolean; domain?: string; login?: string; apiKey?: string }
  /** Kommo / amoCRM: account address (kompaniya.amocrm.ru / .kommo.com) + long-lived token */
  | { source: 'amocrm'; demo?: boolean; domain?: string; token?: string }
  /** Telegram: the bot token from @BotFather */
  | { source: 'telegram_bot'; demo?: boolean; token?: string }
  /** Wazzup: the API key from the Wazzup cabinet (Integratsiyalar → API) */
  | { source: 'wazzup'; demo?: boolean; apiKey?: string }
  /** Instagram Direct: a System User / page token with instagram_manage_messages; pageId optional (picked after connect) */
  | { source: 'instagram'; demo?: boolean; token?: string; pageId?: string }
  /** WhatsApp Business Cloud API: System User token + WhatsApp Business Account id (+ phone number id, optional) */
  | { source: 'whatsapp'; demo?: boolean; token?: string; wabaId?: string; phoneNumberId?: string }
  /** Billz: the integration (secret) token from Billz settings */
  | { source: 'billz'; demo?: boolean; token?: string }
  /** Excel / CSV: upload first (POST …/uploads → fileId) */
  | { source: 'excel'; demo?: boolean; fileId?: string }
  /** Google Sheets: the spreadsheet link (shared with our service account e-mail, or open to anyone with the link) */
  | { source: 'sheets'; demo?: boolean; url?: string }
  /** databases: a full `url` (postgres://user:pass@host:5432/db) or the separate fields; a read-only user is recommended */
  | { source: DatabaseSourceId; demo?: boolean; url?: string; host?: string; port?: number; database?: string; user?: string; password?: string; ssl?: boolean }

/** POST /api/projects/{id}/connections/bitrix24/parse — instant, no network */
export interface BitrixParseResult {
  ok: boolean
  host?: string
  userId?: number
  isCloud?: boolean
  masked?: string
  error?: ErrorCode
}

// ───────────────────────────── tables (excel / sheets / databases) ─────────────────────────────
// The client picks a sheet or table, says what it holds (MapTarget) and which column is which field; the server's tabular
// engine turns the rows into the usual data, so the standard pages fill. C# mirror: Core/Contracts/Tabular.cs.

/** what a mapped table feeds: leads / deals make the table the CRM (not next to Bitrix24 / amoCRM) */
export type MapTarget = 'leads' | 'deals' | 'orders' | 'products' | 'calls' | 'adSpend'
/** what the values of a table column look like */
export type ValueKind = 'text' | 'number' | 'date' | 'bool' | 'empty'

export interface MapField {
  id: string
  required: boolean
  kind: Exclude<ValueKind, 'empty'>
}

/** the fields of every target (same order as C# MapFields); "id" is optional everywhere */
export const MAP_FIELDS: Record<MapTarget, MapField[]> = {
  leads: [
    { id: 'id', required: false, kind: 'text' },
    { id: 'createdAt', required: true, kind: 'date' },
    { id: 'status', required: true, kind: 'text' },
    { id: 'title', required: false, kind: 'text' },
    { id: 'name', required: false, kind: 'text' },
    { id: 'phone', required: false, kind: 'text' },
    { id: 'source', required: false, kind: 'text' },
    { id: 'manager', required: false, kind: 'text' },
    { id: 'amount', required: false, kind: 'number' },
    { id: 'closedAt', required: false, kind: 'date' },
    { id: 'utmSource', required: false, kind: 'text' },
    { id: 'utmMedium', required: false, kind: 'text' },
    { id: 'utmCampaign', required: false, kind: 'text' },
  ],
  deals: [
    { id: 'id', required: false, kind: 'text' },
    { id: 'createdAt', required: true, kind: 'date' },
    { id: 'stage', required: true, kind: 'text' },
    { id: 'amount', required: false, kind: 'number' }, // empty amounts are common in real deal tables: default 0
    { id: 'closedAt', required: false, kind: 'date' },
    { id: 'manager', required: false, kind: 'text' },
    { id: 'source', required: false, kind: 'text' },
    { id: 'pipeline', required: false, kind: 'text' },
    { id: 'leadId', required: false, kind: 'text' },
    { id: 'phone', required: false, kind: 'text' },
  ],
  orders: [
    { id: 'id', required: false, kind: 'text' },
    { id: 'at', required: true, kind: 'date' },
    { id: 'total', required: true, kind: 'number' },
    { id: 'shop', required: false, kind: 'text' },
    { id: 'seller', required: false, kind: 'text' },
    { id: 'status', required: false, kind: 'text' },
    { id: 'discount', required: false, kind: 'number' },
    { id: 'cost', required: false, kind: 'number' },
    { id: 'method', required: false, kind: 'text' },
    { id: 'items', required: false, kind: 'number' },
    { id: 'phone', required: false, kind: 'text' },
  ],
  products: [
    { id: 'id', required: false, kind: 'text' },
    { id: 'name', required: true, kind: 'text' },
    { id: 'price', required: true, kind: 'number' },
    { id: 'category', required: false, kind: 'text' },
    { id: 'cost', required: false, kind: 'number' },
    { id: 'stock', required: false, kind: 'number' },
    { id: 'sku', required: false, kind: 'text' },
  ],
  calls: [
    { id: 'id', required: false, kind: 'text' },
    { id: 'at', required: true, kind: 'date' },
    { id: 'phone', required: true, kind: 'text' },
    { id: 'direction', required: false, kind: 'text' },
    { id: 'answered', required: false, kind: 'bool' },
    { id: 'talkSec', required: false, kind: 'number' },
    { id: 'waitSec', required: false, kind: 'number' },
    { id: 'manager', required: false, kind: 'text' },
  ],
  adSpend: [
    { id: 'day', required: true, kind: 'date' },
    { id: 'campaign', required: true, kind: 'text' },
    { id: 'spend', required: true, kind: 'number' },
    { id: 'adset', required: false, kind: 'text' },
    { id: 'ad', required: false, kind: 'text' },
    { id: 'impressions', required: false, kind: 'number' },
    { id: 'clicks', required: false, kind: 'number' },
    { id: 'leads', required: false, kind: 'number' },
    { id: 'platform', required: false, kind: 'text' },
  ],
}

/** a sheet / table / view the connection can read; id = sheet name, or "schema.table" for databases */
export interface TableInfo {
  id: string
  name: string
  rows?: number | null // files: exact; databases: an estimate
  columns?: number | null
}

export interface TableColumn {
  name: string
  kind: ValueKind
}

/** the engine's best mapping of a table for one target (field id → column name), score 0..1 */
export interface TableGuess {
  target: MapTarget
  columns: Record<string, string>
  score: number
}

/** GET /api/projects/{id}/connections/{cid}/tables/preview?table= — first rows (≤ 20) as display text, phones masked */
export interface TablePreview {
  table: string
  columns: TableColumn[]
  rows: (string | null)[][]
  total?: number | null
  guesses: TableGuess[] // best first
}

/** one table → one target; saved through PATCH …/connections/{cid} { mappings } (the full new set) */
export interface TableMapping {
  table: string
  target: MapTarget
  columns: Record<string, string> // field id → column name
  currency?: 'UZS' | 'USD' // money columns; default UZS (ad spend is stored in USD)
}

/** GET /api/sources/sheets — the service account e-mail to share a spreadsheet with (null = only "anyone with the link" works) */
export interface SheetsInfo {
  serviceAccount: string | null
}

/** POST /api/projects/{id}/uploads (multipart "file": .xlsx / .xls / .csv) */
export interface UploadResult {
  fileId: string
  fileName: string
  size: number
}

// ───────────────────────────── jobs ─────────────────────────────

export type JobKind = 'pull' | 'import' | 'analysis' | 'build' | 'refresh'
export type JobState = 'queued' | 'running' | 'paused' | 'done' | 'error' | 'cancelled'

/**
 * Phase ids by job kind (the front end owns their labels):
 *   pull / refresh: users, stages, fields, leads, deals, history, calls, ads, extensions, verify
 *   import:         parse, match, verify, leads, deals, history, calls, ads, extensions
 *   analysis:       wait-load, stages, sources, managers, fields, history, calls, ads, quality, questions
 *   build:          mapping, tables, pages, snapshot, url
 */
export interface JobPhase {
  id: string
  state: 'pending' | 'running' | 'done' | 'skipped' | 'error'
  progress: number // 0..1
  done?: number
  total?: number
  /** what the running phase is doing now; done / total then count that pass (the Bitrix24 top-up after a file) */
  step?: JobPhaseStep
}

/**
 * Passes of the Bitrix24 top-up after a file: staged = rows a cancelled pull left are merged, changed = records changed since
 * the newest held, new = IDs above the highest held, gaps = records a filtered export lacks, phones = PHONE of leads that have none.
 */
export type JobPhaseStep = 'staged' | 'changed' | 'new' | 'gaps' | 'phones'

export interface Job {
  id: string // j_…
  kind: JobKind
  state: JobState
  progress: number // 0..1
  /** seconds left; recomputed by the server from measured speed; null = unknown */
  etaSec: number | null
  startedAt: string | null
  finishedAt: string | null
  phases: JobPhase[]
  /** e.g. { code: 'RATE_LIMIT_BACKOFF', params: { sec: 8 } }, { code: 'SERVER_RESTARTED' } */
  notices: Notice[]
  error: Notice | null
}

// ───────────────────────────── structure (step 3) ─────────────────────────────

export type ColumnKind =
  | 'id'
  | 'text'
  | 'number'
  | 'money'
  | 'date'
  | 'datetime'
  | 'phone'
  | 'person'
  | 'stage'
  | 'source'
  | 'bool'
  | 'duration'

export interface PreviewColumn {
  /** stable key (system fields: id, title, stage, source, manager, createdAt, amount, currency, phone, utmSource …;
   *  custom fields: the portal code, e.g. UF_CRM_1770693781846) */
  key: string
  /** portal-provided label for custom fields (shown as is); system keys are labelled by the front end */
  title?: string
  kind: ColumnKind
}

export type PreviewRow = Record<string, string | number | boolean | null>

export interface PreviewEntity {
  id: EntityId
  source: ConnectableSourceId
  /** null while unknown */
  count: number | null
  /** false = instant estimate (ID span), true = exact total */
  countExact: boolean
  columns: PreviewColumn[]
  /** at most 10 rows; personal data masked server-side (+998 ** *** ** 12, initials) */
  rows: PreviewRow[]
  note?: Notice
}

export interface Structure {
  entities: PreviewEntity[]
  /** how entities connect, for the small diagram: lead → deal, lead → call, campaign → lead … */
  links: { from: EntityId; to: EntityId; via: string }[]
  generatedAt: string
}

// ───────────────────────────── load (step 4) ─────────────────────────────

export type LoadSpeed = 'gentle' | 'normal'

export interface LoadEstimate {
  api: {
    /** range in whole minutes for the chosen speed (gentle = half the portal limit) */
    minutesLo: number
    minutesHi: number
    requests: number
    byEntity: { entity: EntityId; rows: number; minutes: number }[]
    /** the load's sections with the owner's choices applied; a skipped one stays listed (rows = what taking it back brings) */
    sections?: SectionEstimate[]
    /** e.g. BIG_PORTAL (> 50k rows), NIGHT_RECOMMENDED, PBX_WEEK_CHUNKS */
    notices: Notice[]
  }
  file: {
    /** entities that can come from a Bitrix24 export file; the rest still comes through the API (small) */
    entities: ('leads' | 'deals')[]
    /** minutes the API part still takes after a file import (a leads file) */
    minutesAfterImport: number
    /** the same per file entity: the other entity, stage history, other sources and the small top-up of the file's own */
    minutesAfter?: Partial<Record<'leads' | 'deals', number>>
    /** only for demo connections: the server can produce a sample export file of the demo portal */
    demoExport: boolean
  }
}

/** a portal section of the load the owner may skip or cut to a period; setup phases (users, stages, fields) are always taken */
export type LoadSectionId = 'leads' | 'deals' | 'history' | 'calls' | 'ads' | 'extensions'

/** whole period, the last 3 / 6 months, 1 / 2 years, or from a date (`from`, yyyy-MM-dd) */
export type LoadPeriod = 'all' | '3m' | '6m' | '1y' | '2y' | 'date'

/** PUT /load/sections item, project.load.sections item */
export interface LoadSectionChoice {
  id: LoadSectionId
  skip?: boolean
  period?: LoadPeriod
  from?: string
}

/** LoadEstimate.api.sections item */
export interface SectionEstimate {
  id: LoadSectionId
  rows: number
  minutes: number
  skipped: boolean
  /** the section can be cut to a period (extensions cannot) */
  dated: boolean
}

export interface ImportReport {
  fileName: string
  entity: 'leads' | 'deals'
  detectedFormat: 'csv' | 'xlsx' | 'xls' | 'html-xls'
  encoding: string
  delimiter?: string
  rows: number
  headerMap: { column: string; field: string | null; confidence: number }[]
  verify: {
    countFile: number
    countPortal: number | null
    dateFrom: string | null
    dateTo: string | null
    spotChecked: number
    spotMismatches: number
    /** labels the portal does not know; title = the custom field's own title (or the file's column header) */
    unknownLabels: { field: string; values: string[]; title?: string }[]
    verdict: 'ok' | 'warn' | 'fail'
    notices: Notice[]
  }
  /** the entity the headers show (null = neither); a mismatch with the chosen one is refused (FILE_WRONG_ENTITY) */
  detectedEntity?: 'leads' | 'deals' | null
  /** distinct records by Bitrix ID; rows repeating an ID collapse to the newest DATE_MODIFY */
  records?: number
  duplicates?: number
  maxId?: number
  newestModifiedAt?: string
  /** what canon holds after the portal part of the import job (set when it finishes) */
  portal?: ImportPortalPart[]
}

/** an uploaded export file not (yet) one of project.load.reports: waiting for its turn, being checked, or refused */
export interface ImportFile {
  id: string
  fileName: string
  /** chosen with the upload, or read from the headers; null until known */
  entity: 'leads' | 'deals' | null
  state: 'queued' | 'checking' | 'error'
  /** why a refused file was refused (FILE_WRONG_ENTITY, FILE_WRONG_PORTAL …); a refused file never touched the data */
  error?: Notice
  uploadedAt: string
  /** refused for holding the other entity, its upload still on the server: retryImportFile re-queues it as that entity */
  kept?: boolean
}

export interface ImportPortalPart {
  entity: 'leads' | 'deals' | 'stageEvents'
  rows: number
  /** for the file's entity: records canon holds beyond the file's own (what the portal brought, before or after it) */
  added?: number
}

// ───────────────────────────── pages access (step 6) ─────────────────────────────

export interface PageAccess {
  page: PageId
  state: 'ready' | 'partial' | 'blocked'
  /** sources that would unlock / complete this page */
  needs: ConnectableSourceId[]
  /** e.g. NO_TELEPHONY, NO_META, NO_DEPARTMENT, NO_PAYMENTS, VIEW_ONLY */
  notes: Notice[]
}

// ───────────────────────────── questions (step 8) ─────────────────────────────

export type QuestionId =
  | 'lead.stageMap' // map every portal lead stage to one of our roles
  | 'lead.qualified' // which stages count as "Sifatli lid"
  | 'lead.booked' // "Tashrif belgilandi" comes from a stage or a date field
  | 'lead.reasons' // which fields hold the Bekor / Sifatsiz reasons
  | 'deal.reasons' // only with a reason-named deal list field: which deal fields hold the loss reasons
  | 'deal.pipelines' // which deal pipelines are sales
  | 'deal.stageMap' // map deal stages to open / kelishuv / won / lost
  | 'deal.payments' // how paid money is measured
  | 'deal.paymentDate' // which deal date field(s) give a payment's date, in priority order (the first filled wins)
  | 'staff.sales' // which users are sales managers
  | 'staff.exclude' // users to hide (system / integration users)
  | 'taqsimot.main' // Taqsimot: the user(s) new leads land on before they are handed out ("Main")
  | 'taqsimot.hours' // Taqsimot: the operators' working hours ("09-18")
  | 'sources.phone' // which lead sources mean an incoming call
  | 'sources.paid' // which lead sources are paid Meta ads (Instagram / Facebook)
  | 'currency' // main currency and the USD rate
  | 'calls.extensions' // OnlinePBX extension ↔ Bitrix24 user
  | 'meta.attribution' // how CRM leads link to Meta campaigns
  | 'lead.scope' // optional: only leads of one brand / project field value
  | 'lead.junk' // only when Bitrix's failure stages can't be split by name: which of them are junk (the rest lost)
  | 'lead.visited' // visit industries only: which stages mean the client came
  | 'deal.kelishuv' // optional: the deal stage (one per chosen pipeline) from which the client has agreed
  | 'lead.reportStage' // only with a «Стадия (для отчетов)» lead field: that field (its UF code) or 'crm_stage'
  | 'deal.reportStage' // only with a «Стадия сделки (для отчетов)» deal field: that field (its UF code) or 'crm_stage'

export type QuestionKind = 'map' | 'multi' | 'single' | 'currency'

export interface QOption {
  value: string
  /** portal label (stage name, user name, field title) or an option code the front end labels (role codes below) */
  label: string
  count?: number
  color?: string
  hint?: Notice
  /** the stage picker group: 'lead' (lead stages), 'fields' (lead date fields), 'p:<pipeline id>' (a deal pipeline) */
  group?: OptionGroup
  /** deal.pipelines: the pipeline's sold deals (all time) */
  won?: number
}

/** a stage picker group: lead stages, lead date fields or one deal pipeline ('p:<id>') */
export type OptionGroup = 'lead' | 'fields' | `p:${string}`

/** one portal item to map (kind 'map'): a stage, an extension */
export interface MapRow {
  key: string
  label: string
  count: number
  guess: string
  confidence: number // 0..1
  /** deal.stageMap: the stage's pipeline group ('p:<id>') */
  group?: OptionGroup
  /** deal.stageMap: the name says otherwise than Bitrix's mark ("Tekshiring"): sounds sold / sounds lost */
  flag?: 'won' | 'lost'
}

/**
 * Role codes used as option values:
 *   lead.stageMap: new, contact, qualified, booked, visited, won, lost, junk, archive. When the CRM types its stages
 *     (params.semantics = 1) the groups come from Bitrix (process / success / failure, params.process|success|failure
 *     counts), the list offers new, contact, booked (visits only), won, lost, junk, archive, and an answer holds only
 *     the owner's overrides (an older answer holds every row): the effective map is the guess with the answer on top
 *   deal.stageMap: open, kelishuv, won, lost
 *   deal.payments: won_amount, uf_paid, field:<UF code> (any number / money deal field), none
 *   meta.attribution: utm_campaign, utm_source, none (an older answer may say form: it reads as the guess)
 *   lead.booked: stage:<STATUS_ID> | field:<UF code>
 */
export interface Answer {
  values?: string[]
  map?: Record<string, string>
  /** currency: main currency code in values[0], the owner's own USD→UZS rate here (mode 'manual') */
  number?: number
  /**
   * currency: 'auto' = the Central Bank's rate of each day (cbu.uz), 'manual' = `number`. An older answer without it is
   * manual, unless it holds the old built-in 12 650 (then auto).
   */
  mode?: RateMode
  /** stage maps: the owner's own name for a row ("Boshqa… (o'zim yozaman)"), shown as the stage's name on the dashboard */
  labels?: Record<string, OwnMeaning>
}

/** a stage described in the owner's own words: his short name (≤ 40) and what he wrote (≤ 300) */
export interface OwnMeaning {
  name: string
  text?: string
}

export type ImpactMetric =
  | 'qualified_leads'
  | 'booked_leads'
  | 'visited_leads'
  | 'won_deals'
  | 'paid_amount'
  | 'sales_staff'
  | 'phone_leads'
  | 'paid_leads'
  | 'matched_calls'
  | 'attributed_leads'
  | 'scoped_leads'
  | 'kelishuv_deals'

export type RateMode = 'auto' | 'manual'

export interface Question {
  id: QuestionId
  kind: QuestionKind
  required: boolean
  order: number
  /** values for the front end's question text, e.g. { stages: 11 } */
  params?: Record<string, string | number>
  options: QOption[]
  rows?: MapRow[]
  guess: Answer
  /** overall confidence of the guess, 0..1 */
  confidence: number
  /** the saved answer; null = not answered yet (the guess is pre-selected in the UI) */
  answer: Answer | null
  /** live impact of the saved answer (or the guess) on one number, e.g. qualified leads = 847 */
  impact?: QuestionImpact
  dependsOn?: QuestionId[]
  /** the question told from the portal's own data (what we saw, what we concluded, what it changes); never stored */
  story?: QuestionStory
}

/** 2–3 plain sentences about one question in the three UI languages */
export interface QuestionStory {
  uz: string
  ru: string
  en: string
}

export interface QuestionImpact {
  metric: ImpactMetric
  value: number
  guessValue: number
  /** what `value` is a part of in the same period ("8 861 liddan 3 992"); absent = a plain number */
  total?: number
  /** the period in days back from the latest data; absent = no period */
  days?: number
}

export interface ImpactPreview {
  metric: ImpactMetric
  value: number
  total?: number
  days?: number
}

// ───────────────────────────── Claude chat (step 8) ─────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: string
  questionId?: QuestionId
  /** the assistant can propose an answer the user may apply with one click */
  suggestion?: { questionId: QuestionId; answer: Answer; summary: string }
  /** the person's words were unclear: text is Nova's question back and there is nothing to apply until they answer */
  clarify?: boolean
  /** 'claude' = real model answer; 'fallback' = prepared answer (no API key on the server) */
  source?: 'claude' | 'fallback'
  /** a stage row's «Boshqa…» box this message belongs to (its own thread of the question) */
  rowKey?: string
  /** the proposal was confirmed («Tasdiqlash», once) */
  appliedAt?: string
  /** the proposal was turned down («Yo'q, boshqacha») */
  declinedAt?: string
}

/** Nova's work on one message, kept on the server (queued = waiting for a free slot of the project) */
export interface NovaJob {
  state: 'queued' | 'running' | 'done' | 'failed'
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

/** one question's conversation with Nova (the last 50 messages), the job on its last message and the proposal waiting for «Tasdiqlash» */
export interface NovaThread {
  questionId?: QuestionId
  /** a stage row's «Boshqa…» box; absent = the question's own thread */
  rowKey?: string
  messages: ChatMessage[]
  job?: NovaJob
  /** the assistant message whose proposal waits for «Tasdiqlash» */
  proposalId?: string
}

/** a thread's sign in the question list; questionId '' = the general setup chat */
export interface NovaSummary {
  questionId: QuestionId | ''
  /** a stage row's «Boshqa…» box; absent = the question's own thread */
  rowKey?: string
  working: boolean
  proposal: boolean
  messages: number
}

export interface NovaConfirmResult {
  /** false = another tab had already confirmed it */
  applied: boolean
  question?: Question
  thread: NovaThread
}

/** what someone was typing in one place (per person, kept on the server) */
export interface Draft {
  scope: string
  text: string
  /** when it was typed (ISO, the page's clock) */
  at: string
}

export interface ChatRequest {
  text: string
  questionId?: QuestionId
  /** the one row (portal stage) of a map question the person writes about — "Boshqa…" in the role list */
  rowKey?: string
  lang: 'uz' | 'ru' | 'en'
  /** "Chuqurroq javob": the same question one tier up (at most Opus 5.5 high) */
  deeper?: boolean
  /** thinking mode: auto (Nova picks) | fast (Sonnet 5.5 low) | medium (Opus 5 medium) | deep (Opus 5.5 high) */
  mode?: ThinkMode
  /** «O'z so'zlaringiz bilan tushuntiring»: the person explains how it works; Nova says what it understood and proposes */
  explain?: boolean
}

// ───────────────────────────── project ─────────────────────────────

export interface Project {
  id: string // p_…
  name: string
  industry: IndustryId | null
  slug: string | null
  status: ProjectStatus
  /** where "Davom etish" lands */
  step: StepId
  stepsDone: StepId[]
  /** done steps that an upstream change made stale (needs review) */
  stale: StepId[]
  /** true when every connection is a demo connection */
  isDemo: boolean
  connections: Connection[]
  load: {
    mode: 'api' | 'file' | null
    speed: LoadSpeed
    job: Job | null
    /** the report set last (also in reports) */
    report: ImportReport | null
    doneAt: string | null
    /** every accepted export file's report by entity: files add to each other (older servers: absent) */
    reports?: Partial<Record<'leads' | 'deals', ImportReport>>
    /** uploads not in yet, oldest first */
    files?: ImportFile[]
    /** the owner's skip / period per section; a section without one is taken over the whole period (older servers: absent) */
    sections?: LoadSectionChoice[]
  }
  ui: UiId | null
  mode: 'standard' | 'scratch' | null
  pages: PageId[]
  analysis: { job: Job | null; doneAt: string | null }
  questions: { total: number; answered: number; required: number; requiredAnswered: number }
  build: { job: Job | null; url: string | null; slug: string | null; builtAt: string | null }
  createdAt: string
  updatedAt: string
}

/** GET /api/projects — light rows for lists and the home strip */
export interface ProjectSummary {
  id: string
  name: string
  industry: IndustryId | null
  status: ProjectStatus
  step: StepId
  stepsDoneCount: number
  ui: UiId | null
  pages: PageId[]
  sources: ConnectableSourceId[]
  isDemo: boolean
  url: string | null
  slug: string | null
  /** the running / paused job, if any ("~4 daqiqa qoldi") */
  activeJob: Job | null
  /** the card's cover from the project's own numbers (missing from an older API, null before the first build) */
  cover?: ProjectCover | null
  createdAt: string
  updatedAt: string
}

/** the industry's word for the first KPI (leads / patients …) and the other KPI ids of a cover */
export type CoverKpiId =
  | 'leads' | 'patients' | 'students' | 'clients' | 'buyers' | 'qualified' | 'visited' | 'lost' | 'sales' | 'won' | 'calls' | 'missed'
  | 'response' | 'orders'

export interface CoverKpi {
  id: CoverKpiId
  format: 'count' | 'percent' | 'money' | 'time'
  value: number
  /** % vs the previous equal period; null = that period had nothing */
  change: number | null
  /** a fall is good news (cancellations, missed calls, response time) */
  lowerIsBetter: boolean
  /** one value per day of the period, oldest first */
  series: number[]
}

/** the project card's cover (ProjectSummary.cover): computed by the server at every build / refresh */
export interface ProjectCover {
  /** yyyy-MM-dd */
  from: string
  to: string
  kpis: CoverKpi[]
  sources: string[]
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  /** required: the industry shapes the dashboard (features/projects/industry); "other" when none fits */
  industry: IndustryId
}

/** PATCH /api/projects/{id} — JSON merge patch of the editable fields */
export interface ProjectPatch {
  name?: string
  /** cannot be cleared; before the Pages step is opened, a new industry also replaces the pages with its recommended ones */
  industry?: IndustryId
  /** moving forward marks the previous steps done when their rules pass, else 409 STEP_LOCKED */
  step?: StepId
  ui?: UiId
  mode?: 'standard' | 'scratch'
  pages?: PageId[]
  loadSpeed?: LoadSpeed
}

// ───────────────────────────── live dashboard ─────────────────────────────

export interface LiveInfo {
  slug: string
  projectId: string
  name: string
  /** the dashboard's words and KPI order ("other" for a project made before the industry was required) */
  industry?: IndustryId
  ui: UiId
  pages: PageId[]
  isDemo: boolean
  url: string
  builtAt: string
  lastRefreshAt: string | null
  refreshable: boolean
  /** a refresh job, when one runs */
  job: Job | null
}

/** keys of the user-entered page state stored on the server for a live dashboard */
export type LiveStateKey = 'reja' | 'taqsimot' | 'hisobotSections' | 'hisobotPlans'

/**
 * GET /api/live/{slug}/dataset[?tables=leads,deals] — the same tables the 7 pages already read through useDb().
 * Field semantics: docs/build/research/frontend.md §2.6. Timestamps: epoch ms. `day`: 'YYYY-MM-DD' (Asia/Tashkent).
 */
export interface DatasetSnapshot {
  version: 1
  projectId: string
  asOf: number
  meta: SnapshotMeta
  tables: {
    staff: SnapStaff[]
    campaigns: SnapCampaign[]
    ads: SnapAdDay[]
    leads: SnapLead[]
    deals: SnapDeal[]
    calls: SnapCall[]
    payments: SnapPayment[]
    plans: SnapPlan[]
    /** chats (Telegram bot, Wazzup, Instagram, WhatsApp) — metadata only, never message text */
    conversations?: SnapConversation[]
    /** sales from a POS (Billz) */
    orders?: SnapOrder[]
    orderLines?: SnapOrderLine[]
    products?: SnapProduct[]
  }
}

export type ChatChannel = 'telegram' | 'whatsapp' | 'instagram' | 'wazzup'
export interface SnapConversation {
  id: string
  channel: ChatChannel
  /** first customer message */
  ts: number
  day: string
  last_ts: number
  manager_id: string | null
  manager: string | null
  /** matched CRM lead (phone last 9 digits or the CRM's own link) */
  lead_id: number | null
  /** seconds from the first customer message to the first reply; null = never answered */
  first_reply_sec: number | null
  messages_in: number
  messages_out: number
  /** the last message is the customer's and is older than 1 hour */
  unanswered: boolean
  /** the chat started a new lead (e.g. a bot lead) */
  is_lead: boolean
  source: string | null
}
export interface SnapOrder {
  id: string
  ts: number
  day: string
  shop: string
  seller: string | null
  status: 'paid' | 'returned' | 'cancelled'
  total: number
  discount: number
  /** cost of goods when the POS knows it (profit = total − cost) */
  cost: number | null
  method: string
  items: number
  customer_phone: string | null
  lead_id: number | null
}
export interface SnapOrderLine {
  order_id: string
  product_id: string
  qty: number
  amount: number
}
export interface SnapProduct {
  id: string
  name: string
  category: string | null
  price: number
  cost: number | null
  /** stock on hand at the last pull; null = unknown */
  stock: number | null
}

export interface SnapshotMeta {
  name: string
  portal: string
  portalUrl?: string
  timezone: 'Asia/Tashkent'
  currency: string
  usdUzs: number
  /** where usdUzs comes from: the Central Bank (rateDay's rate), its last known rate, the owner's own, the built-in default */
  rateSource?: 'cbu' | 'fallback' | 'manual' | 'config'
  /** yyyy-MM-dd of the Central Bank rate */
  rateDay?: string
  dataStart: number
  /** true only for generated demo data (enables "today" scaling in Kampaniyalar) */
  synthetic: boolean
  sources: {
    crm: boolean
    telephony: 'bitrix' | 'onlinepbx' | null
    meta: boolean
    chats?: ChatChannel[]
    pos?: boolean
    /** each table's connected systems (kind: bitrix24 / amocrm / onlinepbx / moizvonki / bitrix (the portal's telephony) / meta / sheets / billz / wazzup …; name: the connection's own); absent in older snapshots */
    tables?: Partial<Record<string, { kind: string; name?: string }[]>>
  }
  pages: PageId[]
  leadStageLabels: Record<'new' | 'contact' | 'qualified' | 'booked' | 'visited' | 'won' | 'lost' | 'junk', string>
  leadSources: string[]
  callSources: string[]
  paidSources: string[]
  /** portal: the CRM's stage name when label is the owner's own name for it */
  dealStages: { label: string; status: 'open' | 'won' | 'lost'; kelishuv: boolean; portal?: string }[]
  /** stage groups labelled with the owner's own name for a stage: group key → the portal's stage name */
  /** the real lead stages in Bitrix SORT order, each its own bucket (stage table, Bosqich filter); absent in older snapshots */
  leadStages?: { label: string; group: LeadStageKey; portal?: string }[]
  leadStagePortal?: Partial<Record<'new' | 'contact' | 'qualified' | 'booked' | 'visited' | 'won' | 'lost' | 'junk', string>>
  workEndHour?: number
  /** the portal's own (UF_) lead / deal fields the snapshot carries in `uf` (live filters' "Bitrix maydonlari") */
  fields?: SnapField[]
  /** the portal's own fields no row has a value in: the "+ Filtr" picker lists them too (every field of the portal) */
  emptyFields?: SnapField[]
  /** load sections the owner skipped: their pages say "Bu bo'lim yuklanmagan" instead of showing zeros */
  skipped?: LoadSectionId[]
  /** false = the business has no visits: the visit cards are hidden and a lead's `visited` is its success (absent = shown) */
  visits?: boolean
  /** false = the owner hasn't chosen the "Sifatli lid" stages: the card says "Belgilanmagan" instead of 0 (absent = chosen) */
  qualifiedSet?: boolean
  /** the Meta ad accounts' time zones that are not Tashkent's UTC+5 (Meta's days are theirs) */
  adTimezones?: string[]
}

/** A custom Bitrix field: `code` keys `uf` on the rows of `entity`; `type` is the filter control it gets. */
export interface SnapField {
  entity: 'lead' | 'deal'
  code: string
  title: string
  type: 'list' | 'date' | 'number' | 'text' | 'bool'
}
/** a custom field's value: an enum item's text, a number, true / false, an ISO date (date fields), or a list (multi) */
export type UfValue = string | number | boolean | string[] | null

export interface SnapStaff {
  id: string
  name: string
  role: string
  sales: boolean
  branch?: string
  vacation?: { from: string; to: string } | null
  weekly_off?: number[]
  share?: number
  hue?: number
  /** dismissed in the portal ("ishdan ketgan") */
  fired?: boolean
}
export interface SnapCampaign {
  id: string
  name: string
  platform: string
  objective: 'Lid forma' | 'Xabarlar' | 'Trafik'
  status: 'Faol' | "To'xtatilgan"
}
export interface SnapAdDay {
  day: string
  campaign_id: string
  campaign: string
  adset: string
  creative: string
  spend_usd: number
  /** the spend in so'm at that day's rate (the Central Bank's, or the owner's own); absent in older snapshots */
  spend_uzs?: number
  impressions: number
  clicks: number
  leads: number
  ad_id?: string
  thumb?: string
  link?: string
  currency?: string
  spend?: number
  unconverted?: boolean
}
export type LeadStageKey = 'new' | 'contact' | 'qualified' | 'booked' | 'visited' | 'won' | 'lost' | 'junk'
export interface SnapLead {
  id: number
  ts: number
  day: string
  name: string
  phone: string
  source: string
  campaign_id: string | null
  campaign: string | null
  manager_id: string
  manager: string
  stage: LeadStageKey
  /** the lead's real Bitrix stage (the owner's own name for it when he gave one); absent in older snapshots */
  stage_name?: string
  qualified: boolean
  /** why a qualified lead counts: the first chosen stage it reached, or '@deal' / '@booked'; absent when not qualified */
  qualified_by?: string
  /** when it first entered that stage (stage history); absent when the history does not show it */
  qualified_ts?: number | string
  booked: boolean
  visited: boolean
  reason: string | null
  first_response_sec: number | null
  /** when a won / lost / junk lead closed (DATE_CLOSED / stage history); absent for an open lead and in older snapshots */
  closed_ts?: number | null
  /** an archive stage ("Sandiq"): stage 'lost', kept out of "Bekor bo'ldi" */
  archived?: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  adset?: string
  creative?: string
  form_name?: string
  platform?: string
  uf?: Record<string, UfValue>
}
export interface SnapDeal {
  id: number
  lead_id: number | null
  ts: number
  day: string
  manager: string
  product: string
  source: string
  status: 'won' | 'lost' | 'open'
  closed_ts: number | null
  /** the Tashkent day of closed_ts; absent in older snapshots */
  closed_day?: string | null
  amount: number
  stage: string
  reason: string | null
  /** the stage history shows it reached "Kelishuv" (also when it later moved on); absent = no history, judge by stage */
  kelishuv?: boolean
  uf?: Record<string, UfValue>
}
export interface SnapCall {
  id: number | string
  ts: number
  day: string
  hour: number
  direction: 'in' | 'out'
  operator_id: string
  operator: string
  status: 'answered' | 'short' | 'missed'
  duration_sec: number
  wait_sec: number
  phone: string
  lead_id: number | null
  recorded: boolean
  record_url?: string
  /** why it did not connect (Bitrix CALL_FAILED_CODE) */
  fail_code?: string
  /** the system the call comes from: bitrix (the portal's telephony) / amocrm / onlinepbx / moizvonki / a table source; absent in older snapshots */
  provider?: string
}
export interface SnapPayment {
  id: number
  deal_id: number
  ts: number
  day: string
  amount: number
  method: string
  kind: 'first' | 'repeat'
  manager_id: string
  manager: string
  product: string
}
export interface SnapPlan {
  month: string
  manager_id: string
  manager: string
  target_amount: number
}

// ───────────────────────────── Data365 portfolio (Loyihalar) ─────────────────────────────

/** Data365's own working projects. Internal view: real project names are allowed here (owner's decision 2026-10-20). */
export interface PortfolioProject {
  id: string
  name: string
  kind: PortfolioKind
  industry: string
  /** paused exists only through staff edits (PATCH /portfolio/{id}) */
  status: PortfolioStatus
  pages: string[]
  sources: string[]
  stack: string
  deploy: string
  lastCommit: string
  users?: number
  usersAsOf?: string
  /** a runnable copy inside Studio (uis/), opened at /ui/<id> */
  copyInStudio?: 'klassik' | 'statistik' | 'kompakt' | null
  description: string
  /** the project's live address (http/https), pasted once by Data365 staff — PUT/DELETE /portfolio/{id}/url */
  url?: string
  /** ISO time the url was last saved by staff (absent for portfolio.json's own addresses) */
  urlUpdatedAt?: string
  /** false = portfolio.json's address was guessed and nobody confirmed it yet (saving it confirms); absent = confirmed */
  urlConfirmed?: boolean
  /** Data365's own internal tool ("Ichki"), not a client dashboard */
  internal?: boolean

  // Edit → GitHub → Deploy (Data365.Edit reads these; Edit:Projects:<id> config overrides them)
  /** the local git folder (absolute); Studio only reads it, edits happen in a copy */
  folder?: string
  /** origin URL, no credentials */
  gitRemote?: string
  /** the default branch */
  branch?: string
  deployKind?: EditDeployKind
  /** the deploy script relative to the repo root when it is not deploy.sh */
  deployScript?: string
  /** a push to the default branch deploys the live site by itself (CI) */
  autoDeployOnPush?: boolean
  /** may be changed from the "Tahrirlash" tab */
  editable?: boolean
  /** why it is not editable, or (when editable) why deploy is blocked — Uzbek */
  editBlockedReason?: string
  /** something to know about the repo (another GitHub account, work on a side branch …) — Uzbek */
  gitNote?: string
  /** the live server's ssh host (an ssh alias or user@host) where the code's git checkout lives (owner only) */
  serverSsh?: string
  /** that checkout's absolute folder on the server (owner only) */
  serverRepoDir?: string
  /** C# ServerAccessModes — what Nova may do on that server, set by the owner (absent = the settings' default) */
  serverAccess?: ServerAccessMode
}

/** C# ServerAccessModes: «Nova serverda: Faqat o'qish | To'liq ruxsat» */
export type ServerAccessMode = 'read' | 'full'

/** one command / SQL Nova ran on a project's server with full access (C# EditServerAction) */
export interface EditServerAction {
  at: string
  tool: 'server_exec' | 'data_exec'
  /** the command or SQL, secrets masked */
  text: string
  database?: string
  /** absent: refused before running, or never answered */
  exitCode?: number | null
  refused?: string
  /** data_exec: the backup made before the run's first write */
  backup?: string
  who?: string
  sessionId?: string
}

/** GET /api/portfolio/{id}/edit/server-access (owner only) */
export interface EditServerAccess {
  mode: ServerAccessMode
  /** full access can never be turned on for this project */
  locked: boolean
  /** newest first */
  actions: EditServerAction[]
}

export type PortfolioKind = 'dashboard' | 'erp' | 'camera' | 'bot' | 'website' | 'other'
/** down = should be live but the server does not answer */
export type PortfolioStatus = 'live' | 'down' | 'paused' | 'sample' | 'archived'

/** POST /portfolio (name required) and PATCH /portfolio/{id} (only the fields sent change; url '' or null clears the link) */
export interface PortfolioProjectInput {
  name?: string
  kind?: PortfolioKind
  status?: PortfolioStatus
  industry?: string
  description?: string
  stack?: string
  deploy?: string
  pages?: string[]
  sources?: string[]
  url?: string | null
  /** https://github.com/owner/name; '' clears it (making / linking a repository goes through POST /portfolio/{id}/github) */
  gitRemote?: string
  /** '' clears */
  serverSsh?: string
  serverRepoDir?: string
}

/** real = counted from the project's server logs; sample = illustrative figures (always shown as "namuna"); none = nothing yet */
export type PortfolioUsageQuality = 'real' | 'sample' | 'none'

/** "Nimani bilamiz" notes; the wording lives in i18n/dict/portfolio-usage.ts */
export type PortfolioUsageNote =
  | 'from-logs'
  | 'opens-daily'
  | 'counts-only'
  | 'people-approx'
  | 'filters-unknown'
  | 'no-daily'
  | 'sample-figures'
  | 'real-later'

/** why the last daily collection failed (the previous numbers stay) */
export type PortfolioUsageCollectorError = 'unreachable' | 'timeout' | 'empty' | 'invalid'

/**
 * The daily usage collector of a project (apps/api …/Portfolio/Usage/collectors.json): Studio reads the project server's
 * request log by itself every day. POST /portfolio/{id}/usage/refresh collects now (429 TOO_SOON within 2 minutes;
 * 502 UNREACHABLE / 504 TIMEOUT with params.reason = PortfolioUsageCollectorError).
 */
export interface PortfolioUsageCollector {
  auto: true
  /** ISO time of the last attempt (worked or not) */
  lastRun: string | null
  /** ISO time of the last attempt that stored new numbers */
  lastOk: string | null
  /** set when the last attempt failed */
  lastError: PortfolioUsageCollectorError | null
}

/** GET /portfolio/usage row — one per visible portfolio project */
export interface PortfolioUsageSummary {
  id: string
  name: string
  kind: PortfolioKind
  status: PortfolioStatus
  quality: PortfolioUsageQuality
  /** different people over the whole period */
  people: number | null
  /** how many times it was opened */
  entries: number | null
  /** different people in the last 7 days */
  weeklyActive: number | null
  /** roughly how many people have access */
  seats: number | null
  /** yyyy-MM-dd the numbers were collected */
  asOf: string | null
  sections: number
  /** null when the project has no daily collector */
  collector: PortfolioUsageCollector | null
  /** different people today (Tashkent) when the snapshot covers today; null otherwise */
  today?: number | null
  /** yyyy-MM-dd of the last day anyone used it */
  lastActive?: string | null
  /** people per day over the 14 days up to the snapshot's last day, oldest first */
  trend?: number[]
}

/** GET /portfolio/health — the live up/down check of each project's address (every 5 minutes) */
export interface PortfolioHealth {
  id: string
  /** none = no live address; checking = not checked yet since the server started */
  state: 'up' | 'down' | 'none' | 'checking'
  code?: number | null
  ms?: number | null
  reason?: 'timeout' | 'dns' | 'tls' | 'refused' | 'http-5xx' | 'private' | 'error' | null
  checkedAt?: string | null
  lastUpAt?: string | null
}

export interface PortfolioUsageDay {
  date: string
  users: number
  calls: number
}
export interface PortfolioUsageSub {
  name: string
  users: number
  calls: number
}
export interface PortfolioUsageSection {
  key: string
  name: string
  users: number
  calls: number
  subs: PortfolioUsageSub[]
}

/** GET /portfolio/{id}/usage (404 when the project has no usage data); PUT takes the collector's file shape */
export interface PortfolioUsageDetail {
  id: string
  quality: Exclude<PortfolioUsageQuality, 'none'>
  source: string
  note: string | null
  asOf: string | null
  importedAt: string | null
  people: number | null
  entries: number | null
  weeklyActive: number | null
  seats: number | null
  days: PortfolioUsageDay[]
  /** most-used first; parts likewise */
  sections: PortfolioUsageSection[]
  notes: PortfolioUsageNote[]
  /** null when the project has no daily collector */
  collector: PortfolioUsageCollector | null
}

// ───────────────────────────── AI connection (status, own key) and the app-wide assistant ─────────────────────────────

/** what should answer: auto = API key if one is set, else the local Claude Code login, else the free built-in answerer */
export type AiProvider = 'auto' | 'cli' | 'api' | 'none'

/** GET/POST/DELETE /api/ai/cli/login — the Claude Code sign-in started from Studio (only the URL and a short state) */
export interface AiCliLogin {
  state: 'idle' | 'waiting' | 'done' | 'failed' | 'expired'
  url?: string
  expiresAt?: string
  error?: 'no_cli' | 'no_url' | 'rejected' | 'timeout' | 'logout' | 'expired'
  /** whose sign-in this is ("AI akkauntlar") */
  provider?: AiAccountId
  /** a device sign-in's one-time code, typed on the provider's page (ChatGPT) */
  userCode?: string
  /** true: a code is pasted back here (Claude, Gemini) */
  needsCode?: boolean
}

export type AiAccountId = 'claude' | 'chatgpt' | 'gemini'

/** one provider row of "AI akkauntlar" (GET /api/ai/accounts) */
export interface AiAccount {
  id: AiAccountId
  /** its CLI is on the server */
  installed: boolean
  loggedIn: boolean
  /** masked e-mail */
  account: string | null
  model: string
  models: string[]
  /** the one install command when the CLI is missing */
  install?: string
  /** Nova can answer through it today (false = "tez orada") */
  ready: boolean
}

/** GET / PUT /api/ai/accounts */
export interface AiAccounts {
  /** the provider the owner chose for Nova */
  active: AiAccountId
  /** what actually answers now (Claude until the others can) */
  answering: AiAccountId
  providers: AiAccount[]
  login: AiCliLogin
}

export interface AiAccountsPatch {
  active?: AiAccountId
  provider?: AiAccountId
  model?: string
}

/** GET /api/ai/status */
export interface AiStatus {
  /** what answers right now */
  active: 'cli' | 'api' | 'none'
  preference: AiProvider
  cli: {
    found: boolean
    version: string | null
    loggedIn: boolean
    /** e.g. "max", "pro" (from `claude auth status`) */
    plan: string | null
    /** masked e-mail, e.g. a***@gmail.com */
    account: string | null
    authMethod: string | null
  }
  api: {
    configured: boolean
    /** sk-ant-…ABCD */
    masked: string | null
    /** where the key comes from: saved in Studio, or the ANTHROPIC_API_KEY environment variable */
    source: 'settings' | 'env' | null
    model: string
    lastCheck: { ok: boolean; at: string; error?: ErrorCode } | null
  }
  /** optional model override for the Claude Code path; null = Claude Code's default */
  cliModel: string | null
  /** last subscription meters reported by the Claude CLI; absent until known */
  usage?: AiUsage
}

/** subscription meters (0..1) from the CLI's rate_limit_event */
export interface AiUsage {
  fiveHour: number | null
  sevenDay: number | null
  status: 'allowed' | 'allowed_warning' | 'rejected' | null
  resetsAt: string | null
  at: string
}

/** how much model a question got — Nova's router (free = built-in answerer; light = Sonnet 5 low; standard = Sonnet 5.5 medium, or low in fast mode; strong = Opus 5 medium; deep = Opus 5.5 high) */
export type ModelTier = 'free' | 'light' | 'standard' | 'strong' | 'deep'

/** the thinking-mode switch: auto = Nova picks per question; fast = Sonnet 5.5 low; medium = Opus 5 medium; deep = Opus 5.5 high */
export type ThinkMode = 'auto' | 'fast' | 'medium' | 'deep'

/**
 * What the person sees right now, collected in the browser when a question is sent (≈3 KB max). Never contains
 * passwords, keys, tokens, phone numbers, e-mails or customer rows (masked/skipped at capture and again on the server).
 */
export interface ScreenSnapshot {
  /** the page title (h1) */
  title?: string
  /** wizard eyebrow, e.g. "Qadam 1 · Nom" */
  step?: string
  headings?: string[]
  lead?: string
  /** option groups (chips, radios, checkboxes, segmented controls) with what is selected */
  groups?: { label: string; multi?: boolean; options: { label: string; selected: boolean; disabled?: boolean }[] }[]
  fields?: { label: string; value?: string; placeholder?: string; hint?: string; error?: string; required?: boolean }[]
  buttons?: { label: string; disabled?: boolean; reason?: string; primary?: boolean }[]
  /** open dialogs / sheets (titles) other than Nova's own panel */
  dialogs?: string[]
  /** visible toasts / alerts */
  alerts?: string[]
  /** dashboard KPI tiles */
  tiles?: { label: string; value: string }[]
  /** facts a page registers itself (useAiFacts), e.g. the Name step's draft and what each industry option means */
  facts?: Record<string, unknown>
  /** the last ~10 UI events, newest last */
  recentActions?: { secondsAgo: number; kind: 'route' | 'click' | 'focus' | 'toast' | 'error'; label: string }[]
  /** where things are on screen, e.g. {left: 'menu', main: '…', right: 'Nova'} */
  layout?: Record<string, string>
}

/** PUT /api/ai/settings — apiKey: a new key to save (encrypted), null removes the saved key, omitted = unchanged */
export interface AiSettingsPatch {
  preference?: AiProvider
  apiKey?: string | null
  apiModel?: string
  cliModel?: string | null
}

/** POST /api/ai/test {provider?} — a tiny real question through the chosen (or active) provider */
export interface AiTestResult {
  ok: boolean
  provider: 'cli' | 'api' | 'none'
  latencyMs: number
  reply: string | null
  error: ErrorCode | null
}

/** where the person is when asking the app-wide assistant */
export interface AssistantContext {
  projectId?: string
  slug?: string
  page?: PageId
  /** the hash route, e.g. /loyihalar */
  route?: string
  /** what is on screen right now */
  screen?: ScreenSnapshot
}

/** POST /api/assistant/messages (JSON) and POST /api/assistant/messages/stream (server-sent events) */
export interface AssistantRequest {
  text: string
  context: AssistantContext
  lang: 'uz' | 'ru' | 'en'
  /** "Chuqurroq javob": the same question one tier up (at most Opus 5.5 high) */
  deeper?: boolean
  /** thinking mode (default auto) */
  mode?: ThinkMode
  /** the text was spoken and transcribed verbatim by Gemini */
  voice?: { original: string; lang?: string; mode?: 'dictation' | 'live'; callId?: string }
  /** pictures / small files sent with this message (≤ 3, 5 MB each; features/blockedit/attach.ts); thumb = what the message keeps */
  attachments?: AssistantAttachment[]
}

/** one picture or file of a Nova message: base64 bytes (no data: prefix) for this request only, and a picture's small thumbnail */
export interface AssistantAttachment {
  name: string
  data: string
  thumb?: string
}

/** what a person's Nova message keeps of an attachment (never the bytes) */
export interface AssistantFile {
  kind: 'image' | 'file'
  name: string
  size: number
  thumb?: string
}

/**
 * Events of POST /api/assistant/messages/stream (text/event-stream; event name = type):
 * seen → route → instant? → delta* → action* → done, or error at any point. route.reasons may include
 * 'instant_answer' (status / which page, no model), 'mode', 'chit_chat', 'analysis', 'voice_live', 'action_confirm'
 * (a short "ha" / "yo'q" ran or dropped the proposed change). done.spoken / error.spoken: only in a live voice conversation.
 */
export type AssistantStreamEvent =
  /** a one-line summary of what Nova received about the screen (shown at once) */
  | { type: 'seen'; summary: string }
  /** the router's choice */
  | { type: 'route'; tier: ModelTier; model: string | null; effort: 'low' | 'medium' | 'high' | null; reasons: string[] }
  /** an instant answer from the free built-in answerer while the model still works (may be followed by deltas) */
  | { type: 'instant'; text: string }
  /** the next piece of the answer text */
  | { type: 'delta'; text: string }
  /** both saved messages (the person's and Nova's) */
  | { type: 'done'; user: AssistantMessage; reply: AssistantMessage; spoken?: string }
  | { type: 'error'; code: ErrorCode; params?: Record<string, string | number>; spoken?: string }
  /** something Nova wants to do: navigate runs at once; the rest wait for the person's "Tasdiqlash" */
  | { type: 'action'; action: NovaAction }

/**
 * Nova's permissions. navigate = open a page (runs at once, only routes the person may open);
 * refresh_live / start_load = changes that run only after "Tasdiqlash" (POST /api/assistant/actions/{id}).
 */
export type NovaAction =
  | { id: string; kind: 'navigate'; to: string; label: string }
  | { id: string; kind: 'refresh_live'; slug: string; label: string; needsConfirm: true }
  | { id: string; kind: 'start_load'; projectId: string; label: string; needsConfirm: true }
  /** where the dashboard's stages come from: 'report' («Стадия (для отчетов)») or 'crm' (Bitrix's own); saves + rebuilds */
  | { id: string; kind: 'report_stage'; projectId: string; option: 'report' | 'crm'; label: string; needsConfirm: true }
  /** create a project (runs at once: it only adds); then Nova opens its next step */
  | { id: string; kind: 'create_project'; name: string; industry?: string; label: string }
  /** on the page the person is on: type a value into the field with this label (runs at once, never a password/secret) */
  | { id: string; kind: 'fill'; field: string; value: string; label: string }
  /** choose an option (chip/radio/tab/select item) by its visible text, optionally inside a group by its label */
  | { id: string; kind: 'choose'; option: string; group?: string; label: string }
  /** press a button by its visible name; destructive names (o'chirish, delete, удалить…) always need confirmation */
  | { id: string; kind: 'press'; button: string; label: string; needsConfirm?: boolean }
  /**
   * owner only: open a Data365 project's "Tahrirlash" tab (#/loyihalar/<projectId>?tab=edit&request=…, runs at once) with
   * the request in the box — the owner starts it. publish = the owner asked to push / deploy / roll back: Nova never does
   * it, the owner presses "Qo'llash (GitHub)" / "Nashr qilish (serverga)" / "Orqaga qaytarish" and types the confirmation.
   */
  | { id: string; kind: 'edit_project'; projectId: string; request?: string; publish?: NovaEditStep; label: string }

/** the edit step an owner asked Nova for and must do themselves (NovaAction edit_project.publish) */
export type NovaEditStep = 'apply' | 'deploy' | 'rollback'

/** POST /api/assistant/actions/{id} → the result of a confirmed action */
export interface NovaActionResult {
  ok: boolean
  message: string
  /** a page to open after the action, e.g. the job progress page */
  to?: string
}

/** GET /api/assistant/messages?thread=global|p:<projectId>|l:<slug> → AssistantMessage[] (oldest first) */
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: string
  source?: 'claude' | 'fallback'
  thread: string
  /** what the router chose (assistant messages) */
  tier?: ModelTier
  /** the model id that answered, e.g. claude-sonnet-5-5; absent for the free answerer */
  model?: string
  /** actions Nova proposed with this answer (navigate ones already ran) */
  actions?: NovaAction[]
  /** on the person's message: it was spoken (mic badge) — dictated or said in a live conversation, with the exact words */
  voice?: { mode: 'dictation' | 'live'; original: string }
  /** on the person's message: the pictures / files sent with it */
  files?: AssistantFile[]
}

/**
 * POST /api/assistant/prewarm — the panel opened, typing started or "Hey Nova" fired: keep a ready Claude process for
 * this mode (signed-in owner on the subscription only; anyone else gets { warm: false }). voice 'live' warms the capped
 * live-conversation model.
 */
export interface AssistantPrewarmRequest {
  mode?: ThinkMode
  voice?: 'dictation' | 'live'
}

export interface AssistantPrewarmResult {
  warm: boolean
  /** the model / effort the warm process runs, when warm */
  model?: string
  effort?: 'low' | 'medium' | 'high'
}

// ───────────────────────────── Nova's voice (Gemini = ears and mouth only) ─────────────────────────────

/** GET /api/voice/status */
export interface VoiceStatus {
  gemini: { configured: boolean; masked: string | null; lastCheck: { ok: boolean; at: string; error?: ErrorCode } | null }
  /** gemini = live transcription; browser = Chrome/Edge Web Speech fallback; none */
  stt: 'gemini' | 'browser' | 'none'
  tts: 'gemini' | 'none'
  /**
   * live conversation (auto end-of-speech + spoken answers) for THIS person: gemini = the key works and they may use it
   * (the owner always; a colleague while liveForMembers); none otherwise. Always sent by the server.
   */
  live?: 'gemini' | 'none'
  /** the owner's switch: colleagues may use live conversation (PUT /api/voice/settings {liveForMembers}) */
  liveForMembers?: boolean
  /** the privacy notice live conversation needs (null for nobody signed in); show it once, then POST /api/voice/notice */
  notice?: VoiceNotice | null
}

/** what live conversation does with the voice; accepted once per person and version */
export interface VoiceNotice {
  version: number
  /** this person accepted this version */
  accepted: boolean
  /** uz: "Jonli suhbatda mikrofon ochiq turadi va ovozingiz Google Gemini'ga uzatiladi; javoblarni Claude tayyorlaydi; matn Nova tarixida saqlanadi, audio saqlanmaydi." */
  text: { uz: string; ru: string; en: string }
}

/**
 * GET /api/voice/siri-shortcut/status?base=<origin + path> (owner). available: this server can sign the "Nova" shortcut for
 * Siri (macOS with the `shortcuts` command), so GET /api/voice/siri-shortcut?base=… returns Nova.shortcut; otherwise
 * only the manual steps are shown. link: what the shortcut opens (<base>#/?nova=live).
 */
export interface SiriShortcutStatus {
  available: boolean
  link: string
}

/** POST /api/voice/notice → VoiceStatus; only the current notice.version is accepted (else 400 VALIDATION) */
export interface VoiceNoticeAccept {
  version: number
}

/** PUT /api/voice/settings (owner) — geminiKey: a new key (stored encrypted), null removes it, omitted = unchanged */
export interface VoiceSettingsPatch {
  geminiKey?: string | null
  /** let colleagues use live conversation; omitted = unchanged */
  liveForMembers?: boolean
}

/** push-to-talk = today's dictation (send activityStart / activityEnd); conversation = Gemini detects the end of speech */
export type VoiceSessionMode = 'push-to-talk' | 'conversation'

/**
 * Optional body of POST /api/voice/session (no body = push-to-talk). conversation needs: a person signed in (401),
 * the owner or liveForMembers (403 VOICE_LIVE_DISABLED), the notice accepted (412 VOICE_NOTICE_REQUIRED {version}),
 * and is limited to 4 tokens a minute and 40 (owner) / 15 (colleague) a UTC day (429 UNREACHABLE
 * {service: 'voice', reason: 'rate_limited' | 'daily_limit', retryAfterSec}). Reconnect with a fresh token before
 * expiresAt (each socket lasts ≤ 10 min).
 */
export interface VoiceSessionRequest {
  mode?: VoiceSessionMode
}

/** POST /api/voice/session — a one-use, short-lived token for the browser's direct live-transcription socket */
export interface VoiceSession {
  token: string
  model: string
  /** v1beta constrained WebSocket endpoint, without the token */
  wsUrl: string
  expiresAt: string
  languageCodes: string[]
  /** custom words (manager names, sections, CRM terms), ≤ 100 */
  vocabulary: string[]
  /** the mode locked into the token */
  mode?: VoiceSessionMode
  /** conversation only: the silence (ms) that ends a turn; absent = Gemini's default (~800 ms) */
  silenceMs?: number
}

/**
 * POST /api/voice/speak → audio/wav (Gemini text-to-speech; reads a whole answer aloud — "Tinglash").
 * POST /api/voice/speak/stream → one sentence of a live answer, streamed as Gemini makes it: raw little-endian 16-bit
 * mono PCM at 24 kHz (Content-Type audio/L16;rate=24000;channels=1, header X-Sample-Rate: 24000), chunked. The text
 * is made voice-ready on the server (markdown gone, units and Uzbek numbers as words, ≤ 400 chars + "Batafsil
 * ekranda."). Abort the fetch to stop (barge-in) — the server stops Gemini too. Errors before the first byte are
 * normal JSON ApiErrors (409 GEMINI_NOT_CONFIGURED, 400 VALIDATION, 422 GEMINI_KEY_INVALID, 429/503 UNREACHABLE,
 * 502, 504 TIMEOUT); a stream that breaks later just ends early. 90 sentences a minute per person.
 */
export interface SpeakRequest {
  text: string
  lang: 'uz' | 'ru' | 'en'
}

// ───────────────────────────── sign-in, colleagues, and the Claude connector ─────────────────────────────
// Studio needs a sign-in before it goes on a server. Each person can also connect Studio to THEIR OWN Claude
// (claude.ai / Desktop / phone app as a custom connector, or Claude Code) — their own subscription does the thinking.

/**
 * owner = everything incl. AI settings, keys and users; member = projects and dashboards only; editor ("Muharrir") = a
 * member who may also change Data365 projects' code (Tahrirlash: their own sessions, apply = push to GitHub) — deploy,
 * rollback, the portfolio's data and users stay the owner's
 */
export type UserRole = 'owner' | 'member' | 'editor' | 'manager'

export interface AuthUser {
  id: string // u_…
  email: string
  name: string
  role: UserRole
  disabled: boolean
  createdAt: string
  lastLoginAt?: string
}

/** GET /api/auth/me (anonymous allowed) */
export interface AuthMe {
  user: AuthUser | null
  /** true while no user exists: the first visitor creates the owner (POST /api/auth/setup) */
  needsSetup: boolean
  /** false when sign-in is turned off on the server (every request acts as the owner) */
  signInEnabled: boolean
}

/** POST /api/auth/login → AuthMe (sets an HttpOnly session cookie); POST /api/auth/logout */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * POST /api/auth/setup (only while no user exists) → AuthMe. Accepted only from the server itself (localhost) or with
 * `setupCode`; otherwise 403 FORBIDDEN params.reason = "setupCode".
 */
export interface SetupRequest {
  name: string
  email: string
  password: string
  /** The one-time first-run code from the server's log ("First-run setup code: …") or Auth:SetupCode. */
  setupCode?: string
}

/** POST /api/users (owner) → UserCreated; GET /api/users → AuthUser[]; PATCH /api/users/{id} → AuthUser */
export interface UserCreateRequest {
  name: string
  email: string
  role?: UserRole
  /** omitted → a one-time temporary password is generated and returned once */
  password?: string
}
export interface UserCreated {
  user: AuthUser
  tempPassword?: string
}
export interface UserPatch {
  name?: string
  role?: UserRole
  disabled?: boolean
  password?: string
  /** required when a user changes their own password */
  currentPassword?: string
}

/** a personal token (for Claude Code) or an OAuth grant (claude.ai / Desktop / phone connector) */
export interface AccessTokenInfo {
  id: string
  kind: 'pat' | 'oauth'
  label: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  /** e.g. "data365.read" or "data365.read data365.write" */
  scope?: string
}

/** POST /api/connector/tokens → AccessTokenCreated (token shown once); GET /api/connector/tokens → AccessTokenInfo[]; DELETE /api/connector/tokens/{id} */
export interface PatCreateRequest {
  label: string
  /** 1–365, default 90 */
  days?: number
  /** true = the token may also make changes (data365.write); default read-only */
  write?: boolean
}
export interface AccessTokenCreated {
  info: AccessTokenInfo
  token: string
}

/** GET /api/connector — how to connect Studio to your own Claude */
export interface ConnectorInfo {
  /** the public MCP URL to paste into claude.ai (Customize → Connectors → Add custom connector); null until Studio is public over https */
  publicUrl: string | null
  /** for Claude Code on this computer, e.g. http://localhost:5190/mcp */
  localUrl: string
  claudeAiReady: boolean
  /** the tool names Claude gets */
  tools: string[]
}

// ───────────────────────────── edit (owner only): change a Data365 project with Claude Code ─────────────────────────────
// Studio makes a fresh COPY of the project's git repo (never touches the local folder), Claude Code edits the copy, the
// project builds and a local preview runs; then apply (commit → merge into the default branch → push), deploy and rollback
// with typed confirmations. C# mirror: Core/Contracts/Edit.cs.

export type EditStatus =
  | 'preparing' | 'chat' | 'editing' | 'building' | 'ready' | 'failed'
  | 'applying' | 'applied' | 'deploying' | 'deployed'
  | 'rolling_back' | 'rolled_back' | 'discarded'

export type EditDeployKind = 'script' | 'push' | 'railway' | 'vercel' | 'none'

export type EditErrorCode =
  | 'EDIT_NOT_ALLOWED' | 'EDIT_BUSY' | 'EDIT_BUILD_FAILED' | 'EDIT_PUSH_FAILED' | 'EDIT_DEPLOY_FAILED' | 'EDIT_CONFIRM_REQUIRED'
  /** session errors only: Claude Code failed / timed out, the copy could not be made, the server restarted mid-work */
  | 'EDIT_AGENT_FAILED' | 'EDIT_PREPARE_FAILED' | 'EDIT_INTERRUPTED'
  /** session error only: "Joylash" stopped before any push (GitHub / the server could not be checked, or the server's changes were not confirmed) */
  | 'EDIT_PUBLISH_STOPPED'
  /** session error only: the server's own changes and GitHub's changed the same lines (`error.files`); «Nova hal qilsin» resolves it */
  | 'EDIT_SERVER_CONFLICT'
  /** «Sinov havolasi»: the link is unknown, expired or revoked (410) · too many answers for now (429) */
  | 'EDIT_SHARE_EXPIRED' | 'EDIT_SHARE_TOO_MANY'

/** C# EditPublishStepKeys: "Joylash" in order */
export type EditPublishStepKey = 'server' | 'github' | 'push' | 'deploy' | 'check'
export type EditPublishStepState = 'waiting' | 'running' | 'done' | 'failed' | 'skipped'

export interface EditPublishStep {
  key: EditPublishStepKey
  state: EditPublishStepState
  /** ISO */
  startedAt?: string
  /** ISO */
  endedAt?: string
}

/** C# EditPublishProgress: "Joylash" step by step, from «Tasdiqlash» until it ends (kept after it) */
export interface EditPublishProgress {
  /** ISO */
  startedAt: string
  /** ISO; absent while it runs */
  endedAt?: string
  /** ended: whether the change reached the site */
  ok?: boolean
  /** the project's previous successful Joylash took this long (seconds); absent = none yet */
  estimateSeconds?: number
  steps: EditPublishStep[]
  /** waits for another deploy of the same project to end */
  waiting?: boolean
}

export interface EditCommit {
  sha: string
  /** ISO */
  date: string
  subject: string
}

/** GET /api/portfolio/{id}/edit/info */
export interface EditInfo {
  editable: boolean
  /** why not editable, or why deploy is blocked */
  reason?: string
  /** the local folder (read only for Studio) */
  folder: string
  /** the default branch the edit is based on and merged into */
  branch: string
  /** origin URL, credentials stripped */
  remote: string
  /** uncommitted paths in the local folder — NOT part of the copy */
  dirtyFiles: number
  /** local commits that are not on GitHub (they stay out of the copy and the push) */
  unpushedCommits?: number
  lastCommit: EditCommit | null
  deployKind: EditDeployKind
  autoDeployOnPush: boolean
  liveUrl?: string
  deployNote?: string
}

export interface EditTurn {
  request: string
  /** Claude Code's summary in the request's language; '' while it runs */
  summary: string
  /** ISO */
  at: string
}

export interface EditFile {
  path: string
  added: number
  removed: number
  status: 'added' | 'modified' | 'deleted' | 'renamed'
}

export interface EditLiveCheck {
  ok: boolean
  /** HTTP status, 0 = no answer */
  status: number
  /** ISO */
  at: string
}

/** GET /api/edits/{sid}; POST /api/portfolio/{id}/edits → EditSession; GET /api/portfolio/{id}/edits → EditSession[] (newest first) */
export interface EditAuthor {
  id: string
  name: string
  /** their role when they wrote (absent: sign-in off, or older records) */
  role?: string
}

/** PATCH /api/edits/{sid} — rename a chat: trimmed, 1–80 chars, no < > or control characters (400 VALIDATION field title); its author or the owner */
export interface EditRenameRequest {
  title: string
}

export interface EditOverlap {
  sessionId: string
  author?: EditAuthor
  files: string[]
}

/** C# EditCodeVerdicts: which copy of the code is newest */
export type EditCodeVerdict = 'same' | 'mac' | 'github' | 'diverged' | 'unknown' | 'no_remote'

/**
 * GET /api/portfolio/{id}/edit/state[?refresh=1] ("Kod holati"): the Mac folder vs GitHub vs the open Studio edits. Read only
 * (Studio never pushes the owner's folder), cached ~60 s on the server.
 */
export interface EditCodeState {
  /** the default branch compared */
  branch: string
  mac: {
    /** the checked-out branch */
    branch: string
    headSha?: string
    /** ISO */
    headDate?: string
    /** uncommitted paths (never part of a Studio copy) */
    dirty: number
    /** up to 20 of them */
    dirtyFiles: string[]
    /** commits GitHub does not have; absent when GitHub could not be compared */
    notOnGitHub?: number | null
    /** up to 10: "sha yyyy-mm-dd subject" */
    commits: string[]
  }
  gitHub: {
    /** credentials stripped; '' = none */
    remote: string
    reachable: boolean
    /** commits the Mac folder does not have */
    notOnMac?: number | null
    commits: string[]
  }
  studio: {
    /** unapplied sessions */
    open: number
    /** every file they changed */
    files: string[]
    sessions: { sessionId: string; author?: EditAuthor; title: string; status: EditStatus; files: string[] }[]
  }
  verdict: EditCodeVerdict
  /** the verdict in Uzbek (the web builds its own text from the fields, in the UI language) */
  verdictText: string
  /** commits the Studio folder just took from GitHub by itself (it was behind with nothing of its own); absent when none */
  pulled?: number
  /** Uzbek guidance; absent when nothing to do */
  advice?: string
  /** ISO time of the git check */
  checkedAt: string
}

export interface EditSession {
  /** e_… */
  id: string
  projectId: string
  /** who started it (several people may work on one project); absent on sessions from before authors */
  author?: EditAuthor
  /** a name the person gave this chat; absent = the first request is shown */
  title?: string
  /** the finished chat this one carries on (POST /edits/{sid}/continue): shown as one conversation */
  continuedFrom?: string
  /** other open sessions of this project changing the same files — a warning, never a block */
  overlaps?: EditOverlap[]
  status: EditStatus
  /** nova/<yyyymmdd-hhmm>-<slug> */
  branch: string
  /** the first request */
  request: string
  turns: EditTurn[]
  /** the latest turn's summary */
  summary?: string
  files: EditFile[]
  /** absent until a build ran, and for projects without a build step */
  buildOk?: boolean
  /** http://127.0.0.1:<port>/ while the preview runs (front-end only; the backend is not started) */
  previewUrl?: string
  /** the applied commit on the default branch */
  commitSha?: string
  liveCheck?: EditLiveCheck
  /** `files`: EDIT_SERVER_CONFLICT's conflicting files (repo paths) */
  error?: { code: EditErrorCode; message: string; files?: string[] }
  /** "Joylash" step by step (the running one, else the last); absent before the first */
  publish?: EditPublishProgress
  /** the conversation with Nova (chat first, then each revise request and its summary); [] for one-shot sessions */
  messages?: EditChatMessage[]
  /** Nova is writing a chat answer (typing indicator) */
  thinking?: boolean
  /** status 'chat' and Nova understood the change: the plan the "Tasdiqlash — boshlash" card shows (plain language) */
  plan?: string[]
  /** next to `plan`: each step's technical note (files, functions; '' when none), shown folded; absent on older sessions */
  planTech?: string[]
  /** «Sinov havolasi»: the shareable test link and its answers; absent until one was made */
  share?: EditShare
  /** «VS Code'da davom ettirish»: handed over to Claude Code in VS Code (the badge); absent until then */
  handoff?: EditHandoff
  createdAt: string
  updatedAt: string
  /** the working copy was removed to free disk: the history stays, the diff and preview are gone; goes on as a new chat */
  copyGone?: boolean
}

/**
 * «VS Code'da davom ettirish» (C# EditHandoff): the session's work branch (nova/…, never the default branch) pushed to
 * GitHub and the handoff text given. POST /api/edits/{sid}/handoff → EditHandoffResult (owner, managers, the chat's author).
 */
export interface EditHandoff {
  branch: string
  /** false: the copy was gone or the push refused — only the text was handed over */
  pushed: boolean
  by?: EditAuthor
  at: string
}

export interface EditHandoffResult {
  session: EditSession
  /** plain Markdown for Claude Code in VS Code */
  text: string
  /** «.md yuklab olish» */
  fileName: string
  pushed: boolean
  /** why the branch was not pushed (Uzbek) */
  reason?: string
}

/**
 * «Sinov havolasi» (C# EditShare): /#/sinov/<token> opens the session's preview without a Studio login. Open until
 * `expiresAt` (3 days) while the session is not deployed, discarded or rolled back; a rebuild keeps the token.
 *   POST /api/edits/{sid}/share → EditSession · GET /api/sinov/{token} → SinovView (public)
 *   POST /api/sinov/{token}/verdict SinovVerdictRequest → { ok } (public, rate-limited) · 410 EDIT_SHARE_EXPIRED · 429 EDIT_SHARE_TOO_MANY
 */
export interface EditShare {
  token: string
  createdAt: string
  expiresAt: string
  by?: EditAuthor
  /** oldest first */
  answers: EditShareAnswer[]
}

export type EditShareVerdict = 'yes' | 'no'

export interface EditShareAnswer {
  /** typed, or the signed-in Studio user's; absent = not given */
  name?: string
  userId?: string
  verdict: EditShareVerdict
  comment?: string
  at: string
}

/** GET /api/sinov/{token}: only what the shared page shows */
export interface SinovView {
  project: string
  /** the chat's name, else its first request */
  title: string
  /** absent while it is being rebuilt */
  previewUrl?: string
  expiresAt: string
  /** the signed-in Studio user's name (prefills the name field) */
  me?: string
  /** the client site's own login items the link's maker had in Studio, handed to the preview frame; absent = none stored */
  site?: Record<string, string>
}

/** POST /api/edits/{sid}/share body: the project's site storage (siteStorage), kept encrypted with the link */
export interface EditShareRequest {
  site?: Record<string, string>
}

export interface SinovVerdictRequest {
  verdict: EditShareVerdict
  /** required for 'no' (the reason) */
  comment?: string
  /** required (a signed-in Studio user's name counts) */
  name?: string
}

/** an element picked in the preview ("Tanlash"), sent with the next message as context */
export interface EditPick {
  text?: string
  tag?: string
  selectorPath?: string
  /** trimmed to 1 KB */
  outerHtml?: string
}

export interface EditChatMessage {
  /** 'review' = an answer on the «Sinov havolasi» page ("Husan (sinov): ❌ Kerak emas — …") */
  role: 'user' | 'nova' | 'review'
  text: string
  /** ISO */
  at: string
  /** Nova asks back */
  clarify?: boolean
  /** Nova understood the change; plan = what it will do */
  ready?: boolean
  plan?: string[]
  /** 'chat' = an answer, 'turn' = a change was made (Claude Code's summary) */
  kind?: 'chat' | 'turn'
  /** the first picked block (older clients) */
  picked?: EditPick
  /** every block picked with the message */
  picks?: EditPick[]
  /** photos / files sent with the message (GET /api/edits/{sid}/attachments/{id}) */
  attachments?: EditAttachment[]
  /** who wrote a user message (the owner may write in an editor's session); absent for Nova and older messages */
  author?: EditAuthor
  /** next to `plan`: each step's technical note ('' when none) */
  planTech?: string[]
  /** Nova's technical details of this answer / change (files, functions), shown folded under "Texnik tafsilotlar" */
  tech?: string
  /** what Nova did to write this message ("45 soniya ishladi · 12 qadam"); absent on user and older messages */
  work?: EditWork
  /** a button the answer offers (Nova never runs it) */
  action?: EditChatAction
  /** a 'review' message's verdict */
  verdict?: EditShareVerdict
}

/** C# EditChatActions */
export type EditChatAction = 'pull-server'

/** C# EditStepKinds: what one step of Nova's work was */
export type EditStepKind =
  | 'text' | 'read' | 'search' | 'find' | 'edit' | 'write' | 'command'
  | 'status' | 'logs' | 'schema' | 'data' | 'api' | 'exec' | 'dbwrite' | 'build' | 'repair' | 'tool'

/** C# EditStepStates ('answer' = a sentence that was the final answer: shown as the message, not as a step) */
export type EditStepState = 'running' | 'done' | 'error' | 'skipped' | 'answer'

/** one thing Nova did while answering or editing (the chat's live step list); worded by the web */
export interface EditStep {
  /** unique within one work; a later event with the same id updates it */
  id: string
  kind: EditStepKind
  state: EditStepState
  /** kind text: Nova's own sentence */
  text?: string
  /** a path relative to the project, a search pattern, a command, a query */
  target?: string
  /** a one-line result (a command's last line, "HTTP 200", an error's first line) */
  detail?: string
  /** matches / files / rows / log lines / tables */
  count?: number
  added?: number
  removed?: number
  /** a command's output (redacted, short) */
  output?: string
  /** kind tool: its name */
  tool?: string
}

/** one answer's or change's work, kept on Nova's message */
export interface EditWork {
  seconds: number
  steps: EditStep[]
}

/** POST /api/edits/{sid}/messages (chat: to Nova; after the start: a revise request) */
export interface EditMessageRequest {
  text: string
  /** one element (older clients); `picks` wins */
  picked?: EditPick
  /** every picked block, at most 8 */
  picks?: EditPick[]
  /** ids from POST /api/portfolio/{id}/edit/attachments, at most 10 */
  attachments?: string[]
  /** the thinking mode; omitted = the session's last one */
  mode?: ThinkMode
}

/**
 * POST /api/portfolio/{id}/edit/attachments?name=<file name> (raw body, at most 20 MB; png jpg gif webp pdf txt md csv json
 * xlsx docx) → the stored file, taken by the next message that names its id. Claude Code reads it from the copy (never committed).
 */
export interface EditAttachment {
  /** at_… */
  id: string
  name: string
  /** media type */
  type: string
  /** bytes */
  size: number
}

/** POST /api/portfolio/{id}/edits */
export interface EditStartRequest {
  request: string
  /** language Claude Code answers in; default 'uz' */
  lang?: 'uz' | 'ru' | 'en'
  /** start with a conversation (status 'chat'); nothing is edited until POST /api/edits/{sid}/accept */
  chat?: boolean
  picked?: EditPick
  picks?: EditPick[]
  attachments?: string[]
  /** the thinking mode (⚡ Tez · ◐ O'rta · ✦ Chuqur · Avto); omitted = auto */
  mode?: ThinkMode
}

/** POST /api/edits/{sid}/revise */
export interface EditReviseRequest {
  request: string
  /** omitted = the session's last mode */
  mode?: ThinkMode
}

/** POST /api/edits/{sid}/accept (optional body) */
export interface EditAcceptRequest {
  /** the thinking mode of the edit; omitted = the session's last one */
  mode?: ThinkMode
}

/** POST /api/edits/{sid}/apply {confirm:'APPLY'} · /deploy {confirm:<project name>} · /rollback {confirm:<project name>} · /discard (no body) */
export interface EditConfirmRequest {
  confirm: string
}

/**
 * POST /api/edits/{sid}/publish — "Joylash" (owner): check → the server's changes to GitHub (only with includeServer) → catch up
 * with GitHub → commit + push → deploy + live check. Statuses as APPLY → deploy (applying → deploying → deployed).
 */
export interface EditPublishRequest {
  /** true (the confirm window's «Tasdiqlash»); older clients send the project's name */
  confirm: true | string
  /** the owner saw the server's changes not on GitHub: they are committed there and taken to GitHub first */
  includeServer?: boolean
  /** «Bizniki qolsin»: the server's files are packed into a .tgz beside its checkout, then the deploy goes on without them */
  keepOurs?: boolean
}

/** GET|POST /api/edits/{sid}/github: the project's GitHub repository (a project without one: «Saytga joylash» makes it) */
export interface EditGitHubView {
  hasRemote: boolean
  connected: boolean
  /** without a repository: a free name on the account */
  suggested?: string | null
  repo?: string | null
  url?: string | null
}

/** C# EditPublishVerdicts */
export type EditPublishVerdict = 'ok' | 'behind_github' | 'server_changes' | 'unknown'

/** C# EditPublishServerStates: unknown = no server checkout configured (not checked) */
export type EditPublishServerState = 'unknown' | 'unreachable' | 'other_branch' | 'same' | 'changes'

/** GET /api/edits/{sid}/publish-check (owner, read only): GitHub and the project's server against the session's copy */
export interface EditPublishCheck {
  verdict: EditPublishVerdict
  /** Uzbek */
  verdictText: string
  gitHub: {
    reachable: boolean
    /** commits on GitHub the copy lacks (Joylash takes them first) */
    behind?: number | null
    /** up to 10: "sha subject" */
    commits: string[]
    /** the project has no GitHub repository (no origin): the window asks its name and makes it first */
    noRemote?: boolean
  }
  server: {
    state: EditPublishServerState
    /** ssh host and folder; absent when none is configured */
    host?: string
    dir?: string
    branch?: string
    /** commits on the server GitHub lacks (counted up to 50; more = maybe more) */
    commits: number
    more?: boolean
    /** up to 10: "sha subject" */
    commitList: string[]
    /** uncommitted files Joylash would commit there */
    files: number
    fileList: string[]
    /** env / key files there: never committed */
    skipped: string[]
    /** Uzbek, when it could not be checked */
    error?: string
  }
  /** ISO */
  checkedAt: string
}

/** GET /api/portfolio/{id}/edit/server-check (owner, read only): the project server's checkout against GitHub */
export interface EditServerCheck {
  /** state 'unknown' = no server checkout configured */
  server: EditPublishCheck['server']
  gitHubReachable: boolean
  /** ISO */
  checkedAt: string
}

/** POST /api/portfolio/{id}/edit/pull-server ("Serverdan olish", owner; no deploy) */
export interface EditPullServerRequest {
  /** the project's name */
  confirm: string
}

export interface EditPullServerResult {
  ok: boolean
  /** Uzbek: what happened or why it stopped */
  text: string
  /** files committed on the server first */
  committed: number
  /** the Studio folder was fast-forwarded afterwards */
  folderUpdated: boolean
  /** the steps (redacted) */
  log: string[]
}

/** GET /api/edits/{sid}/diff */
export interface EditDiff {
  /** unified diff against the base commit, capped at 400 KB */
  diff: string
  truncated: boolean
}

/**
 * GET /api/edits/{sid}/events (text/event-stream, one JSON object per `data:` line; the log so far is replayed first, then
 * the running work and its steps): 'work' = Nova started an answer / change (the live step list starts empty), 'step' = a
 * step added or updated by id
 */
export type EditEvent =
  | { type: 'log'; line: string }
  | { type: 'status'; session: EditSession }
  | { type: 'work'; at: string }
  | { type: 'step'; step: EditStep }

/** C# EditDeployStates: a recorded deploy is still on the site, or was undone («Joylashlar») */
export type EditDeployState = 'live' | 'undone'

/** C# EditDeploy: one of the project's last three deploys (GET /api/portfolio/{id}/deploys, newest first) */
export interface EditDeploy {
  n: number
  /** ISO */
  at: string
  by?: EditAuthor
  sessionId: string
  title: string
  files: string[]
  /** GitHub's default branch before the push */
  before: string
  /** the commit pushed */
  after: string
  branch?: string
  serverHead?: string
  /** the database stash the deploy kept on the server */
  dataStash?: string
  state: EditDeployState
  /** this deploy's front-end is kept («Keyin») */
  hasAfter: boolean
  /** the front-end live before it is kept («Oldin») */
  hasBefore: boolean
}

export type EditUndoState = 'running' | 'done' | 'failed'

/** C# EditUndoRun: the running (or last) «Shu deploydan oldingi holatga qaytarish»; steps github, deploy, check */
export interface EditUndoRun {
  n: number
  titles: string[]
  state: EditUndoState
  progress: EditPublishProgress
  error?: { code: EditErrorCode; message: string; files?: string[] }
  liveCheck?: EditLiveCheck
  revertSha?: string
  dataRestored: boolean
}

export interface EditDeployHistory {
  deploys: EditDeploy[]
  undo?: EditUndoRun
  /** the running (or last) «GitHub'dagini joylash» */
  latest?: EditLatestRun
}

/** C# EditLatestRun: «GitHub'dagini joylash» — GitHub's tip deployed without a Nova session; steps github, deploy, check */
export interface EditLatestRun {
  state: EditUndoState
  progress: EditPublishProgress
  error?: { code: EditErrorCode; message: string; files?: string[] }
  liveCheck?: EditLiveCheck
  sha?: string
  title?: string
  /** the «Joylashlar» record it added */
  n?: number
}

/** C# EditLatestCommit: one of GitHub's commits not on the site yet */
export interface EditLatestCommit {
  sha: string
  subject: string
  author: string
  /** ISO */
  at: string
}

/** GET /api/portfolio/{id}/edit/deploy-latest */
export interface EditLatestCheck {
  reachable: boolean
  branch?: string
  tip?: string
  /** what the site runs (short sha): the last deploy's commit, else the server's HEAD; absent = unknown */
  base?: string
  baseFrom?: 'deploy' | 'server'
  /** newest first */
  commits: EditLatestCommit[]
  /** commits GitHub has past the base (absent when the base is unknown) */
  ahead?: number
  /** why it cannot be deployed now (Uzbek) */
  blocked?: string
}

/** POST /api/portfolio/{id}/deploys/{n}/undo */
export interface EditUndoDeployRequest {
  confirm: true
  restoreData: boolean
}
