import type { JSX } from 'react'
import type { DesignId } from '@/lib/design'
import type { StatCardProps } from '@/ui/glass'
import type { CardProps } from '@/ui/controls'
import type { ChartColors } from '@/charts/theme'

/**
 * Per-UI component variants. Each of the owner's dashboard UIs (src/ds/<id>/) registers its own versions of the
 * core building blocks; the shared components (StatCard, Card, EChart theme, DataTable) hand over to them when
 * that UI is active. Missing entries fall back to the Liquid Glass defaults.
 */
export interface DSVariant {
  StatCard?: (p: StatCardProps) => JSX.Element
  Card?: (p: CardProps) => JSX.Element
  /** tweak the ECharts theme (fonts, grid, bar radius, tooltip…) */
  chartTheme?: (c: ChartColors, base: Record<string, unknown>) => Record<string, unknown>
  /** a pass over each chart's own option before setOption (area / bar fills the builders set explicitly; ds/looks/charts.ts) */
  option?: (opt: Record<string, unknown>, c: ChartColors) => Record<string, unknown>
  /** numeric table cells get a thin proportional bar (K-davo "bar-in-cell" grids) */
  tableBars?: boolean
}

export const DS: Partial<Record<DesignId, DSVariant>> = {}

export function registerDS(id: DesignId, v: DSVariant): void {
  DS[id] = v
}
