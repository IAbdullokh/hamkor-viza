import { useSyncExternalStore } from 'react'

/**
 * The "Aralash" (mixed look) layer on top of the active design (lib/design): while a dashboard shows a mixed look it
 * sets the colour mood and the density here; ThemeController writes them as data-mood / data-density on <html> and
 * the resolved theme follows the mood (yorug' = light, qorong'i / neon = dark). null = no mix (the preset looks).
 */
export interface LookMixState {
  mood: 'light' | 'dark' | 'neon'
  density: 'airy' | 'compact'
}

let current: LookMixState | null = null
const listeners = new Set<() => void>()

export function setLookMix(m: LookMixState | null): void {
  if (m === current || (m && current && m.mood === current.mood && m.density === current.density)) return
  current = m
  listeners.forEach((l) => l())
}

export function getLookMix(): LookMixState | null {
  return current
}

export function useLookMix(): LookMixState | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => current,
  )
}
