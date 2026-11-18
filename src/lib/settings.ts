import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from './storage'

export type Lang = 'uz' | 'ru' | 'en'
export type ThemePref = 'auto' | 'light' | 'dark'
export type Accent = 'blue' | 'violet' | 'pink' | 'orange' | 'green' | 'teal' | 'graphite'
export type GlassStyle = 'clear' | 'tinted'
/** 'sky' = Camera Lab style living landscape; 'orbs' = calm pastel orbs. */
export type Backdrop = 'sky' | 'orbs'
/**
 * Studio's own background ("Ko'rinish" in the top bar): the Liquid orbs, a plain white page, or one of the calm
 * workspaces (lib/pageBg): Yumshoq ("soft") / Yumshoq tun ("night"), Kulrang ("ash"), Tumanli ("dim"), Iliq ("paper") —
 * each in its own light / dark
 */
export type StudioBg = 'liquid' | 'graphite' | 'white' | 'soft' | 'night' | 'ash' | 'dim' | 'paper'
export const STUDIO_BGS: readonly StudioBg[] = ['liquid', 'graphite', 'white', 'soft', 'night', 'ash', 'dim', 'paper']
/** the plain page a Studio background puts on its own pages (null = the Liquid orbs) */
export const studioPageBg = (bg: StudioBg | undefined): Exclude<StudioBg, 'liquid'> | null =>
  bg && bg !== 'liquid' && (STUDIO_BGS as readonly string[]).includes(bg) ? bg : null

export type FxMode = 'auto' | 'on' | 'off'

/** the Studio's effects in the theme on screen: on by default in both themes (the owner, 2026-11-09: the main pages look too plain without them).
 *  ERP maps stay solid whatever this says (`useSolidLook`). */
export const fxOn = (mode: FxMode, _theme: 'light' | 'dark'): boolean => mode !== 'off'

export interface Settings {
  lang: Lang
  theme: ThemePref
  /** Liquid Glass amount 0..1 */
  lq: number
  glass: GlassStyle
  /** Accent chosen by the user; when null the active workspace accent is used. */
  accent: Accent | null
  backdrop: Backdrop
  /** Studio's own pages (a dashboard on screen keeps its own look) */
  studioBg: StudioBg
  /** no longer read: the stored «on» of the old switch kept every browser in glass (see fx) */
  effects: boolean
  /**
   * Studio's own pages: glass, blur, coloured light and orbs, or solid colour (styles/solid.css). «auto» (the default): solid by day,
   * effects at night (owner, 2026-11-09: "by default if that's white … solid, but in the dark mode effects should be on"); «on» / «off»
   * once the «Effektlar» switch is used. A new key, so no stored older choice keeps a browser in either look.
   */
  fxMode: FxMode
  reducedMotion: boolean
  sidebarCollapsed: boolean
  /** set by the Bitrix24 onboarding */
  onboarded: boolean
  company: string
  portal: string
}

const KEY = 'nazar.settings'
const DEFAULTS: Settings = {
  lang: 'uz',
  theme: 'auto',
  lq: 0.6,
  glass: 'clear',
  accent: null,
  backdrop: 'orbs',
  studioBg: 'liquid',
  effects: true,
  fxMode: 'auto',
  reducedMotion: false,
  sidebarCollapsed: false,
  onboarded: false,
  company: '',
  portal: '',
}

let state: Settings = { ...DEFAULTS, ...readLocal<Partial<Settings>>(KEY, {}) }
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return state
}

export function updateSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch }
  writeLocal(KEY, state)
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}
