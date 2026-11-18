import type { DesignId } from '@/lib/design'
import type { LookMixState } from '@/lib/lookMix'
import type { TFn } from '../labels'
import type { MixBase, MixDensity, MixMood, MixUiId } from '../types'
import './mix.css'

/**
 * "Aralash" — a look the client composes: a base layout (Glass / Bento / Minimal) + a colour mood (yorug' / qorong'i /
 * neon) + a density (keng / zich). Stored as one string `mix:<base>.<mood>.<density>` in Project.ui, so it round-trips
 * through PATCH /projects (Ids.cs UiIds.IsValid), /api/live and the share links unchanged. On a dashboard it renders as
 * the base design (its cards, charts and tokens) with data-mood / data-density on <html> (mix.css, ThemeController).
 */
export interface Mix {
  base: MixBase
  mood: MixMood
  density: MixDensity
}

export const MIX_BASES: readonly MixBase[] = ['glass', 'bento', 'minimal']
export const MIX_MOODS: readonly MixMood[] = ['light', 'dark', 'neon']
export const MIX_DENSITIES: readonly MixDensity[] = ['airy', 'compact']
export const MIX_PREFIX = 'mix:'
export const DEFAULT_MIX: Mix = { base: 'bento', mood: 'dark', density: 'compact' }

/** the parts of a mixed look id, or null for a preset / junk */
export function parseMix(ui: string | null | undefined): Mix | null {
  if (!ui || !ui.startsWith(MIX_PREFIX)) return null
  const parts = ui.slice(MIX_PREFIX.length).split('.')
  if (parts.length !== 3) return null
  const [base, mood, density] = parts as [MixBase, MixMood, MixDensity]
  if (!MIX_BASES.includes(base) || !MIX_MOODS.includes(mood) || !MIX_DENSITIES.includes(density)) return null
  return { base, mood, density }
}

export const mixId = (m: Mix): MixUiId => `mix:${m.base}.${m.mood}.${m.density}`
export const isMix = (ui: string | null | undefined): ui is MixUiId => parseMix(ui) !== null

/** what a dashboard does with a mix: the design to render with, the theme it forces and the data-attributes */
export interface ComposedMix {
  design: DesignId
  theme: 'light' | 'dark'
  layer: LookMixState
  attrs: { 'data-ds': DesignId; 'data-mood': MixMood; 'data-density': MixDensity }
}

export function composeMix(m: Mix): ComposedMix {
  return {
    design: m.base,
    theme: m.mood === 'light' ? 'light' : 'dark',
    layer: { mood: m.mood, density: m.density },
    attrs: { 'data-ds': m.base, 'data-mood': m.mood, 'data-density': m.density },
  }
}

export const mixBaseLabel = (t: TFn, b: MixBase) => ({ glass: () => t('Liquid Glass'), bento: () => t('Bento'), minimal: () => t('Minimal') })[b]()
export const mixMoodLabel = (t: TFn, m: MixMood) => ({ light: () => t("Yorug'"), dark: () => t("Qorong'i"), neon: () => t('Neon') })[m]()
export const mixDensityLabel = (t: TFn, d: MixDensity) => ({ airy: () => t('Keng'), compact: () => t('Zich') })[d]()

/** "Aralash · Bento · Qorong'i · Zich" */
export const mixLabel = (t: TFn, m: Mix) => [t('Aralash'), mixBaseLabel(t, m.base), mixMoodLabel(t, m.mood), mixDensityLabel(t, m.density)].join(' · ')

/**
 * Colours and shapes of the mini preview (MixPreview): the same choices the dashboard tokens make, in small.
 * `kind` is the card language of the base: frosted glass, solid tiles with a dark hero, or no cards (hairlines).
 */
export interface MixPreviewTokens {
  kind: 'glass' | 'tile' | 'rule'
  bg: string
  card: string
  hero: string
  heroInk: string
  ink: string
  muted: string
  line: string
  chart: [string, string, string]
  radius: number
  gap: number
  glow: string
}

const MOOD_COLORS: Record<MixMood, Pick<MixPreviewTokens, 'ink' | 'muted' | 'line' | 'chart' | 'glow'> & { bg: Record<MixBase, string>; card: Record<MixBase, string> }> = {
  light: {
    bg: { glass: 'linear-gradient(135deg,#c9dafe 0%,#efe9ff 45%,#fde4d6 75%,#c9f1e6 100%)', bento: '#f1f0ec', minimal: '#ffffff' },
    card: { glass: 'rgba(255,255,255,.62)', bento: '#ffffff', minimal: 'transparent' },
    ink: '#16161a',
    muted: '#6b6b73',
    line: 'rgba(22,22,30,.1)',
    chart: ['#4a6de4', '#10a58d', '#ff7a2f'],
    glow: 'none',
  },
  dark: {
    bg: { glass: 'linear-gradient(135deg,#1b2440 0%,#221d36 50%,#2a1f1c 100%)', bento: '#0d0d0f', minimal: '#121214' },
    card: { glass: 'rgba(255,255,255,.08)', bento: '#19191d', minimal: 'transparent' },
    ink: '#f4f4f6',
    muted: '#a1a1aa',
    line: 'rgba(255,255,255,.1)',
    chart: ['#8b8bff', '#2fd1b4', '#ff9b5c'],
    glow: 'none',
  },
  neon: {
    bg: { glass: 'radial-gradient(120% 90% at 10% 0%,#0e3a52 0%,#05070c 55%),#05070c', bento: '#05070c', minimal: '#05070c' },
    card: { glass: 'rgba(34,211,238,.07)', bento: '#0f141f', minimal: 'transparent' },
    ink: '#e8edf7',
    muted: '#8a94a8',
    line: 'rgba(34,211,238,.22)',
    chart: ['#22d3ee', '#e879f9', '#a3e635'],
    glow: '0 0 14px rgba(34,211,238,.35)',
  },
}

export function mixPreview(m: Mix): MixPreviewTokens {
  const c = MOOD_COLORS[m.mood]
  const kind = m.base === 'glass' ? 'glass' : m.base === 'bento' ? 'tile' : 'rule'
  const dense = m.density === 'compact'
  return {
    kind,
    bg: c.bg[m.base],
    card: c.card[m.base],
    hero: kind === 'tile' ? (m.mood === 'light' ? '#16161a' : c.chart[0]) : c.card[m.base],
    heroInk: kind === 'tile' ? (m.mood === 'light' ? '#ffffff' : '#05070c') : c.ink,
    ink: c.ink,
    muted: c.muted,
    line: c.line,
    chart: c.chart,
    radius: kind === 'rule' ? 0 : kind === 'tile' ? (dense ? 8 : 12) : dense ? 10 : 14,
    gap: dense ? 5 : 9,
    glow: c.glow,
  }
}
