import { useEffect, useSyncExternalStore } from 'react'
import { fxOn, studioPageBg, useSettings, type Accent } from '@/lib/settings'
import { isDaylight } from '@/lib/sun'
import { useDesign } from '@/lib/design'
import { useLookMix } from '@/lib/lookMix'
import { bgInTone, bgTone, usePageBg, type PageBg } from '@/lib/pageBg'
import { isPinnedView, rootFx, useDeviceDark, useDeviceReducedMotion, useViewLook } from '@/lib/viewLook'
import { readLocal, writeLocal } from '@/lib/storage'
import '@/features/viewlook/viewfx.css'
import '@/styles/solid.css'

/**
 * Writes the visual settings onto <html>: data-theme (always resolved), data-accent, data-glass, data-bg (a dashboard's
 * plain background, lib/pageBg), data-fx / data-card / data-bgfx (a viewer's Effektlar / Kartalar / Fon effektlari,
 * lib/viewLook), data-motion and
 * --lq. "auto" theme follows the Tashkent sun: light by day, dark after sunset.
 */

/**
 * Day or night by the Tashkent sun, one clock for the whole page (owner, 2026-11-07: around sunset a catalog picture turned
 * dark while the page was still light). Each caller used to keep its own reading, so one mounted later could flip up to a
 * minute before the page did; now every caller and the page itself change on the same tick.
 */
const dayListeners = new Set<() => void>()
let dayNow = isDaylight()
let dayTimer: ReturnType<typeof setInterval> | null = null
function subscribeDay(listener: () => void): () => void {
  if (!dayTimer) {
    dayNow = isDaylight()
    dayTimer = setInterval(() => {
      const d = isDaylight()
      if (d === dayNow) return
      dayNow = d
      for (const f of dayListeners) f()
    }, 60_000)
  }
  dayListeners.add(listener)
  return () => {
    dayListeners.delete(listener)
    if (dayListeners.size === 0 && dayTimer) {
      clearInterval(dayTimer)
      dayTimer = null
    }
  }
}
const readDay = () => dayNow

export function useResolvedTheme(): 'light' | 'dark' {
  const settings = useSettings()
  // a dashboard viewer's own "Mavzu" (Ko'rinish, lib/viewLook) for the dashboard on screen
  const view = useViewLook()
  const viewTheme = view?.theme
  const deviceDark = useDeviceDark()
  // a published dashboard's visitor with no "Mavzu" of their own sees it light (the Liquid look), day and night — the
  // Studio's "auto" (dark after sunset) is the owner's own setting, not the dashboard's (owner, 2026-10-27)
  const fallback = view && isPinnedView() ? 'light' : settings.theme
  const theme = viewTheme === 'system' ? (deviceDark ? 'dark' : 'light') : (viewTheme ?? fallback)
  // an "Aralash" look on screen fixes the theme: yorug' = light, qorong'i / neon = dark (lib/lookMix)
  const mix = useLookMix()
  // a dashboard's plain background ("Fon": oq / kulrang / qorong'i, lib/pageBg) fixes it too
  const bg = usePageBg()
  // a calm Studio workspace (Yumshoq, Kulrang, Tumanli… in the top bar's "Ko'rinish") on the Studio's own pages
  const studio = view ? null : studioPageBg(settings.studioBg)
  const day = useSyncExternalStore(subscribeDay, readDay)
  if (mix) return mix.mood === 'light' ? 'light' : 'dark'
  const tone = bg ? bgTone(bg) : null
  if (tone === 'dark') return 'dark'
  // a light page the viewer picked in "Ko'rinish" means light; the owner's light DEFAULT only means "no orbs" and follows
  // the viewer's own light / dark (owner, 2026-10-26: "my Mac is dark, but the dashboard isn't")
  if (tone === 'light' && view?.bg) return 'light'
  // a calm Studio workspace is its own tone: Yumshoq tun / Tumanli dark, Yumshoq / Kulrang / Iliq light (Oq still
  // follows the theme)
  if (!bg && studio && studio !== 'white') return bgTone(studio) ?? 'light'
  if (theme === 'auto') return day ? 'light' : 'dark'
  return theme
}

