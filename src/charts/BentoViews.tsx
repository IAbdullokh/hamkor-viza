import { useMemo } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Circle } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtNum, fmtPct } from '@/lib/format'
import { useDb, type Db } from '@/data/db'
import { crmUrl, openCrm, type CrmKind } from '@/data/crmLink'
import { VOCAB } from '@/data/domain'
import { runQuery, type DatasetRuntime } from '@/data/query'
import { prevRange, type DateRange } from '@/data/range'
import { useMeta } from '@/data/source'
import type { Call, Deal, Lead } from '@/data/types'
import type { ChartSpec, FilterSpec, QueryResult, ResultColumn, VisualType } from '@/spec'
import { Odometer } from '@/ui/glass'
import { Sparkline } from '@/ui/Sparkline'
import { chartQuery, type SelectorFilter } from './ChartView'
import { formatValue } from './format'
import { CSS_COLORS, meaningColor, type SeriesPoint } from './options'

/**
 * Bento blocks (owner, 2026-11-03: "2026 bento dashboard blocks, never a 1-bar chart on a small portal"): cards that read a
 * whole cut or the records behind it instead of drawing one bar.
 *  - scorecard  — Reyting jadvali: a cut's rows with 3–4 core metrics side by side (pills, badges, mini bars)
 *  - matrix     — Rangli matritsa: dim × colour as a heat-tinted cross-tab with row shares and totals
 *  - queue      — Jonli navbat: the records waiting for action (unanswered leads, missed calls, open deals) with CRM ↗
 *  - pacing     — Maqsad trekeri: the number against its goal, on track or at risk, the change and the daily trend
 *  - diagnostic — Diagnostika kartasi: three live numbers, the insight and up to three actions
 * Each reads the dashboard's own data with the chart's filters, the page's Davr and filters (chartQuery).
 */
export const BENTO = new Set<VisualType>(['scorecard', 'matrix', 'queue', 'pacing', 'diagnostic'])

/** the core metrics a scorecard shows per dataset (the first one found that compiles; the chart's own measure leads) */
export const SCORECARD_METRICS: Record<string, string[]> = {
  leads: ['lidlar_soni', 'sifatli_ulush', 'ortacha_javob_vaqti', 'konversiya'],
  calls: ['qongiroqlar_soni', 'javob_ulushi', 'propushenniy', 'ortacha_davomiylik'],
  deals: ['sdelkalar_soni', 'muvaffaqiyatli', 'sotuvlar_summasi', 'yutish_ulushi'],
  ads: ['jami_sarf', 'lidlar_meta', 'lead_narxi_cpl', 'click_narxi_cpc'],
}

/** the measures of a scorecard: the chart's own first, then the dataset's core ones it has (at most 4) */
export function scorecardMetrics(ds: DatasetRuntime, own: string): string[] {
  const ok = (id: string) => !!ds.byId.get(id)?.compiled && ds.byId.get(id)!.field.kind === 'measure'
  return [...new Set([own, ...(SCORECARD_METRICS[ds.spec.id] ?? [])])].filter(ok).slice(0, 4)
}

/** a measure where less is better: response / waiting time, a price, missed or lost */
export const lowerIsBetter = (name: string) => /narx|vaqt|propushenniy|ne-perezvonili|sifatsiz|kutish|kechikish|bekor|muvaffaqiyatsiz|cpl|cpc|sarf/i.test(name)

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function BentoView({
  spec,
  ds,
  res,
  range,
  selectors,
  height,
  onPoint,
  className,
}: {
  spec: ChartSpec
  ds: DatasetRuntime
  res: QueryResult
  range: DateRange | null
  selectors?: SelectorFilter[]
  height: number | string
  onPoint?: (p: SeriesPoint) => void
  className?: string
}) {
  return (
    <div className={cx('scroll-thin overflow-auto', className)} style={{ height }} data-chart-box="">
      {spec.visual === 'scorecard' ? (
        <Scorecard spec={spec} ds={ds} range={range} selectors={selectors} onPoint={onPoint} />
      ) : spec.visual === 'matrix' ? (
        <Matrix res={res} onPoint={onPoint} measure={spec.y[0] ?? ''} />
      ) : spec.visual === 'queue' ? (
        <Queue spec={spec} ds={ds} range={range} selectors={selectors} />
      ) : spec.visual === 'pacing' ? (
        <Pacing spec={spec} ds={ds} range={range} selectors={selectors} />
      ) : (
        <Diagnostic spec={spec} ds={ds} range={range} selectors={selectors} />
      )}
    </div>
  )
}

