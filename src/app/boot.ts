import { config } from '@/config'
import { API, type DataMode } from './mode'

/** GET /publish/resolve?host=… on the publishing server: the dashboard at that address, and whether this browser may open it */
export interface HostResolve {
  slug: string
  name: string
  protected: boolean
  viewer: boolean
}

export type Boot = { kind: 'app' } | { kind: 'login'; name: string } | { kind: 'unknown' }

/**
 * Before the first frame: does this browser need the dashboard's viewer login? (the same question Studio's published
 * address asks, features/publish/kiosk). Demo mode never asks. A server that does not answer starts the app anyway: the
 * dashboard then shows its own error with «Qayta urinish».
 */
export async function resolveBoot(mode: DataMode, fetcher: typeof fetch = fetch): Promise<Boot> {
  if (mode === 'demo') return { kind: 'app' }
  try {
    const res = await fetcher(`${API}/publish/resolve?host=${encodeURIComponent(config.project.publishedHost)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const found = (await res.json()) as HostResolve
      return found.protected && !found.viewer ? { kind: 'login', name: found.name || config.project.name } : { kind: 'app' }
    }
    if (res.status === 404 && res.headers.get('X-D365-Hub') === '1') return { kind: 'unknown' }
    // a viewer API that says "login first" without the resolve endpoint
    if (res.status === 401) return { kind: 'login', name: config.project.name }
    return { kind: 'app' }
  } catch {
    return { kind: 'app' }
  }
}

/** POST /publish/viewer/login: the dashboard's own login (one per person); the server answers with a cookie session */
export async function viewerLogin(login: string, password: string, fetcher: typeof fetch = fetch): Promise<void> {
  const res = await fetcher(`${API}/publish/viewer/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'd365' },
    body: JSON.stringify({ slug: config.project.slug, login, password }),
  })
  if (res.ok) return
  let code = 'NETWORK'
  try {
    const body = (await res.json()) as { code?: unknown }
    if (typeof body.code === 'string') code = body.code
  } catch {
    // not JSON
  }
  throw new LoginError(code)
}

export class LoginError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}
