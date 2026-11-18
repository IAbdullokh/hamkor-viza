import { project } from './project.gen'
import { blocks } from './blocks.gen'
import { charts } from './charts.gen'
import { filters } from './filters.gen'
import { prefs } from './prefs.gen'
import type { AddedCharts, AddedFilters, BlockEdits, PagePrefs, ProjectConfig } from './types'

export type { AddedCharts, AddedFilters, BlockEdits, PagePrefs, ProjectConfig }

/**
 * The dashboard's whole configuration. Studio used to serve the last four from its server (GET /api/live/<slug>/blocks,
 * /charts, /filters, /prefs); in this copy they are these files, answered locally by src/app/api.ts.
 */
export const config = { project, blocks, charts, filters, prefs } as const

/** what the app answers for GET /api/live/<slug>/<kind> (undefined: not a config kind, the server answers) */
export function configAnswer(kind: string): unknown {
  switch (kind) {
    case 'blocks':
      return config.blocks
    case 'charts':
      return config.charts
    case 'filters':
      return config.filters
    case 'prefs':
      return config.prefs
    default:
      return undefined
  }
}
