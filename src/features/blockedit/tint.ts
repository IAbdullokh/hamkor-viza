/**
 * Any colour for a block or a column, not only the tile colours (owner, 2026-10-26: "these are fixed colours — I have to
 * be able to choose any other"). A custom colour is kept as "#rrggbb" (LiveBlocks.cs / BlockStyle.IsHex refuse anything
 * else). Pure parts, tested in tint.test.ts: parsing a hex, its readable shades for text on a light and a dark card
 * (≥ 4.5:1), HSV for the picker, the preset shades and the recent colours of this browser; and the one DOM part — the
 * `.tile-x…` rule that gives a custom colour the same `--tile` a `.tile-blue` has.
 */

export type HexColor = `#${string}`

/** exactly "#" and six hex digits */
export const isHexColor = (v: unknown): v is HexColor => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

/** what was typed in the hex field as "#rrggbb" (the "#" may be left out), or null */
export function parseHex(input: string): HexColor | null {
  const s = input.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(s) ? (`#${s.toLowerCase()}` as HexColor) : null
}

export type Rgb = [number, number, number]
export const hexToRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
export const rgbToHex = (rgb: readonly number[]): HexColor =>
  `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}` as HexColor

/** WCAG relative luminance */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio of two colours (1 … 21) */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** a card's background at its least favourable (glass on a pastel page; dark glass) — the text is checked against it */
export const CARD_LIGHT = '#eef0f5'
export const CARD_DARK = '#2a2b30'

const mix = (hex: string, to: number, k: number): HexColor => rgbToHex(hexToRgb(hex).map((c) => c + (to - c) * k))

/**
 * The colour as readable on a card: itself when it already reaches `min` against the card, else darkened (light card)
 * or lightened (dark card) just enough.
 */
export function readable(hex: string, dark: boolean, min = 4.5): HexColor {
  const bg = dark ? CARD_DARK : CARD_LIGHT
  const base = hex.toLowerCase() as HexColor
  if (contrast(base, bg) >= min) return base
  for (let k = 0.04; k < 1; k += 0.04) {
    const next = mix(base, dark ? 255 : 0, k)
    if (contrast(next, bg) >= min) return next
  }
  return dark ? '#ffffff' : '#000000'
}

/* ── The picker: HSV ───────────────────────────────────────────────────────────────────────────────────── */

export interface Hsv {
  /** 0 … 360 */
  h: number
  /** 0 … 1 */
  s: number
  /** 0 … 1 */
  v: number
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255) as Rgb
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): HexColor {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return rgbToHex([f(5), f(3), f(1)].map((c) => c * 255))
}

/* ── Preset shades and recent colours ──────────────────────────────────────────────────────────────────── */

/** four tones per hue, light to deep: each reads on a light and a dark card once `readable` has had its say */
export const PRESET_SHADES: readonly (readonly HexColor[])[] = [
  ['#7fb2ff', '#3b82f6', '#1d5fd1', '#173f8a'],
  ['#a5a3f5', '#6366f1', '#4338ca', '#2e2a7a'],
  ['#c79bf2', '#a855f7', '#7e22ce', '#4c1d79'],
  ['#f59bc2', '#ec4899', '#be185d', '#7a1240'],
  ['#f79a9a', '#ef4444', '#b91c1c', '#7a1414'],
  ['#fbb672', '#f97316', '#c2560c', '#7c3608'],
  ['#f5d76e', '#eab308', '#a16207', '#6b4206'],
  ['#c3dc6a', '#84cc16', '#4d7c0f', '#708238'],
  ['#7fd99b', '#22c55e', '#15803d', '#1e5a33'],
  ['#6fd6c6', '#14b8a6', '#0f766e', '#0f4f4a'],
  ['#7fd3ee', '#06b6d4', '#0e7490', '#0f4a5c'],
  ['#c9b29b', '#a16207', '#8b5a2b', '#5a3a1e'],
  ['#c4c6cc', '#8a8f98', '#5b6070', '#2b2b2e'],
]

const RECENT_KEY = 'd365.recentColors'
export const MAX_RECENT = 8

/** the custom colours picked lately in this browser (newest first; nothing when storage is off) */
export function loadRecent(): HexColor[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter(isHexColor).map((h) => h.toLowerCase() as HexColor).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

/** the list with the colour put first (once) */
export const withRecent = (list: readonly HexColor[], hex: HexColor): HexColor[] =>
  [hex.toLowerCase() as HexColor, ...list.filter((h) => h.toLowerCase() !== hex.toLowerCase())].slice(0, MAX_RECENT)

export function pushRecent(hex: HexColor): HexColor[] {
  const next = withRecent(loadRecent(), hex)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private window / storage off: the list lives until reload */
  }
  return next
}

/* ── A custom colour as a tile class ───────────────────────────────────────────────────────────────────── */

/** the CSS of a custom colour's class: its `--tile` and its readable text shades on a light and a dark card */
export function tileRule(hex: HexColor): string {
  const h = hex.toLowerCase()
  const rgb = (x: string) => hexToRgb(x).join(' ')
  return `.tile-x${h.slice(1)}{--tile:${rgb(h)};--tile-ink-l:${rgb(readable(h, false))};--tile-ink-d:${rgb(readable(h, true))}}`
}

const injected = new Set<string>()

/**
 * The class that colours an element like `.tile-blue` does: a tile colour's own, or "tile-custom tile-x…" for a hex
 * (its rule added to the page once). Undefined for no colour.
 */
export function tileClass(c: string | undefined): string | undefined {
  if (!c) return undefined
  if (!isHexColor(c)) return `tile-${c}`
  const h = c.toLowerCase() as HexColor
  if (!injected.has(h) && typeof document !== 'undefined') {
    injected.add(h)
    let el = document.getElementById('d365-custom-tiles') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'd365-custom-tiles'
      document.head.appendChild(el)
    }
    el.appendChild(document.createTextNode(tileRule(h)))
  }
  return `tile-custom tile-x${h.slice(1)}`
}
