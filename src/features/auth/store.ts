import { useSyncExternalStore } from 'react'
import { toApiError } from '@/features/projects/api'
import type { AuthMe, AuthUser } from '@/features/projects/types'
import { getMe, logout } from './api'
import { installApiFetch } from './http'
import { isAnonymousView, isPublicPath, loginHref, LOGIN_PATH, viewFromError, viewFromMe, type AuthView } from './guard'

/**
 * Who is signed in, for the whole app. GET /api/auth/me is asked once on start (the router guard waits for it), cached,
 * and asked again on window focus so a session that ended elsewhere is noticed.
 *
 *   const auth = useAuth()                 // { kind: 'ready', user, needsSetup } | 'loading' | 'off' | 'unknown'
 *   const user = useAuthUser()             // AuthUser | null
 *   const anon = useAnonymous()            // not signed in (a public live dashboard viewer): light shell
 *   await ensureAuth()                     // in a route's beforeLoad
 *   setAuthMe(await login({ email, password }))
 *   await signOut()                        // POST /auth/logout, then a clean reload on /kirish
 */

let view: AuthView = { kind: 'loading' }
let inflight: Promise<AuthView> | null = null
let lastAsked = 0
const listeners = new Set<() => void>()

/** the id of the last signed-in user in this tab (a different person signing in gets a clean reload) */
let lastUserId: string | null = null

function emit(next: AuthView) {
  view = next
  if (next.kind === 'ready' && next.user) lastUserId = next.user.id
  listeners.forEach((l) => l())
}

/** a published dashboard's own address: its visitor is a viewer, never a Studio user (see {@link setKioskViewer}) */
let kiosk = false
const VIEWER: AuthView = { kind: 'ready', user: null, needsSetup: false }

/**
 * On a published dashboard's address (the publishing server) every visitor is an anonymous viewer: read-only, no edit
 * controls. The publishing server keeps Studio's sign-in closed, and its 404 must not read as "sign-in off → owner".
 */
export function setKioskViewer() {
  kiosk = true
  emit(VIEWER)
}

/** GET /auth/me → the view (sign-in off → off; no answer → unknown) */
async function ask(): Promise<AuthView> {
  lastAsked = Date.now()
  if (kiosk) return VIEWER
  try {
    return viewFromMe(await getMe())
  } catch (e) {
    return viewFromError(toApiError(e).status)
  }
}

/** ask the server now (deduplicated) */
export function refreshAuth(): Promise<AuthView> {
  if (inflight) return inflight
  inflight = ask()
    .then((v) => {
      const had = view.kind === 'ready' && !!view.user
      emit(v)
      // the session ended while the page was open (expired, signed out in another tab): back to /kirish
      if (had && v.kind === 'ready' && !v.user) toLogin()
      return v
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** the cached answer, or ask once; an "unknown" answer is asked again after 5 s */
export function ensureAuth(): Promise<AuthView> {
  if (view.kind === 'loading' || (view.kind === 'unknown' && Date.now() - lastAsked > 5000)) return refreshAuth()
  return Promise.resolve(view)
}

export function getAuthView(): AuthView {
  return view
}

/** after POST /auth/login or /auth/setup */
export function setAuthMe(me: AuthMe): void {
  emit(viewFromMe(me))
}

/** after the person changed their own name */
export function setAuthUser(user: AuthUser): void {
  if (view.kind === 'ready' && view.user?.id === user.id) emit({ ...view, user })
}

/** true when the person who just signed in is not the one this tab showed before (their data is still cached) */
export function isDifferentUser(me: AuthMe): boolean {
  return !!lastUserId && !!me.user && me.user.id !== lastUserId
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAuth(): AuthView {
  return useSyncExternalStore(subscribe, getAuthView, getAuthView)
}

export function useAuthUser(): AuthUser | null {
  const v = useAuth()
  return v.kind === 'ready' ? v.user : null
}

/** a not-signed-in viewer of a public live dashboard: the light shell (see isAnonymousView) */
export function useAnonymous(): boolean {
  return isAnonymousView(useAuth())
}

// ───────────────────────────── navigation (registered by router.tsx) ─────────────────────────────

export interface AuthNavigator {
  /** the router-relative href now, e.g. "/p/abc/manbalar?x=1" */
  current: () => string
  /** replace the current entry with this in-app href */
  go: (href: string) => void
}

let nav: AuthNavigator = {
  current: () => (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') || '/' : '/'),
  go: (href) => {
    if (typeof window !== 'undefined') window.location.replace('#' + href)
  },
}

export function setAuthNavigator(n: AuthNavigator): void {
  nav = n
}

/** the global 401 handler: the session is gone → signed out → /kirish?next=<here> (public pages stay where they are) */
export function handleUnauthorized(): void {
  // sign-in is off on this server: a 401 only means "this needs a real user" (e.g. personal tokens) — nothing to do
  if (view.kind === 'off') return
  const wasSignedIn = !(view.kind === 'ready' && !view.user)
  if (wasSignedIn) emit({ kind: 'ready', user: null, needsSetup: false })
  toLogin()
  // learn the truth in the background (e.g. the owner was removed → needsSetup); anonymous viewers of a public live
  // dashboard hit 401s on purpose, so this asks only once per sign-out
  if (wasSignedIn) void refreshAuth()
}

function toLogin() {
  const here = nav.current()
  const path = here.split(/[?#]/, 1)[0] ?? '/'
  if (!isPublicPath(path)) nav.go(loginHref(here))
}

/** POST /auth/logout (best effort), then a clean reload on /kirish so nothing of this person stays in memory */
export async function signOut(): Promise<void> {
  try {
    await logout()
  } catch {
    // offline / already signed out: the reload below still clears the page; the cookie ends with the session
  }
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', '#' + LOGIN_PATH)
  window.location.reload()
}

/** called once in main.tsx: the CSRF header + the 401 handler on every API request, and a re-check on focus */
export function installAuth(): void {
  installApiFetch(handleUnauthorized)
  if (typeof window === 'undefined') return
  window.addEventListener('focus', () => {
    if (view.kind === 'ready' && view.user && Date.now() - lastAsked > 60_000) void refreshAuth()
  })
}
