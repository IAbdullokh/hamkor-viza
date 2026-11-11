import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'
import { readLocal, writeLocal } from '@/lib/storage'
import { isPageBg, type PageBg } from '@/lib/pageBg'
import type { BlockScope } from '@/features/blockedit/context'

/**
 * Where a dashboard's background lives: a live project on the server (GET is as public as the dashboard link, PUT needs
 * a signed-in Studio user — apps/api Live/LivePrefs.cs), a demo design in this browser. The last value read is also kept
 * in this browser, so a dashboard opened again starts on its own background instead of flashing the orbs first.
 */
const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'
const keyOf = (scope: BlockScope) => (scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`)
const localKey = (scope: BlockScope) => `d365.prefs.${keyOf(scope)}`

interface Prefs {
  background?: string
}

// a dashboard nobody chose a background for opens on its look's own (owner, 2026-11-04): Liquid Glass on the Liquid
// orbs (2026-10-27: "by default it should be liquid glass"), Klassik on a plain white page; "Fon" picks any
export const DEFAULT_BG: PageBg = 'liquid'
export const defaultBgFor = (design: string | null | undefined): PageBg =>
  design === 'klassik' ? 'white' : DEFAULT_BG
/** …and on a dashboard: the earlier Data365 dashboards that run inside Studio (src/originals, demo scope "<id>-asl",
 *  Statistik) open on a white page like Klassik, effects on (owner, 2026-11-04) */
export const defaultBgIn = (design: string | null | undefined, scope: BlockScope): PageBg =>
  scope.kind === 'demo' && scope.id.endsWith('-asl') ? 'white' : defaultBgFor(design)
/** the chosen background, or null when nobody chose one (the look's default then) */
const bgOf = (p: Prefs | null | undefined): PageBg | null => (p && isPageBg(p.background) ? p.background : null)

/** what this browser last saw for the dashboard (instant, before the server answers) */
export const cachedBg = (scope: BlockScope): PageBg | null => bgOf(readLocal<Prefs | null>(localKey(scope), null))

export async function loadBg(scope: BlockScope, signal?: AbortSignal): Promise<PageBg | null> {
  if (scope.kind === 'demo') return cachedBg(scope)
  const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/prefs`, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return cachedBg(scope)
  const bg = bgOf((await res.json()) as Prefs)
  writeLocal(localKey(scope), { background: bg })
  return bg
}

export async function storeBg(scope: BlockScope, bg: PageBg): Promise<PageBg | null> {
  if (scope.kind === 'live') {
    const res = await fetch(`${BASE}/live/${encodeURIComponent(scope.slug)}/prefs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', [CSRF_HEADER]: CSRF_VALUE },
      body: JSON.stringify({ background: bg }),
    })
    if (!res.ok) throw new Error(`prefs ${res.status}`)
    const stored = bgOf((await res.json()) as Prefs)
    writeLocal(localKey(scope), { background: stored })
    return stored
  }
  writeLocal(localKey(scope), { background: bg })
  return bg
}
