import type { DesignId } from '@/lib/design'
import type { PresetUiId, UiId } from '../types'
import { composeMix, parseMix } from './mix'

/**
 * Looks that render the project's own data: the same 7 pages through the same components, each with its own layout
 * density, card style, type scale, colour tokens and chart palette (src/ds/looks, `data-design` on <html>).
 * In the Look step they are one family, "Liquid", with five variants (+ "Aralash", look/mix.ts).
 */
export const OWN_LOOKS = ['glass', 'bento', 'midnight', 'minimal', 'glasspro'] as const satisfies readonly (PresetUiId & DesignId)[]

/** the copied Data365 dashboards (sample data, uis/<folder>) */
export const COPIED_UIS = ['klassik', 'statistik', 'kompakt'] as const satisfies readonly PresetUiId[]

export const UI_IDS: PresetUiId[] = [...OWN_LOOKS, ...COPIED_UIS]

/** the Liquid variant ids (same as OWN_LOOKS; "glass-pro" is accepted as a spelling of glasspro, see normalizeUi) */
export type LiquidVariant = (typeof OWN_LOOKS)[number]

/** the look picker's cards: the Liquid family (5 variants + Aralash) and the copied UIs, each its own card */
export type LookFamily = 'liquid' | (typeof COPIED_UIS)[number]

/** where a stored look sits in the picker: an old preset id, a variant or a mix all land on a family card */
export function lookFamily(ui: UiId): { family: LookFamily; variant: LiquidVariant | 'mix' | null } {
  if (parseMix(ui)) return { family: 'liquid', variant: 'mix' }
  if ((OWN_LOOKS as readonly string[]).includes(ui)) return { family: 'liquid', variant: ui as LiquidVariant }
  return { family: ui as (typeof COPIED_UIS)[number], variant: null }
}

/** a known look id, or null; tolerates the hyphenated "glass-pro" spelling */
export function normalizeUi(ui: string | null | undefined): UiId | null {
  if (!ui) return null
  if (ui === 'glass-pro') return 'glasspro'
  if ((UI_IDS as string[]).includes(ui)) return ui as PresetUiId
  return parseMix(ui) ? (ui as UiId) : null
}

/**
 * the design a UI renders with (a mix renders with its base), or null for a copied dashboard. Klassik is a look of
 * Studio's own pages now (owner, 2026-11-04: "we replaced the old version with the new one"): the project's data in its
 * look, editable like Liquid Glass.
 */
export const lookDesign = (ui: UiId): DesignId | null => {
  const m = parseMix(ui)
  if (m) return composeMix(m).design
  // the earlier Data365 dashboards are looks of Studio's own pages now (owner, 2026-11-04)
  if (ui === 'klassik') return 'klassik'
  return (OWN_LOOKS as readonly string[]).includes(ui) ? (ui as DesignId) : null
}

/** the preview image id (public/previews/<id>-<theme>.jpg): a mix shows its base */
export const uiPreviewId = (ui: UiId): PresetUiId => parseMix(ui)?.base ?? (ui as PresetUiId)

/** where "Ko'rib chiqish" opens the sample (a new tab, so the wizard is never lost) */
export const uiSampleHref = (ui: UiId) => (lookDesign(ui) ? `#/d/${ui}/lead` : `#/ui/${ui}`)

/** the own looks (Klassik among them) render the project's own data; Statistik and Kompakt still show sample data (SPEC §1 "Live UIs") */
export const rendersOwnData = (ui: UiId) => lookDesign(ui) !== null
