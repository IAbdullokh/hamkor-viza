import { useSyncExternalStore } from 'react'

/**
 * A dashboard's background ("Fon", owner 2026-10-26: "I don't like the background of the lights — I want one white
 * version; when a person is analysing it, the effects distract"): "liquid" = the coloured orbs (the default, as before),
 * or a plain page — "soft", "white", "gray" (light), "slate", "navy", "dark" (dark) — with no orbs, no pointer lights, and cards
 * given a hairline and a soft shadow so they still stand apart. Saved per dashboard (features/pagebg), set here while the
 * dashboard is on screen; ThemeController writes it as data-bg on <html> and the theme follows it (bgTone). Only the Liquid looks use it.
 */
export type PageBg = 'liquid' | 'graphite' | 'soft' | 'white' | 'gray' | 'ash' | 'paper' | 'night' | 'dim' | 'slate' | 'navy' | 'dark'
/**
 * The order the pickers show them, light to dark (owner 2026-10-26: "the colour is not user-friendly — could it be blue,
 * easier to work with, not very dark"): "soft" = Yumshoq yorug' (off-white, blue-tinted), "slate" = Shifer (a mid-tone
 * blue-grey), "navy" = Ko'k tun (dark navy, never black). The calm workspaces (owner 2026-10-27: "not dark black —
 * something with a different colour, but calm enough to analyse data"): "ash" = Kulrang (sokin, neutral grey),
 * "paper" = Iliq (warm paper), "dim" = Tumanli (a dim mid-dark grey, never black); "night" = Yumshoq tun, Yumshoq
 * yorug' in the dark (calm graphite, each card keeps its own colour tint). The tokens live in
 * features/pagebg/pagebg.css.
 */
// "graphite" = Grafit (owner, 2026-10-27: "I like this version, save it"): the calm graphite dark with faint orbs
export const PAGE_BGS: readonly PageBg[] = ['liquid', 'graphite', 'soft', 'white', 'gray', 'ash', 'paper', 'night', 'dim', 'slate', 'navy', 'dark']
export const isPageBg = (v: unknown): v is PageBg => typeof v === 'string' && (PAGE_BGS as readonly string[]).includes(v)

/** a plain page's own light / dark (the theme follows it); Liquid has none — the orbs follow the theme */
export function bgTone(bg: PageBg): 'light' | 'dark' | null {
  if (bg === 'liquid') return null
  return bg === 'graphite' || bg === 'night' || bg === 'dim' || bg === 'slate' || bg === 'navy' || bg === 'dark' ? 'dark' : 'light'
}

/**
 * each plain page's counterpart in the other tone: Yumshoq yorug' ↔ Yumshoq tun (Ko'k tun → Yumshoq yorug'), Oq ↔ Qorong'i, Kulrang ↔ Shifer,
 * Kulrang (sokin) ↔ Tumanli, Iliq → Tumanli
 */
const PAIR: Record<PageBg, PageBg> = {
  liquid: 'liquid',
  graphite: 'liquid',
  soft: 'night',
  night: 'soft',
  navy: 'soft',
  white: 'dark',
  dark: 'white',
  gray: 'slate',
  slate: 'gray',
  ash: 'dim',
  dim: 'ash',
  paper: 'dim',
}

/** the same page in the wanted tone (a light page asked to be dark takes its dark counterpart, and back) */
export function bgInTone(bg: PageBg, tone: 'light' | 'dark'): PageBg {
  const own = bgTone(bg)
  return own && own !== tone ? PAIR[bg] : bg
}

/** what the look itself is: always dark (Midnight, an Aralash qorong'i / neon mood), always light (Aralash yorug'), or either */
export type LookTone = 'dark' | 'light' | 'any'

/** the backgrounds a look can take: an always-dark look has no light page, an always-light one no dark page */
export function bgsFor(tone: LookTone): PageBg[] {
  if (tone === 'any') return [...PAGE_BGS]
  return PAGE_BGS.filter((b) => bgTone(b) === null || bgTone(b) === tone)
}

/** the saved choice as this look can show it: a plain page stays plain, in the look's own tone */
export function effectiveBg(bg: PageBg, tone: LookTone): PageBg {
  return tone === 'any' ? bg : bgInTone(bg, tone)
}

let current: PageBg | null = null
const listeners = new Set<() => void>()

/** null = no dashboard sets one (the app's own wallpaper) */
export function setPageBg(bg: PageBg | null): void {
  if (bg === current) return
  current = bg
  listeners.forEach((l) => l())
}

export function usePageBg(): PageBg | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => current,
  )
}
