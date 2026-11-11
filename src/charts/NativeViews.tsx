import { useMemo } from 'react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtPct } from '@/lib/format'
import { isPlaceholder } from '@/data/customFields'
import type { DatasetRuntime } from '@/data/query'
import type { ChartSpec, QueryResult, ResultColumn } from '@/spec'
import { formatValue } from './format'
import { CSS_COLORS, meaningColor, seriesColors, type SeriesPoint } from './options'

/**
 * Category charts drawn as Liquid Glass HTML instead of an ECharts canvas (owner, 2026-11-03: "cramped 2015 canvases" —
 * names cut to 120px, 5 of 7 source names hidden, funnel labels on top of the trapezoid): a ranked list for a one-measure
 * bar, one proportional row per category for a stacked split, a stepped pipeline for a funnel. Every name is readable in
 * full, a click drills down like a chart point. Other shapes (time cuts, several measures) stay ECharts.
 */
export type NativeKind = 'rank' | 'stack' | 'pipeline'

const OTHER = '__other__'
const MAX_ROWS = 100

/** the native view this chart takes, or null for ECharts */
export function nativeKind(spec: ChartSpec, res: QueryResult): NativeKind | null {
  const dims = res.columns.filter((c) => c.kind === 'dimension')
  const meas = res.columns.filter((c) => c.kind === 'measure')
  if (spec.visual === 'funnel') return 'pipeline'
  const x = dims[0]
  // a plain category (source, manager, campaign): dates, hours and weekdays keep their axis
  if (x?.type !== 'string' || x.format || meas.length !== 1) return null
  if (spec.visual === 'bar' && !spec.color && dims.length === 1) return 'rank'
  if ((spec.visual === 'stacked' || spec.visual === 'bar') && spec.color && dims.length === 2) return 'stack'
  return null
}

