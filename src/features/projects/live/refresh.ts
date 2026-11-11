import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { readLocal, writeLocal } from '@/lib/storage'
import type { LiveInfo, PageId } from '@/features/projects/types'

/**
 * When a live dashboard shows new numbers. The server keeps building new data in the background (after a Bitrix24 event,
 * every 15 minutes); the open page never changes numbers under the viewer's eyes, and the viewer never has to press
 * anything either (owner, 2026-11-11: "refreshed on our server, but not live … it shouldn't be manual"):
 *  - normal dashboard (the default): keeps what it shows and applies the newer build at a natural moment —
 *    the viewer opens another page of the dashboard, comes back to the tab after a while away, or has not touched the page
 *    for 5 minutes with nothing open (no drill-down, menu, filter panel, selected text) — see `applyAtMoment`; until then
 *    a quiet pill «Yangi ma'lumot bor · 14:32 · Yangilash» offers it at once;
 *  - «Sonlar o'zi yangilansin» on (a wallboard, a call-centre screen — the owner's switch in "Nashr qilish"): applies each
 *    new build at once;
 *  - a build the person asked for themselves («Yangilash», a block edit, Nova) is applied when it arrives.
 * Applying never remounts the dashboard: open drill-downs, filters, sort and scroll stay (LivePage).
 */

/** a built snapshot's version as the page loads it (+ the page list: a rebuild that only added a page may keep builtAt) */
export const versionOf = (live: Pick<LiveInfo, 'lastRefreshAt' | 'builtAt' | 'pages'>): string =>
  `${live.lastRefreshAt ?? live.builtAt}|${live.pages.join()}`

/** the time a version's data was built (its first part), or null */
export function versionTime(version: string): Date | null {
  const d = new Date(version.split('|')[0] ?? '')
  return Number.isNaN(d.getTime()) ? null : d
}

/** how long after the person asked for new data (a refresh, a block edit) its build is applied by itself */
export const ASKED_WINDOW_MS = 5 * 60_000

/** whether a newer version should replace the one on screen as soon as it arrives (otherwise it waits for a natural moment or the pill) */
export function applyNow(o: { realtime: boolean; askedUntil: number; now?: number }): boolean {
  return o.realtime || o.askedUntil > (o.now ?? Date.now())
}

// ───────────────────────────── natural moments (a normal dashboard) ─────────────────────────────

/** no pointer / key / wheel / scroll / touch on the page for this long: the viewer is not looking at a number right now */
export const IDLE_MS = 5 * 60_000
/** away from the tab (another tab, another app) at least this long counts as "came back"; a quick look elsewhere does not */
export const AWAY_MS = 60_000
/** how often an open page with newer data waiting checks whether the viewer went idle */
export const IDLE_CHECK_MS = 15_000

/**
 * - `page`: the viewer opened another page of the dashboard — it renders anew anyway;
 * - `return`: the tab is visible again after being hidden;
 * - `idle`: the idle check.
 */
export type ApplyMoment = 'page' | 'return' | 'idle'

export interface ViewerNow {
  /** a drill-down, a menu, a popover, the filter panel or another sheet is open */
  overlay: boolean
  /** the viewer has text selected on the page (copying a number) */
  selecting: boolean
  /** ms since the last pointer / key / wheel / scroll / touch */
  idleMs: number
  /** ms the tab was hidden before it came back (0 when it was not) */
  awayMs: number
}

/** whether a newer version waiting on a normal dashboard is applied at this moment (never while the viewer works with something open) */
export function applyAtMoment(moment: ApplyMoment, v: ViewerNow): boolean {
  if (moment === 'page') return true
  if (v.overlay || v.selecting) return false
  return moment === 'return' ? v.awayMs >= AWAY_MS : v.idleMs >= IDLE_MS
}

/** anything open over or inside the dashboard: dialogs and sheets (drill-downs), menus, list boxes, popovers, and an expanded control inside the page (the filter panel, a "Batafsil") */
export const OVERLAY_SELECTOR = '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[aria-modal="true"],main [aria-expanded="true"]'

/** what the viewer has open right now, read from the page (the overlay query is one querySelector, only at a moment) */
export function readViewer(doc: Pick<Document, 'querySelector'> | null, selection: { toString(): string } | null): Pick<ViewerNow, 'overlay' | 'selecting'> {
  return {
    overlay: doc?.querySelector(OVERLAY_SELECTOR) != null,
    selecting: (selection?.toString().trim().length ?? 0) > 0,
  }
}

const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const

/**
 * Calls `onMoment` at the natural moments while `active` (a newer version waits on a normal dashboard): the page changed,
 * the tab came back after `AWAY_MS`, or the viewer has been idle `IDLE_MS` — each only when `applyAtMoment` says so.
 * Activity is a timestamp in a ref (no render per mouse move); the idle check runs only while something waits.
 */
