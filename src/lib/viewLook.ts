import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from './storage'
import { bgInTone, isPageBg, type PageBg } from './pageBg'
import type { Accent } from './settings'
import { variantDesign, type DesignId } from './design'

/**
 * A viewer's own look for one dashboard ("Ko'rinish", owner 2026-10-26: "not every person likes white, not every person
 * likes dark — the viewers should be able to change it"): the background (Fon), the theme (Mavzu) and the accent (Rang)
 * this browser prefers for this dashboard. It lives only in this browser (localStorage per dashboard) and sits over the
 * owner's defaults (the "Fon" saved on the server, the Studio settings); an empty choice = the owner's default.
 *
 * The dashboard on screen names itself with setViewScope (features/pagebg PageBgScope); ThemeController and PageBgScope
 * read the choice with useViewLook.
 */
export interface ViewLook {
  bg?: PageBg
  /** "system" = the device's own light / dark setting (prefers-color-scheme), not the Studio's Tashkent-sun "auto" */
  theme?: ViewTheme
  accent?: Accent
  /** "Effektlar": false = no backdrop blur, orbs, sheen, animations or heavy shadows; unset = on, unless the device asks
   *  for less motion (effectsOn) */
  fx?: boolean
  /** "Kartalar": Shisha (the liquid glass, the default) / Oddiy (solid, soft shadow) / Chiziqli (flat, thin border) */
  card?: CardStyle
  /** "Fon effektlari": false = no orbs / sky behind the page (a plain page in the Fon colour), the cards keep their glass
   *  and motion; unset = on. "Effektlar" off hides them too */
  bgfx?: boolean
  /** "Dizayn": this viewer's own look for the dashboard (one of the own-data looks); unset = the owner's default */
  design?: DesignId
}
export type ViewTheme = 'system' | 'light' | 'dark'
export type CardStyle = 'glass' | 'solid' | 'line'

const THEMES: readonly ViewTheme[] = ['system', 'light', 'dark']
export const CARD_STYLES: readonly CardStyle[] = ['glass', 'solid', 'line']
const ACCENTS: readonly Accent[] = ['blue', 'violet', 'pink', 'orange', 'green', 'teal', 'graphite']

/** a stored value as a ViewLook: anything unknown is dropped (an old or hand-edited entry never breaks the page) */
export function cleanLook(v: unknown): ViewLook {
  if (!v || typeof v !== 'object') return {}
  const o = v as Record<string, unknown>
  const out: ViewLook = {}
  if (isPageBg(o.bg)) out.bg = o.bg
  if (typeof o.theme === 'string' && (THEMES as readonly string[]).includes(o.theme)) out.theme = o.theme as ViewTheme
  if (typeof o.accent === 'string' && (ACCENTS as readonly string[]).includes(o.accent)) out.accent = o.accent as Accent
  if (typeof o.fx === 'boolean') out.fx = o.fx
  if (typeof o.card === 'string' && (CARD_STYLES as readonly string[]).includes(o.card)) out.card = o.card as CardStyle
  if (o.bgfx === false) out.bgfx = false
  // the stored id exactly as written ("glass-pro" is a picker spelling, never stored)
  if (typeof o.design === 'string' && variantDesign(o.design) === o.design) out.design = o.design
  return out
}

export const isEmptyLook = (l: ViewLook) => !l.bg && !l.theme && !l.accent && l.fx === undefined && !l.card && l.bgfx === undefined && !l.design

/** the viewer's "Effektlar": their own choice, else off on a device that asks for less motion (prefers-reduced-motion) */
/** a look whose effects start off (none now: owner, 2026-11-04, "in the old dashboard effects should be on by default too") */
const CALM_LOOKS: readonly string[] = []
/** "Effektlar" when the viewer chose nothing: on, unless the device asks for less motion or the look starts calm */
export const fxDefault = (reduceMotion: boolean, design?: string | null): boolean => !reduceMotion && !CALM_LOOKS.includes(design ?? '')
export const effectsOn = (l: ViewLook | null | undefined, reduceMotion: boolean, design?: string | null): boolean => l?.fx ?? fxDefault(reduceMotion, design)

/**
 * The effect switches ThemeController writes on <html> (data-fx / data-bgfx / data-solid / data-motion). A dashboard on
 * screen (`view` not null) follows only its viewer's own "Effektlar" — the Studio's top-bar fxMode never reaches it — and
 * a viewer who turned Effektlar on gets the motion back even when the Studio's own "less motion" setting is on. The
 * Studio's own pages: the top bar's Effektlar (fxMode) takes away only the orbs and the glass (data-bgfx / data-solid).
 */
