import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { readLocal, writeLocal } from '@/lib/storage'
import type { BlockScope } from '@/features/blockedit/context'
import type { FilterItem, PageFilters } from './fields'
import type { BarLayouts } from './bar'

/**
 * Where a dashboard's added filters live: a live project on the server (GET is as public as the dashboard link, PUT
 * needs a signed-in Studio user — apps/api Live/LiveFilters.cs), a demo design in this browser. The pages' filter bars
 * as the owner arranged them (bar.ts) travel in the same map under "_layout".
 */
const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const localKey = (id: string) => `d365.filters.${id}`
const LAYOUT = '_layout'
const HIDDEN = '_hidden'

/**
 * what is stored for a dashboard: each page's added filters, each page's bar, and the dashboard's hidden filters
 * ("Yashirin": they narrow every page for everyone, only Studio's own people get them — the server leaves them out for
 * anyone else and narrows the data itself). `hidden` null = not sent (a client view, an older server): a save then says
 * nothing of them, so it never clears them
 */
export interface StoredFilters {
  pages: PageFilters
  layout: BarLayouts
  hidden: FilterItem[] | null
}
export const NO_FILTERS: StoredFilters = { pages: {}, layout: {}, hidden: null }

/** the stored map → pages + layout (anything not of the shape is left out) */
export function splitStored(raw: unknown): StoredFilters {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NO_FILTERS
  const pages: PageFilters = {}
  let layout: BarLayouts = {}
  let hidden: FilterItem[] | null = null
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k === LAYOUT) layout = v && typeof v === 'object' && !Array.isArray(v) ? (v as BarLayouts) : {}
    else if (k === HIDDEN) hidden = Array.isArray(v) ? (v as FilterItem[]) : null
    else if (Array.isArray(v)) pages[k] = v as PageFilters[string]
  }
  return { pages, layout, hidden }
}

export function joinStored(s: StoredFilters): Record<string, unknown> {
  const out: Record<string, unknown> = { ...s.pages }
  if (Object.keys(s.layout).length) out[LAYOUT] = s.layout
  if (s.hidden) out[HIDDEN] = s.hidden
  return out
}

export async function loadFilters(scope: BlockScope, signal?: AbortSignal): Promise<StoredFilters> {
  if (scope.kind === 'demo') return splitStored(readLocal<unknown>(localKey(scope.id), {}))
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/filters`, { headers: { Accept: 'application/json' }, signal })
  return res.ok ? splitStored(await res.json()) : NO_FILTERS
}

export async function storeFilters(scope: BlockScope, all: StoredFilters): Promise<StoredFilters> {
  if (scope.kind === 'demo') {
    writeLocal(localKey(scope.id), joinStored(all))
    return all
  }
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/filters`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
    body: JSON.stringify(joinStored(all)),
  })
  if (!res.ok) throw new Error(`filters ${res.status}`)
  return splitStored(await res.json())
}