/** a count or a sum (parts add up to the total): its rows show their share */
export function isAdditive(ds: DatasetRuntime, id: string | undefined): boolean {
  const f = id ? ds.byId.get(id)?.field : undefined
  if (!f || f.kind !== 'measure' || (f.format && !['number', 'money', 'usd'].includes(f.format))) return false
  return /^\s*(COUNT|COUNT_IF|SUM|SUM_IF)\s*\(/i.test(f.formula) && !/[/*]/.test(f.formula)
}

/** rows without the empty / placeholder keys ("N", "—") when some have a real one */
function realKeys<T>(rows: T[], key: (r: T) => unknown): T[] {
  const real = rows.filter((r) => !isPlaceholder(key(r)))
  return real.length ? real : rows
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const fill = (color: string) => `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`

export function NativeView({ kind, spec, ds, res, height, onPoint, className }: { kind: NativeKind; spec: ChartSpec; ds: DatasetRuntime; res: QueryResult; height: number | string; onPoint?: (p: SeriesPoint) => void; className?: string }) {
  const dense = typeof height === 'number' && height < 180
  return (
    <div data-chart-box="" className={cx('scroll-thin overflow-y-auto overflow-x-hidden pe-0.5', className)} style={{ height }}>
      {kind === 'rank' ? (
        <RankList spec={spec} res={res} share={isAdditive(ds, spec.y[0])} dense={dense} onPoint={onPoint} />
      ) : kind === 'stack' ? (
        <StackRows spec={spec} res={res} dense={dense} onPoint={onPoint} />
      ) : (
        <Pipeline spec={spec} res={res} dense={dense} onPoint={onPoint} />
      )}
    </div>
  )
}

/** "1 · Instagram ····· 412 · 38%": a ranked list with a soft bar per row */
function RankList({ spec, res, share, dense, onPoint }: { spec: ChartSpec; res: QueryResult; share: boolean; dense: boolean; onPoint?: (p: SeriesPoint) => void }) {
  const { lang } = useT()
  const x = res.columns[0]!
  const m = res.columns[1]!
  const rows = useMemo(() => {
    let list = realKeys(res.rows, (r) => r[0]).map((r) => ({ key: r[0], value: r[1] as number | null }))
    // a row with nothing in it is a blank line when others have a value
    if (list.some((r) => num(r.value) !== 0)) list = list.filter((r) => num(r.value) !== 0)
    if (!spec.sort) list.sort((a, b) => num(b.value) - num(a.value))
    return list.slice(0, MAX_ROWS)
  }, [res, spec.sort])
  const total = rows.reduce((s, r) => s + num(r.value), 0)
  const goal = spec.options?.goal
  const max = Math.max(...rows.map((r) => Math.abs(num(r.value))), typeof goal === 'number' ? Math.abs(goal) : 0) || 1
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => {
        const name = formatValue(r.key, x.format, lang)
        const v = num(r.value)
        const color = v < 0 ? CSS_COLORS.series[3]! : (meaningColor(name, CSS_COLORS) ?? CSS_COLORS.primary)
        return (
          <li key={`${String(r.key)}:${i}`}>
            <button
              type="button"
              disabled={!onPoint}
              onClick={() => onPoint?.({ dims: { [x.id]: r.key }, measure: m.id })}
              className={cx('group flex w-full items-center gap-2.5 rounded-[12px] px-1.5 text-start enabled:hover:bg-surface-2 disabled:cursor-default', dense ? 'py-1' : 'py-1.5')}
            >
              <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[0.6875rem] font-semibold text-ink-2 group-enabled:group-hover:bg-surface">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <span className="line-clamp-2 min-w-0 break-words text-ink" title={name}>
                    {name}
                  </span>
                  <span className="num shrink-0 font-semibold whitespace-nowrap text-ink">
                    {formatValue(r.value, m.format, lang)}
                    {share && total > 0 && v > 0 && <span className="ms-1.5 font-normal text-ink-3">{fmtPct(v / total, 1, lang)}</span>}
                  </span>
                </span>
                <span className="relative mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-2">
                  <span className="bar-grow block h-full rounded-full" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: fill(color), animationDelay: `${Math.min(i, 12) * 30}ms` }} />
                  {typeof goal === 'number' && <span aria-hidden className="absolute inset-y-0 w-0 border-s border-dashed border-ink-3" style={{ insetInlineStart: `${(Math.abs(goal) / max) * 100}%` }} />}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

interface StackSeries {
  key: string
  name: string
  raw: unknown
  color: string
}

/** Manba × Bosqich: the colours' legend, then one row per source with its total and a bar split by stage */
function StackRows({ spec, res, dense, onPoint }: { spec: ChartSpec; res: QueryResult; dense: boolean; onPoint?: (p: SeriesPoint) => void }) {
  const { t, lang } = useT()
  const [x, col, m] = res.columns as [ResultColumn, ResultColumn, ResultColumn]
  const { series, rows } = useMemo(() => {
    // no "N" / "—" category or colour when real ones exist
    const data = realKeys(realKeys(res.rows, (r) => r[0]), (r) => r[1])
    const totals = new Map<string, number>()
    for (const r of data) totals.set(String(r[1]), (totals.get(String(r[1])) ?? 0) + num(r[2]))
    // the 6 biggest colours by total, the rest "Boshqalar"
    const keep = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
    const rawOf = new Map(data.map((r) => [String(r[1]), r[1]]))
    const names = keep.map((k) => formatValue(rawOf.get(k), col.format, lang))
    const colors = seriesColors(names, CSS_COLORS)
    const list: StackSeries[] = keep.map((k, i) => ({ key: k, name: names[i]!, raw: rawOf.get(k), color: colors[i]! }))
    if (totals.size > keep.length) list.push({ key: OTHER, name: t('Boshqalar'), raw: undefined, color: CSS_COLORS.series[7]! })
    const byCat = new Map<string, { key: unknown; parts: Map<string, number>; total: number }>()
    for (const r of data) {
      const k = String(r[0])
      let row = byCat.get(k)
      if (!row) byCat.set(k, (row = { key: r[0], parts: new Map(), total: 0 }))
      const s = keep.includes(String(r[1])) ? String(r[1]) : OTHER
      row.parts.set(s, (row.parts.get(s) ?? 0) + num(r[2]))
      row.total += num(r[2])
    }
    let cats = [...byCat.values()].filter((c) => c.total !== 0)
    if (!spec.sort) cats = cats.sort((a, b) => b.total - a.total)
    return { series: list, rows: cats.slice(0, MAX_ROWS) }
  }, [res, col.format, lang, t, spec.sort])

  return (
    <div className="flex flex-col">
      <ul className={cx('flex flex-wrap gap-x-3 gap-y-1 px-1 text-[0.75rem] text-ink-2', dense ? 'pb-1' : 'pb-2')}>
        {series.map((s) => (
          <li key={s.key} className="inline-flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.name}</span>
          </li>
        ))}
      </ul>
      {rows.map((row, ri) => (
        <div key={`${String(row.key)}:${ri}`} className={cx('rounded-[12px] px-1', dense ? 'py-1' : 'py-1.5')}>
          <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
            <span className="line-clamp-1 min-w-0 break-all text-ink" title={formatValue(row.key, x.format, lang)}>
              {formatValue(row.key, x.format, lang)}
            </span>
            <span className="num shrink-0 font-semibold text-ink">{formatValue(row.total, m.format, lang)}</span>
          </div>
          <div className="bar-grow mt-1.5 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-surface-2" style={{ animationDelay: `${Math.min(ri, 12) * 30}ms` }}>
            {series.map((s) => {
              const v = row.parts.get(s.key) ?? 0
              if (v <= 0 || row.total <= 0) return null
              const label = `${s.name}: ${formatValue(v, m.format, lang)} · ${fmtPct(v / row.total, 1, lang)}`
              return (
                // the browser's own tooltip: hundreds of pieces on a page, none of them a component of its own
                <button
                  key={s.key}
                  type="button"
                  title={label}
                  aria-label={`${formatValue(row.key, x.format, lang)} — ${label}`}
                  onClick={onPoint ? () => onPoint({ dims: s.key === OTHER ? { [x.id]: row.key } : { [x.id]: row.key, [col.id]: s.raw }, measure: m.id }) : undefined}
                  className="h-full min-w-[3px] first:rounded-s-full last:rounded-e-full hover:brightness-110"
                  style={{ width: `${(v / row.total) * 100}%`, background: s.color }}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** a funnel as steps: name, count, its share, a proportional bar — nothing drawn over anything */
function Pipeline({ spec, res, dense, onPoint }: { spec: ChartSpec; res: QueryResult; dense: boolean; onPoint?: (p: SeriesPoint) => void }) {
  const { t, lang } = useT()
  const dimCols = res.columns.filter((c) => c.kind === 'dimension')
  const meaCols = res.columns.filter((c) => c.kind === 'measure')
  // one cut (Bosqich, Manba): parts of one whole, each a share of the total; measures in a row are steps from the first
  const ofTotal = dimCols.length === 1 && meaCols.length === 1
  const steps = useMemo(() => {
    if (ofTotal) {
      const list = realKeys(res.rows, (r) => r[0]).map((r) => ({ key: r[0] as unknown, name: formatValue(r[0], dimCols[0]!.format, lang), value: num(r[1]) })).filter((s) => s.value !== 0)
      return spec.sort ? list : list.sort((a, b) => b.value - a.value)
    }
    return meaCols.map((c, i) => ({ key: undefined as unknown, name: c.name, value: num(res.rows[0]?.[dimCols.length + i]) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns follow res
  }, [res, ofTotal, lang, spec.sort])
  const base = (ofTotal ? steps.reduce((s, x) => s + x.value, 0) : steps[0]?.value) || 1
  const max = Math.max(...steps.map((s) => Math.abs(s.value))) || 1
  const colors = seriesColors(steps.map((s) => s.name), CSS_COLORS)
  const m = meaCols[0]
  return (
    <ol className={cx('flex flex-col', dense ? 'gap-1' : 'gap-1.5')}>
      {steps.slice(0, MAX_ROWS).map((s, i) => {
        const clickable = ofTotal && !!onPoint
        return (
          <li key={`${s.name}:${i}`}>
            <button
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onPoint!({ dims: { [dimCols[0]!.id]: s.key }, measure: m?.id ?? spec.y[0] ?? '' }) : undefined}
              className={cx('flex w-full flex-col rounded-[14px] border border-line bg-surface-2/50 px-3 text-start enabled:hover:bg-surface-2 disabled:cursor-default', dense ? 'py-1.5' : 'py-2')}
            >
              <span className="flex items-center gap-2 text-[0.8125rem]">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i] }} />
                <span className="line-clamp-1 min-w-0 flex-1 break-all text-ink" title={s.name}>
                  {s.name}
                </span>
                <span className="num shrink-0 font-semibold text-ink">{formatValue(s.value, (ofTotal ? m : meaCols[i])?.format, lang)}</span>
                {(ofTotal || i > 0) && (
                  <span className="num shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary-strong" title={t(ofTotal ? 'jamidan' : 'birinchi bosqichdan')}>
                    {fmtPct(s.value / base, Math.abs(s.value / base) < 0.1 ? 1 : 0, lang)}
                  </span>
                )}
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
                <span className="bar-grow block h-full rounded-full" style={{ width: `${(Math.abs(s.value) / max) * 100}%`, background: fill(colors[i]!), animationDelay: `${Math.min(i, 12) * 40}ms` }} />
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
