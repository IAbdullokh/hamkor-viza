import { ApiError } from '@/features/projects/api'
import { CSRF_HEADER, CSRF_VALUE } from './csrf'

/**
 * The browser side of the API's request rules, in one place:
 *
 * - Every request to our API carries `X-Requested-With: d365`. The session cookie is HttpOnly + SameSite, and the API
 *   refuses state-changing requests without this header, so another site cannot make the browser act for the person
 *   (a plain cross-site form cannot set a custom header).
 * - A 401 from any API call (except the sign-in endpoints themselves) means the session is gone (expired, signed out
 *   in another tab, user disabled): the person is sent to /kirish and comes back after signing in.
 *
 * `installApiFetch(onUnauthorized)` is called once in main.tsx (via installAuth) and wraps window.fetch and
 * XMLHttpRequest, so every existing client (features/projects/api.ts, the assistant stream, uploads) follows the rules
 * without changes. `apiCall` is the small typed client the auth and connector screens use.
 */

export { CSRF_HEADER, CSRF_VALUE }

export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

/** true when `url` points at our API (relative "/api/…" or absolute under VITE_API_BASE) */
export function isApiUrl(url: string, base: string = API_BASE, docUrl: string = currentDocUrl()): boolean {
  try {
    const u = new URL(url, docUrl)
    const b = new URL(base.endsWith('/') ? base : base + '/', docUrl)
    return u.origin === b.origin && (u.pathname + '/').startsWith(b.pathname)
  } catch {
    return false
  }
}

/** /api/auth/* — a 401 there is an answer (wrong password), not a lost session */
export function isAuthEndpoint(url: string, base: string = API_BASE, docUrl: string = currentDocUrl()): boolean {
  try {
    const u = new URL(url, docUrl)
    const b = new URL(base.endsWith('/') ? base : base + '/', docUrl)
    return u.pathname.startsWith(b.pathname + 'auth/') || u.pathname === b.pathname + 'auth'
  } catch {
    return false
  }
}

/**
 * Whether a 401 response means "the session is gone". `bodyCode` is the ApiError code of the body when it could be read
 * (INVALID_LOGIN — e.g. a wrong current password on the profile page — is an answer, not a lost session).
 */
export function isSessionLost(status: number, url: string, bodyCode?: string | null, base: string = API_BASE, docUrl: string = currentDocUrl()): boolean {
  if (status !== 401) return false
  if (!isApiUrl(url, base, docUrl) || isAuthEndpoint(url, base, docUrl)) return false
  return bodyCode !== 'INVALID_LOGIN'
}

function currentDocUrl(): string {
  return typeof document !== 'undefined' ? document.baseURI : 'http://localhost/'
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

async function bodyCodeOf(res: Response): Promise<string | null> {
  try {
    const body = JSON.parse(await res.clone().text()) as { code?: unknown }
    return typeof body?.code === 'string' ? body.code : null
  } catch {
    return null
  }
}

const INSTALLED = Symbol.for('d365.apiFetch')

/** wrap window.fetch + XMLHttpRequest once (a second call is ignored) */
export function installApiFetch(onUnauthorized: () => void): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as Record<symbol, boolean>
  if (w[INSTALLED]) return
  w[INSTALLED] = true

  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input)
    if (!isApiUrl(url)) return original(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (!headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, CSRF_VALUE)
    const res = await original(input, { ...init, headers })
    if (res.status === 401 && isApiUrl(url) && !isAuthEndpoint(url)) {
      void bodyCodeOf(res).then((code) => {
        if (isSessionLost(res.status, url, code)) onUnauthorized()
      })
    }
    return res
  }

  if (typeof XMLHttpRequest === 'undefined') return
  const urls = new WeakMap<XMLHttpRequest, string>()
  /** requests that already set the header themselves (XHR joins a second value: "d365, d365") */
  const withCsrf = new WeakSet<XMLHttpRequest>()
  const proto = XMLHttpRequest.prototype
  const open = proto.open
  const send = proto.send
  const setHeader = proto.setRequestHeader
  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    urls.set(this, String(args[1]))
    withCsrf.delete(this)
    return (open as (...a: unknown[]) => void).apply(this, args)
  } as XMLHttpRequest['open']
  proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    if (name.toLowerCase() === CSRF_HEADER.toLowerCase()) withCsrf.add(this)
    return setHeader.call(this, name, value)
  }
  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const url = urls.get(this)
    if (url && isApiUrl(url)) {
      try {
        if (!withCsrf.has(this)) this.setRequestHeader(CSRF_HEADER, CSRF_VALUE)
      } catch {
        // already sent / not opened: the browser will refuse the request anyway
      }
      this.addEventListener('load', () => {
        if (this.status !== 401) return
        let code: string | null = null
        try {
          const parsed = JSON.parse(this.responseText) as { code?: unknown }
          code = typeof parsed?.code === 'string' ? parsed.code : null
        } catch {
          // not JSON
        }
        if (isSessionLost(this.status, url, code)) onUnauthorized()
      })
    }
    return send.call(this, body)
  }
}

// ───────────────────────────── a small typed client ─────────────────────────────

export interface CallOptions {
  signal?: AbortSignal
}

/** JSON request to API_BASE + path; throws features/projects ApiError (status 0 = server not reached) */
export async function apiCall<T>(method: string, path: string, body?: unknown, opts: CallOptions = {}): Promise<T> {
  let res: Response
  const headers: Record<string, string> = { Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
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
