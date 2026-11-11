/**
 * Data365 Studio JSON specs — the single source of truth that the Wizard, SQL and Code editors all read and write.
 * Versioned so stored dashboards can be migrated. Field references are by field id.
 */
import type { ValueType } from '@/formula'

export type Format = 'number' | 'money' | 'usd' | 'percent' | 'duration' | 'minutes' | 'date' | 'text' | 'decimal' | 'weekday' | 'hour'

/* ---------------- Dataset (semantic layer) ---------------- */

export interface DatasetField {
  id: string
  /** Display name, Uzbek. Formulas reference fields by this name: [Lidlar soni] */
  name: string
  kind: 'dimension' | 'measure'
  /** Formula over source columns and other fields. A raw column is just "[Manba]". */
  formula: string
  format?: Format
  description?: string
  /** why every value of this measure can be empty; a chart says it instead of drawing a blank card */
  empty?: string
  /** true = user-made calculated field (shown with ƒ) */
  calculated?: boolean
}

export interface DatasetSpec {
  version: 1
  id: string
  name: string
  description: string
  /** source table name (see data/tables.ts) */
  table: string
  /** column used by date selectors */
  dateField: string
  fields: DatasetField[]
}

/* ---------------- Chart ---------------- */

export type VisualType =
  | 'line'
  | 'area'
  | 'column'
  | 'stacked'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'funnel'
  | 'kpi'
  | 'table'
  | 'heatmap'
  | 'combo'
  // Bento blocks (charts/BentoViews.tsx, owner 2026-11-03): a card that reads a whole cut, not a one-bar chart
  | 'scorecard'
  | 'matrix'
  | 'queue'
  | 'pacing'
  | 'diagnostic'
  // the chart pencil's extra forms (charts/variants.ts): drawn on a dashboard, never a saved chart spec's own visual
  | 'step'
  | 'stackedArea'
  | 'stacked100'
  | 'rose'
  | 'treemap'
  | 'radial'
  | 'lollipop'
  | 'radar'

export type FilterOp = 'in' | 'not_in' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'is_true' | 'is_false'

export interface FilterSpec {
  field: string
  op: FilterOp
  values: (string | number | boolean)[]
}

export interface OwnMeasure {
  id: string
  name: string
  formula: string
  format?: 'number' | 'percent' | 'money'
}

export interface ChartSpec {
  version: 1
  id: string
  title: string
  dataset: string
  visual: VisualType
  /** dimension ids on the category axis (first one) — table uses all */
  x: string[]
  /** measure ids */
  y: string[]
  /** optional dimension that splits series by colour */
  color?: string
  filters: FilterSpec[]
  /** the date field the period counts by (a dimension id); none = the dataset's own date */
  dateField?: string
  /** this chart's own measures (a formula over the dataset's fields) */
  calc?: OwnMeasure[]
  sort?: { field: string; dir: 'asc' | 'desc' }
  limit?: number
  options?: {
    labels?: boolean
    legend?: boolean
    /** combo: measure ids drawn as lines on the right axis */
    lineMeasures?: string[]
    /** kpi: show change vs previous period */
    compare?: boolean
    /** horizontal goal line */
    goal?: number
    /** diagnostic / pacing card: the insight in words (an AI card's why) */
    note?: string
    /** diagnostic / pacing card: up to 3 short actions */
    steps?: string[]
  }
}

/* ---------------- Dashboard ---------------- */

export interface GridLayout {
  /** 12-column grid */
  x: number
  y: number
  w: number
  h: number
}

export type DashItem =
  | { id: string; type: 'chart'; chart: ChartSpec; layout: GridLayout }
  | { id: string; type: 'title'; text: string; layout: GridLayout }
  | { id: string; type: 'note'; text: string; layout: GridLayout }

export interface SelectorSpec {
  id: string
  kind: 'date' | 'multi'
  label: string
  /** dimension NAME shared by datasets (e.g. "Manba", "Mas'ul") — applied to every chart whose dataset has it */
  field?: string
}

export interface DashboardSpec {
  version: 1
  id: string
  title: string
  description: string
  icon: string
  tile: string
  /** template it came from */
  template?: string
  /** sources it needs; hidden until they are connected */
  requires?: ('bitrix24' | 'meta' | 'sheets' | 'amocrm' | 'postgres' | 'csv')[]
  selectors: SelectorSpec[]
  tabs: { id: string; title: string; items: DashItem[] }[]
  updatedAt: string
  author: string
}

/* ---------------- Query result ---------------- */

export interface ResultColumn {
  id: string
  name: string
  kind: 'dimension' | 'measure'
  type: ValueType
  format?: Format
}

export interface QueryResult {
  columns: ResultColumn[]
  rows: unknown[][]
  sql: string
  scanned: number
  ms: number
}
