import { useEffect, useRef } from 'react'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { ApiError, toApiError } from '@/features/projects/api'

/**
 * "Tezkor yangilanish" — apps/api …/Data365.Publish/Instant.cs:
 *   GET|PUT|DELETE /projects/{id}/instant (owner) · GET /live/{slug}/events (text/event-stream: a new build)
 */
export interface InstantView {
  /** the project has a real Bitrix24 connection */
  available: boolean
  connectionId?: string | null
  /** the address to paste into Bitrix24's outbound webhook (null until the publishing server is set) */
  hookUrl?: string | null
  /** the application token is saved: instant updates are on */
  on: boolean
  savedAt?: string | null
  lastEventAt?: string | null
  /** the published server got the token too (false: on the next publish) */
  synced?: boolean | null
}

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const enc = encodeURIComponent

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: { Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    throw ApiError.network(e)
  }
  if (!res.ok) throw ApiError.fromStatus(res.status, await res.text().catch(() => ''))
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const wrap = <T,>(p: Promise<T>) => p.catch((e: unknown) => Promise.reject(toApiError(e)))

export const getInstant = (projectId: string) => wrap(call<InstantView>('GET', `/projects/${enc(projectId)}/instant`))
export const saveInstant = (projectId: string, token: string) => wrap(call<InstantView>('PUT', `/projects/${enc(projectId)}/instant`, { token }))
export const removeInstant = (projectId: string) => wrap(call<InstantView>('DELETE', `/projects/${enc(projectId)}/instant`))

/** a Bitrix24 application token: 16–64 of a-z, 0-9 */
export const TOKEN = /^[a-z0-9]{16,64}$/

/**
 * An open dashboard hears of every new build at once (GET /live/{slug}/events) and calls `onVersion` — the dashboard then
 * re-reads its info and loads the new numbers. The browser reconnects by itself after a network break.
 */
export function useLiveEvents(slug: string | null | undefined, onVersion: () => void) {
  const cb = useRef(onVersion)
  cb.current = onVersion
  useEffect(() => {
    if (!slug || typeof EventSource === 'undefined') return
    const es = new EventSource(`${BASE}/live/${enc(slug)}/events`, { withCredentials: true })
    // every (re)connection first repeats the current version: only a different one is news
    let last: string | null = null
    const onMessage = (e: MessageEvent<string>) => {
      const changed = last !== null && e.data !== last
      last = e.data
      if (changed) cb.current()
    }
    es.addEventListener('version', onMessage)
    return () => {
      es.removeEventListener('version', onMessage)
      es.close()
    }
  }, [slug])
}
