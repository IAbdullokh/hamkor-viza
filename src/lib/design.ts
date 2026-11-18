import { useSyncExternalStore } from 'react'

/**
 * Active Web-dashboard UI and what each of the five own looks is made of.
 *
 * API
 *  - setDesign(id) / useDesign(): the look on screen; ThemeController writes it as data-design on <html> (none for glass).
 *  - VARIANT_IDS / variantDesign('glass-pro') / designVariant('glasspro'): the picker's ids ↔ DesignId (old ids keep working).
 *  - VARIANT_TRAITS[id]: the facts that make the looks differ — layout of the KPI grid, KPI tile shape, card chrome,
 *    density, chart style. ds/looks (parts.tsx, looks.css, charts.ts) implements them; design.test.ts keeps them in step.
 *  - "Aralash" composes on top (lib/lookMix: setLookMix({ mood, density })): the base layout is still the data-design
 *    look (its grid, tiles, cards, chart shapes); data-mood (light / dark / neon) and data-density (airy / compact) only
 *    retune the tokens, and a neon mood also gives any base the Midnight chart pass (gradient bars, glowing lines).
 * Colour is NOT part of a design: it is the separate accent picker.
 */
export type DesignId = 'glass' | 'bento' | 'midnight' | 'minimal' | 'glasspro' | 'klassik'

/** the own looks as the look picker names them (Klassik: the earlier Data365 dashboard's look, 2026-11-04) */
export const VARIANT_IDS = ['glass', 'bento', 'midnight', 'minimal', 'glass-pro', 'klassik'] as const
export type VariantId = (typeof VARIANT_IDS)[number]

/** a picker id or a stored design id → the design; null for anything else */
export function variantDesign(id: string): DesignId | null {
  if (id === 'glass-pro' || id === 'glasspro') return 'glasspro'
  return id === 'glass' || id === 'bento' || id === 'midnight' || id === 'minimal' || id === 'klassik' ? id : null
}
export const designVariant = (d: DesignId): VariantId => (d === 'glasspro' ? 'glass-pro' : d)

export interface VariantTraits {
  /** how the KPI grid is laid out: even cards, asymmetric bento (2 × 2 hero), one fused strip, hairline cells, dense frosted rows */
  layout: 'cards' | 'bento' | 'strip' | 'rules' | 'frosted'
  /** KPI tile: tall card with the trend below / hero tile / instrument cell / bare number / icon-beside-number row */
  kpi: 'stacked' | 'hero' | 'cell' | 'bare' | 'row'
  /** card chrome: liquid glass / solid rounded tile / dark hairline panel / ink rule, no box / frosted with a coloured band */
  card: 'glass' | 'tile' | 'panel' | 'rule' | 'band'
  density: 'calm' | 'cozy' | 'dense' | 'airy'
  /** always dark, whatever the app theme */
  dark: boolean
  /** chart style: line width, area fill under single lines, bar max width + top radius, value-axis grid lines */
  chart: { line: number; area: boolean; bar: number; barRadius: number; grid: 'dashed' | 'solid' | 'none' }
}

export const VARIANT_TRAITS: Record<DesignId, VariantTraits> = {
  glass: { layout: 'cards', kpi: 'stacked', card: 'glass', density: 'calm', dark: false, chart: { line: 2.25, area: true, bar: 28, barRadius: 6, grid: 'dashed' } },
  bento: { layout: 'bento', kpi: 'hero', card: 'tile', density: 'cozy', dark: false, chart: { line: 3, area: true, bar: 34, barRadius: 10, grid: 'none' } },
  midnight: { layout: 'strip', kpi: 'cell', card: 'panel', density: 'dense', dark: true, chart: { line: 2, area: true, bar: 16, barRadius: 3, grid: 'solid' } },
  minimal: { layout: 'rules', kpi: 'bare', card: 'rule', density: 'airy', dark: false, chart: { line: 1.5, area: false, bar: 18, barRadius: 0, grid: 'none' } },
  glasspro: { layout: 'frosted', kpi: 'row', card: 'band', density: 'dense', dark: false, chart: { line: 2.5, area: true, bar: 26, barRadius: 12, grid: 'dashed' } },
  // the earlier Data365 dashboard's look, rebuilt on Studio's own pages so everything stays editable (owner, 2026-11-04)
  klassik: { layout: 'cards', kpi: 'stacked', card: 'tile', density: 'cozy', dark: false, chart: { line: 2.5, area: true, bar: 26, barRadius: 6, grid: 'dashed' } },
}
let current: DesignId | null = null
const listeners = new Set<() => void>()

/**
 * Only Liquid Glass is shown (owner, 2026-11-03: "Bento, Midnight, Minimal, Glass Pro — too many effects, not readable;
 * delete them everywhere"): a project, a published dashboard or a viewer still set to one of them gets Liquid Glass.
 * Klassik (the earlier Data365 dashboard's look on Studio's own pages, 2026-11-04) is shown as itself.
 */
export const SHOWN_DESIGN: DesignId = 'glass'
const SHOWN: readonly DesignId[] = ['glass', 'klassik']

export function setDesign(d: DesignId | null): void {
  d = d === null ? null : SHOWN.includes(d) ? d : SHOWN_DESIGN
  if (d === current) return
  current = d
  listeners.forEach((l) => l())
}

export function getDesign(): DesignId | null {
  return current
}

export function useDesign(): DesignId | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => current,
  )
}
