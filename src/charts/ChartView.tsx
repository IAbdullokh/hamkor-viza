import { memo, useCallback, useMemo } from 'react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useDb } from '@/data/db'
import { useUserFieldsVersion } from '@/data/userFields'
import { getDataset, noValues, runQuery, withOwnMeasures, type DatasetRuntime, type Query } from '@/data/query'
import { prevRange, type DateRange } from '@/data/range'
import type { ChartSpec, FilterSpec, QueryResult } from '@/spec'
import { Odometer } from '@/ui/glass'
import { Sparkline } from '@/ui/Sparkline'
import { EChartCanvas } from './EChartCanvas'
import { formatValue } from './format'
import { BENTO, BentoView } from './BentoViews'
import { NativeView, nativeKind } from './NativeViews'
import { buildOption, pointFromClick, type SeriesPoint } from './options'
import type { ChartColors } from './theme'

/**
 * Renders any ChartSpec for the current workspace: ECharts visuals, native rankings / splits / pipelines (NativeViews),
 * KPI tiles and tables.
 * `selectors` are dashboard filters by dimension NAME — applied only when this chart's dataset has that field.
 */
export interface SelectorFilter {
  name: string
  values: (string | number | boolean)[]
  /** "Tanlanganlardan tashqari" — everything except the chosen values */
  exclude?: boolean
}

export function chartQuery(ds: DatasetRuntime, spec: ChartSpec, range: DateRange | null, selectors: SelectorFilter[] = []): Query {
  const extra: FilterSpec[] = []
  for (const s of selectors) {
    const f = ds.byName.get(s.name)
    if (f && f.field.kind === 'dimension' && s.values.length) extra.push({ field: f.field.id, op: s.exclude ? 'not_in' : 'in', values: s.values })
  }
  const dims = spec.visual === 'table' ? [...spec.x] : spec.x.slice(0, 1)
  if (spec.color && spec.visual !== 'table') dims.push(spec.color)
  return {
    dims: spec.visual === 'kpi' ? [] : dims,
    measures: spec.y,
    filters: [...spec.filters, ...extra],
    range,
    ...(spec.dateField ? { dateField: spec.dateField } : {}),
    sort: spec.sort,
    limit: spec.limit ?? (spec.visual === 'table' ? 200 : undefined),
  }
}