export function useNaturalMoments(o: { active: boolean; page: string; onMoment: (m: ApplyMoment) => void }): void {
  const fire = useRef(o.onMoment)
  fire.current = o.onMoment
  const active = useRef(o.active)
  active.current = o.active
  const lastActivity = useRef(Date.now())
  const hiddenAt = useRef<number | null>(null)

  const now = useCallback(
    (extra: Partial<ViewerNow> = {}): ViewerNow => ({
      ...readViewer(typeof document === 'undefined' ? null : document, typeof window === 'undefined' ? null : window.getSelection()),
      idleMs: Date.now() - lastActivity.current,
      awayMs: 0,
      ...extra,
    }),
    [],
  )

  // the viewer's activity (always tracked: idleness counts from before the newer data arrived)
  useEffect(() => {
    const mark = () => void (lastActivity.current = Date.now())
    for (const e of ACTIVITY) window.addEventListener(e, mark, { capture: true, passive: true })
    return () => {
      for (const e of ACTIVITY) window.removeEventListener(e, mark, { capture: true })
    }
  }, [])

  // another page of the dashboard (before it paints: the new page never shows the older numbers first)
  const prevPage = useRef(o.page)
  useLayoutEffect(() => {
    if (prevPage.current === o.page) return
    prevPage.current = o.page
    if (active.current && applyAtMoment('page', now())) fire.current('page')
  }, [o.page, now])

  // back to the tab
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        return
      }
      const away = hiddenAt.current == null ? 0 : Date.now() - hiddenAt.current
      hiddenAt.current = null
      if (active.current && applyAtMoment('return', now({ awayMs: away }))) fire.current('return')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [now])

  // idle (checked only while something waits)
  useEffect(() => {
    if (!o.active) return
    const check = () => {
      if (active.current && applyAtMoment('idle', now())) fire.current('idle')
    }
    check()
    const id = setInterval(check, IDLE_CHECK_MS)
    return () => clearInterval(id)
  }, [o.active, now])
}

// ───────────────────────────── «Jonli yangilanish» (the dashboard's prefs on the server) ─────────────────────────────

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const localKey = (slug: string) => `d365.realtime.${slug}`
const known = new Map<string, boolean>()
const listeners = new Set<() => void>()
const set = (slug: string, on: boolean) => {
  known.set(slug, on)
  writeLocal(localKey(slug), on)
  for (const l of listeners) l()
}

/** what this browser last knew (instant, before the server answers); off when it never knew */
export const cachedRealtime = (slug: string): boolean => known.get(slug) ?? readLocal<boolean>(localKey(slug), false) === true

/** GET /live/{slug}/prefs (as public as the dashboard link): the dashboard's «Jonli yangilanish» */
export async function loadRealtime(slug: string, signal?: AbortSignal): Promise<boolean> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/prefs`, { headers: { Accept: 'application/json' }, signal, credentials: 'include' })
  if (!res.ok) return cachedRealtime(slug)
  const on = ((await res.json()) as { realtime?: unknown }).realtime === true
  set(slug, on)
  return on
}

/** PUT /live/{slug}/prefs {realtime} (a signed-in Studio user); only this field changes on the server */
export async function storeRealtime(slug: string, on: boolean): Promise<boolean> {
  const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/prefs`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify({ realtime: on }),
  })
  if (!res.ok) throw new Error(`prefs ${res.status}`)
  const stored = ((await res.json()) as { realtime?: unknown }).realtime === true
  set(slug, stored)
  return stored
}

/** the dashboard's «Jonli yangilanish»: this browser's last value at once, the server's when it answers, a switch's change live */
export function useRealtime(slug: string | null | undefined): boolean {
  const [, bump] = useState(0)
  useEffect(() => {
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  useEffect(() => {
    if (!slug) return
    const ac = new AbortController()
    loadRealtime(slug, ac.signal).catch(() => undefined)
    return () => ac.abort()
  }, [slug])
  return slug ? cachedRealtime(slug) : false
}

// ───────────────────────────── the viewer's last page ─────────────────────────────

const pageKey = (slug: string) => `d365.lastpage.${slug}`

/** the dashboard page this browser last showed (a published address opened bare starts there) */
export const lastPage = (slug: string): string | null => {
  const p = readLocal<unknown>(pageKey(slug), null)
  return typeof p === 'string' && /^[a-z]{2,20}$/.test(p) ? p : null
}

export const rememberPage = (slug: string, page: PageId): void => {
  if (lastPage(slug) !== page) writeLocal(pageKey(slug), page)
}

/** for tests */
export function _resetRealtime(): void {
  known.clear()
  listeners.clear()
}
