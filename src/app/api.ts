import { config, configAnswer } from '@/config'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import type { LiveInfo } from '@/features/projects/types'
import { API, DATA_MODE, type DataMode } from './mode'

/**
 * The one place this app talks to a server. Every request to the API prefix goes through `installApi()`'s fetch:
 *  - GET /live/<slug>/blocks | charts | filters | prefs are answered from src/config (this copy's own settings);
 *  - in demo mode nothing leaves the browser: the dashboard's info is made from the config, the rest answers "not here";
 *  - in live mode the rest goes to the server with the viewer's cookie session and the API's CSRF header.
 */

export interface LocalAnswer {
  status: number
  body: unknown
}

/** the dashboard's live info in demo mode (GET /live/<slug>): its pages, name and look, no refresh job */
export function demoLiveInfo(): LiveInfo {
  const p = config.project
  return {
    slug: p.slug,
    projectId: p.projectId,
    name: p.name,
    industry: p.industry,
    ui: p.ui,
    pages: [...p.pages],
    isDemo: true,
    url: '',
    builtAt: '2026-01-01T00:00:00Z',
    lastRefreshAt: null,
    refreshable: false,
    job: null,
  }
}

const EDIT_KINDS = new Set(['blocks', 'charts', 'filters', 'prefs', 'draft'])

/** what the app answers itself for `method path` (path after the API prefix, no query); null: the server answers */
export function localAnswer(method: string, path: string, mode: DataMode): LocalAnswer | null {
  const m = /^\/live\/([^/]+)(?:\/(.+))?$/.exec(path)
  const own = !!m && decodeURIComponent(m[1]!) === config.project.slug
  const rest = m?.[2] ?? ''
  if (own && method === 'GET') {
    const answer = configAnswer(rest)
    if (answer !== undefined) return { status: 200, body: answer }
  }
  // the editor's saves: this copy is edited in code (src/config), never through the API
  if (own && method !== 'GET' && EDIT_KINDS.has(rest.split('/')[0]!)) return { status: 403, body: { code: 'FORBIDDEN', detail: 'Edit src/config in this app' } }
  if (mode !== 'demo') return null
  if (own && rest === '' && method === 'GET') return { status: 200, body: demoLiveInfo() }
  if (own && rest === 'state') return { status: 200, body: method === 'GET' ? {} : { version: 'demo' } }
  return { status: 404, body: { code: 'NOT_FOUND', detail: 'demo mode: no server' } }
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
}

/** the path after the API prefix, or null when `url` is not an API call */
export function apiPath(url: string, api: string = API, here: string = globalThis.location?.href ?? 'http://localhost/'): string | null {
  const u = new URL(url, here)
  const prefix = new URL(api, here)
  const base = prefix.pathname.replace(/\/$/, '')
  if (u.origin !== prefix.origin || (u.pathname !== base && !u.pathname.startsWith(base + '/'))) return null
  return u.pathname.slice(base.length) || '/'
}

let installed = false

/** wraps window.fetch once (main.tsx, before anything renders) */
export function installApi(mode: DataMode = DATA_MODE): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const send = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const path = apiPath(urlOf(input))
    if (path === null) return send(input, init)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const local = localAnswer(method, path, mode)
    if (local) return Promise.resolve(new Response(JSON.stringify(local.body), { status: local.status, headers: { 'Content-Type': 'application/json' } }))
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (!headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, CSRF_VALUE)
    return send(input, { ...init, headers, credentials: 'include' })
  }
}
