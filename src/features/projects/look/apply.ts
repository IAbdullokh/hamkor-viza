import { useEffect } from 'react'
import { setLookMix } from '@/lib/lookMix'
import { composeMix, parseMix } from './mix'

/**
 * While a dashboard shows an "Aralash" look, put its mood + density on the page (lib/lookMix → ThemeController writes
 * data-mood / data-density on <html> and fixes the theme). The base design itself is set by the page as before
 * (lookDesign(ui) → setDesign). Presets clear the layer.
 */
export function useLookLayer(ui: string | null | undefined): void {
  const key = ui ?? ''
  useEffect(() => {
    // Aralash is retired with the other looks (owner, 2026-11-03: only Liquid Glass): a stored mix shows plain Liquid Glass
    if (!RETIRED && parseMix(key)) {
      setLookMix(composeMix(parseMix(key)!).layer)
      return () => setLookMix(null)
    }
  }, [key])
}

/** Aralash's mood / density layer is off while only Liquid Glass is offered */
const RETIRED = true
