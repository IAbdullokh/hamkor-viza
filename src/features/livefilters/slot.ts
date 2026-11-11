import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

/**
 * The page's own filter bar (kit/filters.tsx FilterBar) shows the added filters after its built-in ones: the dashboard
 * puts them here (FilterScope), the bar reads them. Outside a dashboard it is null and the bar is as before.
 */
export interface ExtraFilters {
  Chips: ComponentType
  /** any added filter narrows the page now */
  active: boolean
  clear: () => void
  /**
   * The whole row in the owner's order (livefilters/BarRow): the bar's own filters (`builtins`, keyed — bar.ts) and the
   * added ones, each movable in edit mode, the built-in ones hideable; then "+ Filtr".
   */
  Row?: ComponentType<{ builtins: BarEntry[] }>
  /**
   * The page's filter section (livefilters/FilterSection, owner 2026-10-26): a "Filtrlar (N faol)" bar with the chosen
   * values, and the panel with every filter (Row) that opens from it; `rest` (a counter, a search box) stays on the bar.
   */
  Section?: ComponentType<{ builtins: BarEntry[]; rest: ReactNode[]; ownActive: boolean; onClear?: () => void }>
  /**
   * "Yaratilgan sana" (field `created`) is the same date the bar's Davr filters by (owner, 2026-10-26: "I chose the date
   * filter and it still shows 30 kun"): FilterBar keeps the two in step — a range picked here becomes the Davr, another
   * Davr clears it.
   */
  created?: { from?: string; to?: string }
  setCreated?: (v: { from: string; to: string } | null) => void
}

/** one of the bar's own filters: its key (bar.ts barKeyOf; "range" = the Davr presets), its name, and the control */
export interface BarEntry {
  key: string
  /** an Uzbek key (translated where shown) */
  label: string
  node: ReactNode
  /** what it is set to now, for the section's summary (already translated); `clear` = the chip's ✕ */
  summary?: { text: string; clear?: () => void }
}

export const ExtraFiltersSlot = createContext<ExtraFilters | null>(null)
export const useExtraFilters = () => useContext(ExtraFiltersSlot)
