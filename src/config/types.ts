import type { IndustryId, PageId, UiId } from '@/features/projects/types'
import type { BlockEdits as StudioBlockEdits } from '@/features/blockedit/context'
import type { PageCharts } from '@/features/addchart/model'

/** The dashboard itself: which pages it shows, its industry words, its look, and where its live data is published. */
export interface ProjectConfig {
  /** Studio's project id (only for reference) */
  projectId: string
  /** the dashboard's slug: the live API reads /api/live/<slug>/… */
  slug: string
  /** shown on the login card and in the browser tab */
  name: string
  /** the industry's words (Lidlar → Bemorlar) and KPI order */
  industry: IndustryId
  /** the base look ('glass' = Liquid Glass) */
  ui: UiId
  /** the pages, in menu order */
  pages: PageId[]
  /** the published address whose server answers /api (the hub domain), e.g. "name.data365dashboard.uz" */
  publishedHost: string
}

/** block id ("<page>:<kind>:<title>") → its edit: { hidden, title, span, h, color, table … } */
export type BlockEdits = StudioBlockEdits
/** page id → the charts added with «+ Grafik» */
export type AddedCharts = PageCharts
/** page id → the filters added with «+ Filtr» (plus "_layout" / "_hidden" of the filter bar) */
export type AddedFilters = Record<string, unknown>
/** the dashboard's background («Fon»: liquid, white, gray, dark …) and «Jonli yangilanish» */
export interface PagePrefs {
  background?: string
  realtime?: boolean
  [key: string]: unknown
}