export interface RootFx {
  fxOff: boolean
  bgFxOff: boolean
  solid: boolean
  motionReduced: boolean
}
export function rootFx(o: { view: ViewLook | null; deviceReduce: boolean; design?: string | null; studioFx: boolean; studioReducedMotion: boolean }): RootFx {
  const { view } = o
  if (view) {
    const fxOff = !effectsOn(view, o.deviceReduce, o.design)
    return { fxOff, bgFxOff: false, solid: false, motionReduced: fxOff || (o.studioReducedMotion && view.fx !== true) }
  }
  return { fxOff: false, bgFxOff: !o.studioFx, solid: !o.studioFx, motionReduced: o.studioReducedMotion }
}

/** the patch for flipping "Effektlar": the device's own default is stored as "no choice", so "Asl holiga" stays honest */
export const fxPatch = (on: boolean, reduceMotion: boolean, design?: string | null): ViewLook => ({ fx: on === fxDefault(reduceMotion, design) ? undefined : on })

/** the patch for a card style: Shisha is the default, stored as "no choice" */
export const cardPatch = (card: CardStyle): ViewLook => ({ card: card === 'glass' ? undefined : card })

/** the patch for "Fon effektlari": on is the default, stored as "no choice" */
export const bgFxPatch = (on: boolean): ViewLook => ({ bgfx: on ? undefined : false })

/** the patch for a "Dizayn" tile: the owner's default (`base`, the project's look) is stored as "no choice" */
export const designPatch = (design: DesignId, base: string): ViewLook => ({ design: design === base ? undefined : design })

const keyOf = (scope: string) => `d365.look.${scope}`

/** this browser's saved look for one dashboard ({} when none, unreadable or blocked) */
export const readViewLook = (scope: string): ViewLook => cleanLook(readLocal<unknown>(keyOf(scope), null))

let scope: string | null = null
let look: ViewLook | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** a published dashboard's address shows one dashboard only: its look never drops out between its pages */
let pinned: string | null = null

/** a published dashboard's own address (a pinned dashboard): its visitors start in the light Liquid look, not the sun's */
export const isPinnedView = (): boolean => pinned !== null

/** pins the dashboard this address shows (features/publish/kiosk) — set before the first frame */
export function pinViewScope(next: string): void {
  pinned = next
  setViewScope(next)
}

/** the dashboard now on screen ("live:<slug>" / "demo:<design>"), or null when it leaves */
export function setViewScope(next: string | null): void {
  // leaving a page of a pinned dashboard is not leaving it: no flash of the Studio's own theme in between
  if (next === null && pinned) next = pinned
  if (next === scope) return
  scope = next
  look = next ? readViewLook(next) : null
  emit()
}

/** changes this viewer's look for the dashboard on screen; undefined fields fall back to the owner's default */
export function updateViewLook(patch: ViewLook): void {
  if (!scope) return
  const next: ViewLook = { ...look, ...patch }
  for (const k of Object.keys(next) as (keyof ViewLook)[]) if (next[k] === undefined) delete next[k]
  look = next
  writeLocal(keyOf(scope), next)
  emit()
}

/** "Asl holiga": back to the owner's defaults */
export function resetViewLook(): void {
  if (!scope) return
  look = {}
  try {
    localStorage.removeItem(keyOf(scope))
  } catch {
    // optional preference only
  }
  emit()
}

/** null = no dashboard on screen (the Studio's own settings apply) */
export function useViewLook(): ViewLook | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => look,
    () => look,
  )
}

/**
 * Picking a theme while a plain background is chosen keeps the two in step (a light page cannot be dark): Qorong'i on a
 * light page takes its dark counterpart (Yumshoq yorug' → Ko'k tun, Oq → Qorong'i, Kulrang → Shifer) and Yorug' the
 * other way; Tizim goes back to the Liquid orbs, which follow it.
 */
export function bgForTheme(theme: ViewTheme, bg: PageBg, options: readonly PageBg[]): PageBg {
  if (bg === 'liquid') return bg
  const want: PageBg = theme === 'system' ? 'liquid' : bgInTone(bg, theme)
  return options.includes(want) ? want : bg
}

const DARK_Q = '(prefers-color-scheme: dark)'
function subscribeScheme(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(DARK_Q)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
const deviceDark = () => typeof window !== 'undefined' && !!window.matchMedia?.(DARK_Q).matches

/** the device's own light / dark setting, live */
export function useDeviceDark(): boolean {
  return useSyncExternalStore(subscribeScheme, deviceDark, () => false)
}

const MOTION_Q = '(prefers-reduced-motion: reduce)'
function subscribeMotion(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(MOTION_Q)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
const deviceReduce = () => typeof window !== 'undefined' && !!window.matchMedia?.(MOTION_Q).matches

/** the device asks for less motion (prefers-reduced-motion), live: "Effektlar" starts off there */
export function useDeviceReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, deviceReduce, () => false)
}