/** one number of a measure over the chart's rows (its filters, the page's period and filters) */
function useTotals(spec: ChartSpec, ds: DatasetRuntime, range: DateRange | null, selectors: SelectorFilter[] | undefined, measures: string[]): (number | null)[] {
  const db = useDb()
  return useMemo(() => {
    if (!measures.length) return []
    const q = chartQuery(ds, { ...spec, visual: 'kpi', x: [], y: measures, color: undefined }, range, selectors)
    const row = runQuery(db, ds, q).rows[0] ?? []
    return measures.map((_, i) => (typeof row[i] === 'number' ? (row[i] as number) : null))
  }, [db, ds, spec, range, selectors, measures])
}

/* ---------------- Reyting jadvali ---------------- */

function Scorecard({ spec, ds, range, selectors, onPoint }: { spec: ChartSpec; ds: DatasetRuntime; range: DateRange | null; selectors?: SelectorFilter[]; onPoint?: (p: SeriesPoint) => void }) {
  const { t, lang } = useT()
  const db = useDb()
  const metrics = useMemo(() => scorecardMetrics(ds, spec.y[0] ?? ''), [ds, spec.y])
  const res = useMemo(() => {
    if (!spec.x[0] || !metrics.length) return null
    const q = chartQuery(ds, { ...spec, visual: 'bar', y: metrics, color: undefined }, range, selectors)
    return runQuery(db, ds, { ...q, sort: { field: metrics[0]!, dir: 'desc' }, limit: spec.limit ?? 12 })
  }, [db, ds, spec, metrics, range, selectors])
  if (!res || !res.rows.length) return <Empty />
  const dim = res.columns[0]!
  const cols = res.columns.slice(1)
  const rows = res.rows.filter((r) => num(r[1]) !== 0)
  return (
    <table className="w-full border-separate border-spacing-y-1 text-[0.8125rem]">
      <thead>
        <tr className="text-[0.6875rem] font-semibold tracking-[0.04em] text-ink-3 uppercase">
          <th className="px-2 py-1 text-start">{t(dim.name)}</th>
          {cols.map((c) => (
            <th key={c.id} className="px-2 py-1 text-end">
              {t(c.name)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={`${String(r[0])}:${i}`}
            onClick={onPoint ? () => onPoint({ dims: { [dim.id]: r[0] }, measure: cols[0]!.id }) : undefined}
            className={cx('bg-surface-2/50 transition-colors', onPoint && 'cursor-pointer hover:bg-surface-2')}
          >
            <td className="rounded-s-[12px] px-2 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface text-[0.6875rem] font-semibold text-ink-3">{i + 1}</span>
                <span className="line-clamp-1 font-medium text-ink" title={formatValue(r[0], dim.format, lang)}>
                  {formatValue(r[0], dim.format, lang)}
                </span>
              </span>
            </td>
            {cols.map((c, j) => (
              <td key={c.id} className={cx('px-2 py-2 text-end', j === cols.length - 1 && 'rounded-e-[12px]')}>
                <MetricCell col={c} value={r[j + 1]} lang={lang} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** a scorecard cell by its kind: a share as a pill with a mini bar, a response time as a coloured badge, else the number */
function MetricCell({ col, value, lang }: { col: ResultColumn; value: unknown; lang: string }) {
  const text = formatValue(value, col.format, lang as never, true)
  if (value === null || value === undefined) return <span className="text-ink-3">—</span>
  if (col.format === 'percent') {
    const v = Math.max(0, Math.min(1, num(value)))
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <span className="num rounded-full bg-primary-soft px-1.5 py-0.5 text-[0.75rem] font-semibold text-primary-strong">{text}</span>
        <span className="block h-1 w-14 overflow-hidden rounded-full bg-surface">
          <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${v * 100}%` }} />
        </span>
      </span>
    )
  }
  if (col.format === 'minutes') {
    const m = num(value)
    const tone = m <= 15 ? 'bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]' : m <= 60 ? 'bg-[var(--warm-soft)] text-[var(--warm)]' : 'bg-[var(--danger-soft)] text-danger'
    return <span className={cx('num rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold', tone)}>{text}</span>
  }
  return <span className="num font-semibold text-ink">{text}</span>
}

/* ---------------- Rangli matritsa ---------------- */

function Matrix({ res, measure, onPoint }: { res: QueryResult; measure: string; onPoint?: (p: SeriesPoint) => void }) {
  const { t, lang } = useT()
  const dims = res.columns.filter((c) => c.kind === 'dimension')
  const m = res.columns.find((c) => c.kind === 'measure')
  const model = useMemo(() => {
    if (dims.length < 2 || !m) return null
    const vi = dims.length
    const rowTotals = new Map<string, { key: unknown; total: number }>()
    const colTotals = new Map<string, { key: unknown; total: number }>()
    const cell = new Map<string, number>()
    for (const r of res.rows) {
      const v = num(r[vi])
      const rk = String(r[0])
      const ck = String(r[1])
      rowTotals.set(rk, { key: r[0], total: (rowTotals.get(rk)?.total ?? 0) + v })
      colTotals.set(ck, { key: r[1], total: (colTotals.get(ck)?.total ?? 0) + v })
      cell.set(`${rk}\u0000${ck}`, (cell.get(`${rk}\u0000${ck}`) ?? 0) + v)
    }
    const rows = [...rowTotals.values()].filter((x) => x.total !== 0).sort((a, b) => b.total - a.total).slice(0, 14)
    const cols = [...colTotals.values()].filter((x) => x.total !== 0).sort((a, b) => b.total - a.total).slice(0, 8)
    const max = Math.max(1, ...[...cell.values()])
    return { rows, cols, cell, max, grand: rows.reduce((s, r) => s + r.total, 0) }
  }, [res, dims.length, m])
  if (!model || !model.rows.length) return <Empty />
  const [rowDim, colDim] = dims as [ResultColumn, ResultColumn]
  const fmt = (v: number) => formatValue(v, m!.format, lang, true)
  return (
    <table className="w-full border-separate border-spacing-[3px] text-[0.75rem]">
      <thead>
        <tr className="text-ink-3">
          <th className="px-1.5 py-1 text-start font-semibold">{t(rowDim.name)}</th>
          {model.cols.map((c) => (
            <th key={String(c.key)} className="max-w-[90px] px-1.5 py-1 text-end font-semibold">
              <span className="line-clamp-2 break-words" title={formatValue(c.key, colDim.format, lang)}>
                {formatValue(c.key, colDim.format, lang)}
              </span>
            </th>
          ))}
          <th className="px-1.5 py-1 text-end font-semibold">{t('Jami')}</th>
        </tr>
      </thead>
      <tbody>
        {model.rows.map((r) => (
          <tr key={String(r.key)}>
            <td className="max-w-[140px] px-1.5 py-1.5 font-medium text-ink">
              <span className="line-clamp-1" title={formatValue(r.key, rowDim.format, lang)}>
                {formatValue(r.key, rowDim.format, lang)}
              </span>
            </td>
            {model.cols.map((c) => {
              const v = model.cell.get(`${String(r.key)}\u0000${String(c.key)}`) ?? 0
              const tint = v ? 0.08 + (v / model.max) * 0.5 : 0
              const color = meaningColor(formatValue(c.key, colDim.format, lang), CSS_COLORS) ?? CSS_COLORS.primary
              return (
                <td
                  key={String(c.key)}
                  onClick={onPoint && v ? () => onPoint({ dims: { [rowDim.id]: r.key, [colDim.id]: c.key }, measure }) : undefined}
                  className={cx('rounded-[8px] px-1.5 py-1.5 text-end', onPoint && v && 'cursor-pointer hover:outline hover:outline-1 hover:outline-[var(--primary)]')}
                  style={{ background: v ? `color-mix(in srgb, ${color} ${Math.round(tint * 100)}%, transparent)` : 'var(--surface-2)' }}
                  title={v ? `${fmt(v)} · ${fmtPct(r.total ? v / r.total : 0, 1, lang)}` : undefined}
                >
                  <span className="num block font-semibold text-ink">{v ? fmt(v) : '·'}</span>
                  {v > 0 && r.total > 0 && <span className="num block text-[0.625rem] text-ink-3">{fmtPct(v / r.total, 0, lang)}</span>}
                </td>
              )
            })}
            <td className="num px-1.5 py-1.5 text-end font-bold text-ink">{fmt(r.total)}</td>
          </tr>
        ))}
        <tr>
          <td className="px-1.5 py-1.5 font-semibold text-ink-2">{t('Jami')}</td>
          {model.cols.map((c) => (
            <td key={String(c.key)} className="num px-1.5 py-1.5 text-end font-semibold text-ink-2">
              {fmt(c.total)}
            </td>
          ))}
          <td className="num px-1.5 py-1.5 text-end font-bold text-ink">{fmt(model.grand)}</td>
        </tr>
      </tbody>
    </table>
  )
}

/* ---------------- Jonli navbat ---------------- */

type Rec = Record<string, unknown>

/** does a record pass a chart filter (the field read through the dataset, like a query) */
function passes(ds: DatasetRuntime, row: Rec, f: FilterSpec): boolean {
  const c = ds.byId.get(f.field)?.compiled
  if (!c || c.agg) return true
  const v = c.row(row as never)
  if (f.op === 'in') return f.values.includes(v as never)
  if (f.op === 'not_in') return !f.values.includes(v as never)
  if (f.op === 'eq') return v === f.values[0]
  if (f.op === 'neq') return v !== f.values[0]
  return true
}

/** the records of the chart's dataset in the period, through its filters and the page's (newest first) */
export function queueRecords(db: Db, ds: DatasetRuntime, spec: ChartSpec, range: DateRange | null, selectors: SelectorFilter[] = []): Rec[] {
  const filters = [...chartQuery(ds, spec, range, selectors).filters ?? []]
  return ds.table
    .rows(db)
    .filter((r) => !range || (ds.table.ts(r) >= range.from && ds.table.ts(r) < range.to))
    .filter((r) => filters.every((f) => passes(ds, r, f)))
}

const CLOSED_STAGES = new Set(['won', 'lost', 'junk'])

/** the records worth acting on first: leads without a reply, missed incoming calls, open deals by amount */
export function queueOrder(dataset: string, rows: Rec[]): Rec[] {
  const ts = (r: Rec) => num(r.ts)
  if (dataset === 'leads') {
    const waiting = (l: Rec) => l.first_response_sec == null && !CLOSED_STAGES.has(String(l.stage))
    return [...rows].sort((a, b) => Number(waiting(b)) - Number(waiting(a)) || ts(b) - ts(a))
  }
  if (dataset === 'calls') {
    // a short call (connected, ≤10 s) is not a missed one
    const missed = (c: Rec) => c.direction === 'in' && c.status === 'missed'
    return [...rows].sort((a, b) => Number(missed(b)) - Number(missed(a)) || Number(!!b.ne_perezvonili) - Number(!!a.ne_perezvonili) || ts(b) - ts(a))
  }
  if (dataset === 'deals') return [...rows].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || num(b.amount) - num(a.amount))
  return [...rows].sort((a, b) => ts(b) - ts(a))
}

function ago(ms: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000))
  if (m < 60) return t('{n} daq oldin', { n: m })
  const h = Math.round(m / 60)
  return h < 48 ? t('{n} soat oldin', { n: h }) : t('{n} kun oldin', { n: Math.round(h / 24) })
}

function Queue({ spec, ds, range, selectors }: { spec: ChartSpec; ds: DatasetRuntime; range: DateRange | null; selectors?: SelectorFilter[] }) {
  const { t, lang } = useT()
  const db = useDb()
  const portal = useMeta().portalUrl
  const items = useMemo(() => queueOrder(spec.dataset, queueRecords(db, ds, spec, range, selectors)).slice(0, 8), [db, ds, spec, range, selectors])
  if (!items.length) return <Empty />
  const stages = VOCAB.sales.stages as Record<string, string>
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((r, i) => {
        let title = ''
        let sub = ''
        let pill = ''
        let right = ''
        let urgent = false
        let crm: { kind: CrmKind; id: number | string | null } | null = null
        if (spec.dataset === 'leads') {
          const l = r as unknown as Lead
          title = l.name || l.phone || `#${l.id}`
          sub = [l.phone && l.name ? l.phone : '', l.source, l.manager].filter(Boolean).join(' · ')
          pill = l.stage_name ?? stages[l.stage] ?? l.stage
          urgent = l.first_response_sec == null && !CLOSED_STAGES.has(l.stage)
          right = urgent ? t('Javobsiz · {ago}', { ago: ago(l.ts, t) }) : t('Javob: {n} daq', { n: fmtNum(Math.round(num(l.first_response_sec) / 60), 0, lang) })
          crm = { kind: 'lead', id: l.id }
        } else if (spec.dataset === 'calls') {
          const c = r as unknown as Call
          title = c.phone || `#${String(c.id)}`
          sub = [c.operator, c.direction === 'in' ? t('Kiruvchi') : t('Chiquvchi')].filter(Boolean).join(' · ')
          urgent = c.direction === 'in' && c.status === 'missed'
          pill = c.status === 'answered' ? t('Javob berildi') : c.status === 'short' ? t('Qisqa suhbat') : t("O'tkazib yuborildi")
          right = c.ne_perezvonili ? t("Qayta qo'ng'iroq yo'q · {ago}", { ago: ago(c.ts, t) }) : ago(c.ts, t)
          crm = c.lead_id ? { kind: 'lead', id: c.lead_id } : null
        } else if (spec.dataset === 'deals') {
          const d = r as unknown as Deal
          title = d.product ? `#${d.id} · ${d.product}` : `#${d.id}`
          sub = [d.source, d.manager].filter(Boolean).join(' · ')
          pill = d.stage
          urgent = d.status === 'open'
          right = formatValue(d.amount, 'money', lang, true)
          crm = { kind: 'deal', id: d.id }
        } else {
          title = String(r.id ?? i + 1)
        }
        const url = crm && portal ? crmUrl(portal, crm.kind, crm.id) : null
        const tone = meaningColor(pill, CSS_COLORS)
        return (
          <li key={`${String(r.id)}:${i}`} className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface-2/50 px-3 py-2">
            <span aria-hidden className={cx('h-2 w-2 shrink-0 rounded-full', urgent ? 'bg-danger' : 'bg-[var(--good)]')} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[0.8125rem]">
                <span className="line-clamp-1 font-semibold text-ink">{title}</span>
                {pill && (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold"
                    style={{ background: `color-mix(in srgb, ${tone ?? CSS_COLORS.primary} 16%, transparent)`, color: tone ?? CSS_COLORS.primary }}
                  >
                    {pill}
                  </span>
                )}
              </span>
              {sub && <span className="line-clamp-1 text-[0.75rem] text-ink-3">{sub}</span>}
            </span>
            <span className={cx('num shrink-0 text-end text-[0.75rem]', urgent ? 'font-semibold text-danger' : 'text-ink-2')}>{right}</span>
            {url && (
              <button
                type="button"
                onClick={() => openCrm(url)}
                className="pressable inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-strong"
              >
                CRM <ArrowUpRight aria-hidden size={11} />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ---------------- Maqsad trekeri ---------------- */

function Pacing({ spec, ds, range, selectors }: { spec: ChartSpec; ds: DatasetRuntime; range: DateRange | null; selectors?: SelectorFilter[] }) {
  const { t, lang } = useT()
  const db = useDb()
  const id = spec.y[0] ?? ''
  const col = ds.byId.get(id)?.field
  const [value = null] = useTotals(spec, ds, range, selectors, useMemo(() => [id], [id]))
  const prev = useMemo(() => {
    if (!range) return null
    const q = chartQuery(ds, { ...spec, visual: 'kpi', x: [], y: [id], color: undefined }, prevRange(range), selectors)
    const v = runQuery(db, ds, q).rows[0]?.[0]
    return typeof v === 'number' ? v : null
  }, [db, ds, spec, id, range, selectors])
  const spark = useMemo(() => {
    const day = ds.byName.get('Sana')
    if (!range || !day) return null
    const q = chartQuery(ds, { ...spec, visual: 'line', x: [day.field.id], y: [id], color: undefined }, range, selectors)
    const rows = runQuery(db, ds, q).rows
    return rows.length > 2 ? rows.map((r) => num(r[1])) : null
  }, [db, ds, spec, id, range, selectors])
  const goal = spec.options?.goal
  const lower = lowerIsBetter(col?.name ?? id)
  const v = num(value)
  const onTrack = typeof goal === 'number' ? (lower ? v <= goal : v >= goal) : null
  const progress = typeof goal === 'number' && goal !== 0 ? Math.max(0, Math.min(1, lower ? (v ? goal / v : 1) : v / goal)) : null
  const delta = prev ? (v - prev) / Math.abs(prev) : null
  const good = delta === null || delta === 0 ? null : delta > 0 !== lower
  const fmt = (n: number, compact = false) => formatValue(n, col?.format, lang, compact)
  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[2rem] leading-none font-bold tracking-[-0.03em] text-ink">
          <Odometer value={v} format={(n) => fmt(n, true)} />
        </p>
        {onTrack !== null && (
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.75rem] font-semibold', onTrack ? 'bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]' : 'bg-[var(--danger-soft)] text-danger')}>
            {onTrack ? <CheckCircle2 aria-hidden size={13} /> : <AlertTriangle aria-hidden size={13} />}
            {onTrack ? t("Me'yorda") : t('Xavf ostida')}
          </span>
        )}
      </div>
      {typeof goal === 'number' && (
        <div>
          <div className="mb-1 flex justify-between text-[0.75rem] text-ink-3">
            <span>{t('Maqsad')}: <b className="num font-semibold text-ink-2">{fmt(goal)}</b></span>
            {progress !== null && <span className="num">{fmtPct(progress, 0, lang)}</span>}
          </div>
          <span className="block h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className={cx('block h-full rounded-full', onTrack ? 'bg-[var(--good)]' : 'bg-[var(--warm)]')} style={{ width: `${(progress ?? 0) * 100}%` }} />
          </span>
        </div>
      )}
      {delta !== null && (
        <p className="text-[0.8125rem]">
          <span className={cx('num inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold', good ? 'bg-mint/70 text-mint-ink' : 'bg-surface-2 text-ink-2')}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'} {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
          </span>{' '}
          <span className="text-ink-3">{t('oldingi davrga nisbatan')}</span>
        </p>
      )}
      {spark && (
        <div className="mt-auto h-12">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  )
}

/* ---------------- Diagnostika kartasi ---------------- */

function Diagnostic({ spec, ds, range, selectors }: { spec: ChartSpec; ds: DatasetRuntime; range: DateRange | null; selectors?: SelectorFilter[] }) {
  const { t, lang } = useT()
  const db = useDb()
  const ids = useMemo(() => spec.y.slice(0, 2), [spec.y])
  const totals = useTotals(spec, ds, range, selectors, ids)
  const records = useMemo(() => queueRecords(db, ds, spec, range, selectors).length, [db, ds, spec, range, selectors])
  const tiles = [
    ...ids.map((id, i) => ({ key: id, label: ds.byId.get(id)?.field.name ?? id, text: formatValue(totals[i] ?? null, ds.byId.get(id)?.field.format, lang, true) })),
    { key: '__rows', label: 'Yozuvlar', text: fmtNum(records, 0, lang) },
  ].slice(0, 3)
  const note = spec.options?.note
  const steps = spec.options?.steps ?? []
  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((x) => (
          <div key={x.key} className="rounded-[14px] border border-line bg-surface-2/60 px-2.5 py-2">
            <p className="line-clamp-1 text-[0.6875rem] font-semibold text-ink-3" title={t(x.label)}>
              {t(x.label)}
            </p>
            <p className="num mt-0.5 text-[1.125rem] font-bold text-ink">{x.text}</p>
          </div>
        ))}
      </div>
      {note && <p className="text-[0.8125rem] leading-snug text-ink-2">{note}</p>}
      {steps.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {steps.map((s) => (
            <li key={s} className="flex items-start gap-2 rounded-[12px] bg-primary-soft/50 px-2.5 py-1.5 text-[0.8125rem] text-ink">
              <Circle aria-hidden size={13} className="mt-0.5 shrink-0 text-primary-strong" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Empty() {
  const { t } = useT()
  return (
    <div className="grid h-full min-h-[80px] place-items-center">
      <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[0.8125rem] text-ink-3">{t("Tanlangan davrda ma'lumot yo'q")}</span>
    </div>
  )
}