/** the theme last shown in this browser (per address: localStorage is per origin) */
const LAST_THEME = 'd365.theme.last'

/**
 * Before the first frame (main.tsx): the theme this browser showed last, so a page that starts while it is still asking
 * the server (a published dashboard's address, the sign-in check) doesn't flash the dark default first.
 */
export function applyLastTheme(): void {
  const last = readLocal<unknown>(LAST_THEME, null)
  if (last === 'light' || last === 'dark') document.documentElement.dataset.theme = last
}

/** the browser bar colour for a plain page (the same as its --page-bg in features/pagebg/pagebg.css) */
const BAR: Partial<Record<PageBg, string>> = {
  graphite: '#1c1c1e',
  soft: '#eef3f9',
  white: '#f7f8fa',
  gray: '#e9ecf0',
  ash: '#eceef1',
  paper: '#f4f2ee',
  night: '#1b1d21',
  dim: '#2a2e35',
  slate: '#2a3442',
  navy: '#16233a',
  dark: '#1c1c1e',
}

export function ThemeController({ workspaceAccent }: { workspaceAccent: Accent | null }) {
  const s = useSettings()
  const theme = useResolvedTheme()
  const design = useDesign()
  const mix = useLookMix()
  const pageBg = usePageBg()
  // a dashboard on screen keeps its own look (lib/viewLook); the Studio's own pages take the top bar's "Ko'rinish"
  const view = useViewLook()
  const studioBg: PageBg | null = view ? null : studioPageBg(s.studioBg)
  const shownBg = pageBg ?? studioBg
  // the owner's plain light page shown to a viewer in dark mode is its dark counterpart (Oq → Qorong'i, …)
  const bg = shownBg && theme === 'dark' ? bgInTone(shownBg, 'dark') : shownBg
  // a dashboard viewer's own "Rang" (Ko'rinish, lib/viewLook) for the dashboard on screen
  const viewAccent = view?.accent
  const accent = viewAccent ?? s.accent ?? workspaceAccent ?? 'blue'
  // and their own "Effektlar" / "Kartalar" (features/viewlook/viewfx.css); off the dashboard nothing changes
  const deviceReduce = useDeviceReducedMotion()
  // Studio's own "Effektlar" off takes away only the coloured orbs behind the page — the glass, light and motion stay
  // (owner, 2026-10-29: "turning effects off should not make it plain"); a dashboard viewer's own choice is unchanged
  const studioFx = fxOn(s.fxMode, theme)
  // a dashboard follows only its viewer's own "Effektlar" (lib/viewLook rootFx); the Studio's pages the top bar's
  const { fxOff, bgFxOff, solid, motionReduced } = rootFx({ view, deviceReduce, design, studioFx, studioReducedMotion: s.reducedMotion })
  const card = view?.card
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    writeLocal(LAST_THEME, theme)
    if (design && design !== 'glass') root.dataset.design = design
    else delete root.dataset.design
    if (mix) {
      root.dataset.mood = mix.mood
      root.dataset.density = mix.density
    } else {
      delete root.dataset.mood
      delete root.dataset.density
    }
    if (bg && bg !== 'liquid') root.dataset.bg = bg
    else delete root.dataset.bg
    root.dataset.accent = accent
    root.dataset.glass = s.glass
    root.style.setProperty('--lq', String(s.lq))
    if (fxOff) root.dataset.fx = 'off'
    else delete root.dataset.fx
    if (card && card !== 'glass') root.dataset.card = card
    else delete root.dataset.card
    if (bgFxOff) root.dataset.bgfx = 'off'
    else delete root.dataset.bgfx
    if (solid) root.dataset.solid = ''
    else delete root.dataset.solid
    if (motionReduced) root.dataset.motion = 'reduced'
    else delete root.dataset.motion
    root.lang = s.lang === 'uz' ? 'uz' : s.lang
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', (bg && BAR[bg]) || (theme === 'dark' ? '#1c1c1e' : '#eef0f6'))
  }, [theme, design, mix, bg, accent, s.glass, s.lq, s.lang, fxOff, card, bgFxOff, solid, motionReduced])

  return null
}