export function useChartData(spec: ChartSpec, range: DateRange | null, selectors: SelectorFilter[] = []): { ds: DatasetRuntime | null; res: QueryResult | null; error: string | null } {
  const db = useDb()
  const fieldsVersion = useUserFieldsVersion()
  const key = JSON.stringify([fieldsVersion, spec.dateField, spec.calc, spec.dataset, spec.visual, spec.x, spec.y, spec.color, spec.filters, spec.sort, spec.limit, range?.from, range && Math.floor(range.to / 60_000), selectors])
  return useMemo(() => {
    try {
      const ds = withOwnMeasures(getDataset(db.wsId, spec.dataset), spec.calc)
      return { ds, res: runQuery(db, ds, chartQuery(ds, spec, range, selectors)), error: null }
    } catch (e) {
      return { ds: null, res: null, error: String((e as Error).message ?? e) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key])
}

export const ChartView = memo(function ChartView({
  spec,
  range,
  selectors,
  height = 260,
  onPoint,
  className,
}: {
  spec: ChartSpec
  range: DateRange | null
  selectors?: SelectorFilter[]
  height?: number | string
  onPoint?: (p: SeriesPoint) => void
  className?: string
}) {
  const { t, lang } = useT()
  const { ds, res, error } = useChartData(spec, range, selectors)

  const option = useCallback((c: ChartColors) => (res ? buildOption(spec, res, c, lang, t) : {}), [res, spec, lang, t])
  const onClick = useCallback(
    (p: { dataIndex: number; seriesIndex?: number; name?: string; seriesName?: string }) => {
      if (!res || !onPoint) return
      const pt = pointFromClick(spec, res, p)
      if (pt) onPoint(pt)
    },
    [res, spec, onPoint],
  )

  if (error || !ds) return <ChartMessage text={error ?? t("Dataset topilmadi")} height={height} />
  if (!res) return null
  // Bento blocks read their cut / records themselves and say so when there is nothing (BentoViews)
  if (BENTO.has(spec.visual)) return <BentoView spec={spec} ds={ds} res={res} range={range} selectors={selectors} height={height} onPoint={onPoint} className={className} />
  if (spec.visual === 'kpi') return <KpiVisual spec={spec} ds={ds} res={res} range={range} selectors={selectors} className={className} />
  if (!res.rows.length) return <ChartMessage text={t("Tanlangan davrda ma'lumot yo'q")} height={height} />
  if (spec.visual === 'table') return <TableVisual res={res} height={height} className={className} onRow={onPoint ? (row) => onPoint({ dims: Object.fromEntries(res.columns.filter((c) => c.kind === 'dimension').map((c, i) => [c.id, row[i]])), measure: spec.y[0] ?? '' }) : undefined} />
  const blank = noValues(ds, res)
  if (blank !== false) return <ChartMessage text={t(blank ?? "Tanlangan davrda bu ko'rsatkich uchun qiymat yo'q")} height={height} />
  // a one-measure ranking, a category split and a funnel read best as HTML: every name in full, nothing overlapping
  const native = nativeKind(spec, res)
  if (native) return <NativeView kind={native} spec={spec} ds={ds} res={res} height={height} onPoint={onPoint} className={className} />
  return <EChartCanvas option={option} height={height} className={className} onClick={onPoint ? onClick : undefined} notMerge />
})

function ChartMessage({ text, height }: { text: string; height: number | string }) {
  return (
    <div data-chart-box="" className="grid place-items-center" style={{ height }}>
      <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[0.8125rem] text-ink-3">{text}</span>
    </div>
  )
}

function KpiVisual({ spec, ds, res, range, selectors, className }: { spec: ChartSpec; ds: DatasetRuntime; res: QueryResult; range: DateRange | null; selectors?: SelectorFilter[]; className?: string }) {
  const { t, lang } = useT()
  const db = useDb()
  const col = res.columns[0]
  const value = (res.rows[0]?.[0] as number) ?? 0
  const compare = spec.options?.compare !== false && range
  const prev = useMemo(() => {
    if (!compare || !range) return null
    const q = chartQuery(ds, spec, prevRange(range), selectors)
    return (runQuery(db, ds, q).rows[0]?.[0] as number) ?? null
  }, [compare, range, ds, spec, selectors, db])
  const spark = useMemo(() => {
    if (!range) return null
    const day = ds.byName.get('Sana')
    if (!day) return null
    const q = chartQuery(ds, { ...spec, visual: 'line', x: [day.field.id] }, range, selectors)
    const rows = runQuery(db, ds, q).rows
    return rows.length > 2 ? rows.map((r) => (r[1] as number) ?? 0) : null
  }, [range, ds, spec, selectors, db])
  const delta = prev ? (value - prev) / Math.abs(prev) : null
  const lowerIsBetter = /narx|vaqt|propushenniy|ne-perezvonili|sifatsiz|kutish|kechikish/i.test(col?.name ?? '')
  const good = delta === null || delta === 0 ? null : delta > 0 !== lowerIsBetter

  return (
    <div className={cx('@container flex h-full flex-col', className)}>
      <p className="text-[2rem] leading-none font-bold tracking-[-0.03em] text-ink sm:text-[2.25rem]">
        <Odometer value={value} format={(n) => formatValue(n, col?.format, lang, true)} />
      </p>
      {delta !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-[0.8125rem]">
          <span className={cx('num inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold', good ? 'bg-mint/70 text-mint-ink' : 'bg-surface-2 text-ink-2')}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'} {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
          </span>
          <span className="hidden truncate text-ink-3 @[230px]:inline">{t("oldingi davrga nisbatan")}</span>
        </div>
      )}
      {spark && (
        <div className="mt-auto h-10 pt-2">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  )
}

export function TableVisual({ res, height, className, onRow }: { res: QueryResult; height: number | string; className?: string; onRow?: (row: unknown[]) => void }) {
  const { lang } = useT()
  return (
    <div data-chart-box="" className={cx('scroll-thin overflow-auto', className)} style={{ maxHeight: height }}>
      <table className="data-table">
        <thead>
          <tr>
            {res.columns.map((c) => (
              <th key={c.id} className={c.kind === 'measure' ? 'r' : undefined}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.rows.map((row, i) => (
            <tr key={i} onClick={onRow ? () => onRow(row) : undefined} className={onRow ? 'cursor-pointer' : undefined}>
              {row.map((v, j) => (
                <td key={j} className={res.columns[j]!.kind === 'measure' ? 'r' : undefined}>
                  {formatValue(v, res.columns[j]!.format, lang)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
