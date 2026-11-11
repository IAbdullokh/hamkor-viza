import { useMemo } from 'react'
import { chartQuery, ChartView, useChartData, type SelectorFilter } from '@/charts/ChartView'
import { formatValue } from '@/charts/format'
import { useDb, type Db } from '@/data/db'
import { getDataset, runQuery, withOwnMeasures } from '@/data/query'
import type { DateRange } from '@/data/range'
import { hasLogic, toSpec, type AddedChart } from '@/features/addchart/model'
import { useT } from '@/i18n'
import { DataTable, type Column } from '@/kit/DataTable'
import type { ChartSpec } from '@/spec'
import type { Lang } from '@/lib/settings'
import { usePageSelectors } from '@/features/addchart/selectors'
import { datasetTile } from '@/features/addchart/tile'
import { Card } from '@/ui/controls'
import type { BlockTint } from './patch'

/**
 * A dashboard block drawn from its own data (BlockPatch.source, owner 2026-11-03: "a person changes which field the card
 * takes its number from — everything should be possible"): any metric, cut and form of the chart builder, in the block's
 * own place with its title and colour, on the page's Davr and filters. The page's original block comes back with
 * "Asl holiga".
 */
export function OwnBlock({ source, title, color, className }: { source: AddedChart; title: string; color?: BlockTint; className?: string }) {
  const { range, selectors } = usePageSelectors()
  const spec = useMemo(() => toSpec({ ...source, title }), [source, title])
  const tile = datasetTile(source.dataset)
  const height = spec.visual === 'kpi' ? 120 : spec.visual === 'pacing' || spec.visual === 'diagnostic' ? 220 : 280
  return (
    // the title as an element: a card with a text title makes itself an editable block, and this one IS the block already (a
    // second one under the same id made the two update each other for ever)
    <Card title={<>{title}</>} icon={tile.icon} tile={color ?? tile.color} className={className} flush={spec.visual === 'table'}>
      {spec.visual === 'table' ? <OwnTable spec={spec} range={range} selectors={selectors} /> : <ChartView spec={spec} range={range} selectors={selectors} height={height} />}
    </Card>
  )
}

/**
 * A block's own table: the dashboard's real table (its columns can be renamed, moved, hidden, sorted and calculated like
 * any other). The Jami row is the same query without its cuts, so a ratio's total is the real ratio, not a sum of ratios.
 */
function OwnTable({ spec, range, selectors }: { spec: ChartSpec; range: DateRange | null; selectors: SelectorFilter[] }) {
  const { t, lang } = useT()
  const db = useDb()
  const { ds, res, error } = useChartData(spec, range, selectors)
  const totals = useMemo(() => {
    if (!ds || !res) return null
    return runQuery(db, ds, { ...chartQuery(ds, spec, range, selectors), dims: [], limit: undefined, sort: undefined })
  }, [db, ds, res, spec, range, selectors])
  const columns = useMemo<Column<unknown[]>[]>(() => {
    if (!res) return []
    return res.columns.map((c, i) => {
      const at = totals?.columns.findIndex((x) => x.id === c.id) ?? -1
      const shown = (r: unknown[]) => {
        const v = r[i]
        return typeof v === 'number' || typeof v === 'string' ? v : v == null ? null : String(v)
      }
      return c.kind === 'measure'
        ? { key: c.id, label: c.name, align: 'end' as const, value: shown, format: (v: number) => formatValue(v, c.format, lang), total: () => (at >= 0 ? (totals?.rows[0]?.[at] as number | null) : null) }
        : { key: c.id, label: c.name, value: shown, render: (r: unknown[]) => formatValue(r[i], c.format, lang) }
    })
  }, [res, totals, lang])
  if (error) return <p className="px-4 py-8 text-center text-[0.875rem] text-ink-3 sm:px-5">{error}</p>
  return <DataTable columns={columns} rows={res?.rows ?? []} rowKey={(_, i) => String(i)} maxHeight={520} empty={t("Tanlangan davrda ma'lumot yo'q")} />
}

/**
 * What a chart's logic did to its main number, computed here from the rows and never by the model: the same measure over
 * the same period and page filters without the chart's own conditions and date, then with them. Null when it has no logic
 * that changes the rows.
 */
export function logicImpact(db: Db, chart: AddedChart, range: DateRange | null, selectors: SelectorFilter[], lang: Lang, t: (s: string) => string = (s) => s): { name: string; before: string; after: string } | null {
  if (!hasLogic(chart) && !chart.exclude && !chart.filter) return null
  if (!chart.where?.length && !chart.exclude && !chart.filter && !chart.dateField) return null
  try {
    const ds = withOwnMeasures(getDataset(db.wsId, chart.dataset), chart.calc)
    const base: AddedChart = { ...chart, visual: 'kpi', dim: undefined, dims: undefined, measures: undefined }
    const count = (c: AddedChart) => runQuery(db, ds, chartQuery(ds, toSpec(c), range, selectors))
    const after = count(base)
    const before = count({ ...base, where: undefined, exclude: undefined, filter: undefined, dateField: undefined })
    const col = after.columns[0]
    if (!col) return null
    return { name: t(col.name), before: formatValue(before.rows[0]?.[0], col.format, lang), after: formatValue(after.rows[0]?.[0], col.format, lang) }
  } catch {
    return null
  }
}

/** a first own data for a block: one number for a KPI card, a cut for any other (then changed in the builder) */
export function startingSource(kind: 'stat' | 'card', title: string): AddedChart {
  return kind === 'stat'
    ? { id: 'own', title, dataset: 'leads', measure: 'lidlar_soni', visual: 'kpi' }
    : { id: 'own', title, dataset: 'leads', measure: 'lidlar_soni', dim: 'manba', visual: 'bar' }
}
