import { createContext, useContext } from 'react'
import type { Db } from '@/data/db'
import type { FieldDef, FilterItem, FilterValue } from './fields'
import type { BarLayout } from './bar'
import type { ApplyPlan } from './picker'
import type { PortalField, PortalState } from './portal'
import type { WaitingField } from './waiting'

/** what FilterScope gives the filter chips (and anything else on the page that wants the added filters) */
export interface LiveFiltersCtx {
  /** the dashboard page (its own filter bar's fields are not offered again — fields.ts BUILTIN) */
  page: string
  /** a live dashboard's address (its CRM fields not in the data yet can be read in: portal.ts); null for a demo design */
  slug: string | null
  /** the fields this data can filter by (the picker's list) */
  fields: FieldDef[]
  byKey: Map<string, FieldDef>
  /** the page's added filters as chips, in order (only fields this data has; fields.ts chipsOf) */
  items: FilterItem[]
  /** added now and not stored yet: it is stored once it has a value */
  isDraft: (key: string) => boolean
  value: (key: string) => FilterValue | undefined
  setValue: (key: string, v: FilterValue | null) => void
  canEdit: boolean
  editing: boolean
  add: (key: string) => void
  /** several at once (the picker's ticks); `hidden` adds them as the dashboard's hidden filters */
  addMany: (keys: string[], hidden?: boolean) => void
  remove: (key: string) => void
  move: (from: number, to: number) => void
  saveDefault: (key: string, v: FilterValue | null) => void
  activeCount: number
  clear: () => void
  /** the data before the page's own filters (the lists' values): narrowed by the hidden filters only */
  raw: Db
  /**
   * the dashboard's hidden filters ("Yashirin"): every page, everyone's data, seen and changed only by Studio's own people
   * (the server gives them to no one else and narrows a client view's data itself); empty for anyone else
   */
  hidden: FilterItem[]
  /** a Studio user in edit mode: may hide a filter, change or remove a hidden one */
  hideable: boolean
  setHidden: (key: string, on: boolean) => void
  setHiddenValue: (key: string, v: FilterValue | null) => void
  removeHidden: (key: string) => void
  picker: boolean
  setPicker: (v: boolean) => void
  /** the page's filter bar as arranged (order of all its filters, built-in ones hidden from viewers — bar.ts) */
  layout: BarLayout | undefined
  /**
   * stores the page's bar (null = its own order, everything shown); rolls back with a toast if not stored. Outside edit
   * mode only its order counts, and it is this viewer's own (in their browser)
   */
  setLayout: (l: BarLayout | null) => Promise<boolean>
  /** outside edit mode: this viewer is arranging their own filters (⠿ / ✕ shown) */
  arranging: boolean
  setArranging: (v: boolean) => void
  /** this viewer's filters differ from the dashboard's defaults (personal.ts) — never in edit mode */
  mine: boolean
  /** filters this viewer took off their bar (a "+ name" brings one back) */
  removedByMe: string[]
  restore: (key: string) => void
  /** back to the dashboard's defaults (this browser forgets this page's own filters) */
  resetMine: () => void
  /**
   * «Filtr maydonlari»' «Standart»: the page's default set — outside edit mode the dashboard's own filters (without this
   * viewer's changes), in edit mode the ones the dashboard has published (without the unpublished draft's)
   */
  defaultSet: string[]
  /** «Qo'llash»: adds, takes off and starts reading in one go (one stored write) */
  applyPicker: (plan: ApplyPlan) => Promise<void>
  /** a live dashboard's CRM fields not in the data yet (a Studio user only; null otherwise) */
  portal: PortalState | null
  /** fields ticked whose data is being read: they become filters when it is in */
  waiting: WaitingField[]
  dropWaiting: (key: string) => void
  /** reads one field again (a failed read's ↻) */
  retryFill: (field: PortalField) => void
}

export const FiltersCtx = createContext<LiveFiltersCtx | null>(null)
export const useLiveFilters = () => useContext(FiltersCtx)
