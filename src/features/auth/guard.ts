import type { AuthMe, AuthUser } from '@/features/projects/types'

/**
 * Pure routing rules of the sign-in (no React, no network), used by the router guard, the global 401 handler and the
 * login page:
 *
 *   guardDecision('/p/abc/manbalar', '/p/abc/manbalar', { kind: 'ready', user: null, needsSetup: false })
 *     → { kind: 'login', next: '/p/abc/manbalar' }
 *   safeNext('//evil.example')  → null      (only in-app paths come back after sign-in)
 *   loginHref('/loyihalar')     → '/kirish?next=%2Floyihalar'
 */

export const LOGIN_PATH = '/kirish'
export const SETUP_PATH = '/boshlash'

/** what the app knows about the person right now */
export type AuthView =
  /** GET /api/auth/me has not answered yet */
  | { kind: 'loading' }
  /** this server has no sign-in (old build, or the route is missing): everything stays open, the person is the owner */
  | { kind: 'off' }
  /** the server could not be asked (offline, API down): pages show their own "no connection" errors */
  | { kind: 'unknown' }
  | { kind: 'ready'; user: AuthUser | null; needsSetup: boolean }

export type GuardDecision =
  | { kind: 'allow' }
  /** to /kirish; `next` = where to come back after sign-in (null = home) */
  | { kind: 'login'; next: string | null }
  /** to /boshlash (no user exists yet) */
  | { kind: 'setup' }
  /** away from /kirish or /boshlash (already signed in / sign-in is off) */
  | { kind: 'leave'; to: string }

/** GET /api/auth/me (or the answer of login / setup) → what the app knows (signInEnabled: false = Auth:Enabled=false) */
export function viewFromMe(me: AuthMe | null | undefined): AuthView {
  if (me?.signInEnabled === false) return { kind: 'off' }
  return { kind: 'ready', user: me?.user ?? null, needsSetup: !!me?.needsSetup }
}

/** GET /api/auth/me failed with this HTTP status (0 = not reached): no such route = an old server without sign-in */
export function viewFromError(status: number): AuthView {
  return status === 404 || status === 405 ? { kind: 'off' } : { kind: 'unknown' }
}

/** pages anyone may open without signing in (/sinov/<token>: a «Sinov havolasi», features/edit/SinovPage.tsx; /imtihon/<token>: an employee's test, features/erp/quiz; /uchrashuv/<token>: a client in a call, features/erp/room; /x/<token>: a map by its share link, features/erp/share) */
export function isPublicPath(pathname: string): boolean {
  const p = normalize(pathname)
  return p === LOGIN_PATH || p === SETUP_PATH || p === '/l' || p.startsWith('/l/') || p.startsWith('/sinov/') || p.startsWith('/imtihon/') || p.startsWith('/uchrashuv/') || p.startsWith('/x/') || p.startsWith('/t/')
}

/** a built live dashboard (/l/$slug…): open to anonymous viewers, also during the first-run setup */
export function isLivePath(pathname: string): boolean {
  const p = normalize(pathname)
  return p === '/l' || p.startsWith('/l/')
}

/** pages only the owner may open (members see the "faqat egasi uchun" page there) */
export const OWNER_ONLY_PATHS = ['/sozlamalar/foydalanuvchilar', '/sozlamalar/nashr', '/sozlamalar/savat', '/sozlamalar/github', '/sozlamalar/bitrix', '/sozlamalar/serverlar'] as const

export function isOwnerOnlyPath(pathname: string): boolean {
  const p = normalize(pathname)
  return OWNER_ONLY_PATHS.some((o) => p === o || p.startsWith(o + '/'))
}

/** true when the person may open owner-only pages (sign-in off = the single local user is the owner) */
export function isOwnerView(auth: AuthView): boolean {
  if (auth.kind === 'off') return true
  return auth.kind === 'ready' && auth.user?.role === 'owner'
}

/**
 * true when the person may work on Data365 projects' code: the owner, or an editor ("Muharrir"). They open the portfolio
 * project pages and the Tahrirlash tab; what is the owner's alone there (deploy, rollback, project data) stays hidden.
 */
export function canEditView(auth: AuthView): boolean {
  if (isOwnerView(auth)) return true
  return auth.kind === 'ready' && (auth.user?.role === 'editor' || auth.user?.role === 'manager')
}

/** true for the owner or a manager ("Boshqaruvchi"): all of Data365's projects — their data, servers, deploy, rollback */
export function canManageView(auth: AuthView): boolean {
  if (isOwnerView(auth)) return true
  return auth.kind === 'ready' && auth.user?.role === 'manager'
}

/**
 * True for a viewer who is not signed in (sign-in is on and nobody is signed in). The guard lets such a person only onto
 * public live dashboards (/l/$slug…), where the shell is light: no Nova, no projects list, no voice, no refresh.
 */
export function isAnonymousView(auth: AuthView): boolean {
  return auth.kind === 'ready' && !auth.user
}

/**
 * The in-app path to return to after sign-in, or null when `raw` is not a safe in-app path (open-redirect guard): must
 * start with a single "/", no backslash, no control characters, not the sign-in pages themselves, at most 2000 chars.
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s || s.length > 2000) return null
  if (!s.startsWith('/') || s.startsWith('//')) return null
  if (s.includes('\\')) return null
  if (/[\u0000-\u001f\u007f]/.test(s)) return null
  const path = normalize(s.split(/[?#]/, 1)[0] ?? '')
  if (path === LOGIN_PATH || path === SETUP_PATH) return null
  return s
}

/** "/kirish" or "/kirish?next=…" (the target is dropped when it is home or not safe) */
export function loginHref(next?: string | null): string {
  const n = safeNext(next)
  return n && n !== '/' ? `${LOGIN_PATH}?next=${encodeURIComponent(n)}` : LOGIN_PATH
}

/**
 * What the router does with `pathname` for this person. `href` (path + search) becomes the `next` of a sign-in
 * redirect; `next` is the ?next= of /kirish (where to go once signed in).
 */
export function guardDecision(pathname: string, href: string, auth: AuthView, next?: string | null): GuardDecision {
  const p = normalize(pathname)
  const onLogin = p === LOGIN_PATH
  const onSetup = p === SETUP_PATH
  const back = safeNext(next) ?? '/'

  if (auth.kind === 'off') return onLogin || onSetup ? { kind: 'leave', to: back } : { kind: 'allow' }
  // loading never reaches the router (it waits for /me); unknown = the server was not reached: let pages say so
  if (auth.kind === 'loading' || auth.kind === 'unknown') return { kind: 'allow' }

  if (auth.needsSetup && !auth.user) {
    if (onSetup || isLivePath(p)) return { kind: 'allow' }
    return { kind: 'setup' }
  }
  if (!auth.user) {
    if (onLogin || isLivePath(p)) return { kind: 'allow' }
    if (onSetup) return { kind: 'login', next: null }
    return { kind: 'login', next: safeNext(href) }
  }
  if (onLogin || onSetup) return { kind: 'leave', to: back }
  return { kind: 'allow' }
}

/** "/a/b/" → "/a/b"; "" → "/" */
function normalize(pathname: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return p || '/'
}
