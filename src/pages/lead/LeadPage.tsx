import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  CircleX,
  Eye,
  Hourglass,
  Layers,
  ListTree,
  Percent,
  Phone,
  Radio,
  ShieldX,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import type { Lang } from '@/lib/settings'
import { fmtMonth, fmtNum, fmtPct, fmtShortDate } from '@/lib/format'
import { useDb } from '@/data/db'
import { bucketRows, type DateRange } from '@/data/range'
import { CoverageNote } from '@/kit/CoverageNote'
import { useDataSource, useMeta } from '@/data/source'
import { useAuthUser } from '@/features/auth/store'
import type { Lead } from '@/data/types'
import type { SnapshotMeta } from '@/features/projects/types'
import { Card } from '@/ui/controls'
import { Segmented, StatCard, type TileColor } from '@/ui/glass'
import { FilterBar, MultiSelect, matchMulti, usePageFilters } from '@/kit/filters'
import { DataTable, sum, type Column } from '@/kit/DataTable'
import { HierTable } from '@/kit/hier/HierTable'
import { useRecordDims, type HierExtra } from '@/kit/hier/records'
import { ReasonList, ratio } from '@/kit/blocks'
import { fmtDay, fmtTime, useLeadModel, type GRow, type LeadModel, type MetricKey } from './model'
import { LeadDrill, LeadMatrix, NameCell, SourceIcon, type LeadDrillState } from './parts'
import { useIndustryProfile } from '@/features/projects/industry/context'
import { kpiOrder } from '@/features/projects/industry/profiles'
import { useBlockViews, VIEW_KEEP } from '@/features/blockedit/views'
import { CrmLink } from '@/kit/CrmLink'
import { useLiveFilters } from '@/features/livefilters/ctx'
import { explainLeadKpi, liveFilterTexts, pageFilterList, type MetricFilter } from './explain'

const rowTs = (l: { ts: number }) => l.ts

/**
 * Like kit TabsCard, but on phones the tabs drop below the title (in the header they would squeeze the title to "Li…").
 */
function TabsCard<T extends string>({ title, subtitle, icon, tile, tabs, children }: { title: string; subtitle?: string; icon?: LucideIcon; tile?: TileColor; tabs: { value: T; label: string }[]; children: (tab: T) => ReactNode }) {
  const { t } = useT()
  const [tab, setTab] = useState<T>(tabs[0]!.value)
  // the views as the block's edit shows them (hidden / reordered / renamed in edit mode — blockedit/views.ts)
  const own = { value: tab, set: setTab }
  return (
    <Card title={t(title)} uz={title} subtitle={subtitle ? t(subtitle) : undefined} icon={icon} tile={tile} flush dense actions={<ViewSeg title={title} tabs={tabs} own={own} className="hidden sm:block" />}>
      <ViewSeg title={title} tabs={tabs} own={own} className="scroll-thin overflow-x-auto px-4 pb-2 sm:hidden" />
      <ViewBody tabs={tabs} own={own} render={children} />
    </Card>
  )
}

type ViewTabs<T extends string> = { tabs: { value: T; label: string }[]; own: { value: T; set: (v: T) => void } }

/** the view switcher of a TabsCard (none when one view is left); it keeps working in edit mode (data-block-keep) */
function ViewSeg<T extends string>({ title, tabs, own, className }: ViewTabs<T> & { title: string; className?: string }) {
  const { t } = useT()
  const v = useBlockViews(tabs.map((x) => ({ value: x.value, label: t(x.label) })), own)
  if (v.options.length < 2) return null
  return (
    <div {...VIEW_KEEP} className={className}>
      <Segmented<T> size="xs" label={t(title)} value={v.value} onChange={v.setValue} options={v.options} />
    </div>
  )
}

function ViewBody<T extends string>({ tabs, own, render }: ViewTabs<T> & { render: (tab: T) => ReactNode }) {
  const { t } = useT()
  const v = useBlockViews(tabs.map((x) => ({ value: x.value, label: t(x.label) })), own)
  return <>{render(v.value)}</>
}

/**
 * Opens the lead drill. `title` / `subtitle` are raw Uzbek keys (translated once, inside LeadDrill);
 * pass `literal` for titles that are data (manager names, dates, UTM values) or already composed.
 */
type OpenLeads = (title: string, leads: Lead[], subtitle?: string, literal?: boolean) => void

/** Drill columns (PG / data365 lead drill): # · Lid · Telefon · Sana · Bosqich (+ Sabab when the leads carry reasons). */
function leadColumns(withReason: boolean, t: (s: string) => string, lang: Lang, leadStage: LeadModel['leadStage'], withQualified = false): Column<Lead>[] {
  const cols: Column<Lead>[] = [
    {
      key: 'name',
      label: 'Lid',
      value: (l) => l.name,
      render: (l) => (
        <span className="block leading-tight">
          <span className="block whitespace-nowrap">{l.name}</span>
          <CrmLink kind="lead" id={l.id} className="text-[0.6875rem] font-normal" />
        </span>
      ),
    },
    { key: 'phone', label: 'Telefon', value: (l) => l.phone, render: (l) => <span className="num whitespace-nowrap">{l.phone}</span> },
    {
      key: 'ts',
      label: 'Sana',
      value: (l) => l.ts,
      render: (l) => (
        <span className="num whitespace-nowrap">
          {fmtShortDate(new Date(l.ts), lang)} <span className="text-ink-3">{fmtTime(l.ts)}</span>
        </span>
      ),
    },
    { key: 'stage', label: 'Bosqich', value: (l) => leadStage(l), render: (l) => <span className="chip whitespace-nowrap text-[0.75rem]">{t(leadStage(l))}</span> },
  ]
  // the qualified leads' proof (2026-11-09: «Sifatli» counted leads that stand on «Звонки» today): the chosen stage each one
  // reached and when — "Sifatli lid" is a stage ever reached, not the stage it is in now
  if (withQualified)
    cols.push({
      key: 'qualified',
      label: 'Sifatli bosqich',
      value: (l) => l.qualified_ts ?? 0,
      render: (l) => (
        <span className="whitespace-nowrap">
          {l.qualified_by ? t(qualifiedByLabel(l.qualified_by)) : '—'}
          {l.qualified_ts ? (
            <span className="num text-ink-3">
              {' · '}
              {fmtShortDate(new Date(l.qualified_ts), lang)} {fmtTime(l.qualified_ts)}
            </span>
          ) : null}
        </span>
      ),
    })
  if (withReason) cols.push({ key: 'reason', label: 'Sabab', value: (l) => l.reason, render: (l) => <span className="whitespace-nowrap">{l.reason ? t(l.reason) : '—'}</span> })
  return cols
}

/** a proof that is not a stage: its deal reached a chosen deal stage, or a visit was booked */
export function qualifiedByLabel(by: string): string {
  if (by === '@deal') return 'Sdelka bosqichi'
  if (by === '@booked') return 'Tashrif belgilandi'
  return by
}

/* ── KPI ─────────────────────────────────────────────────────────────────────────────────────────────── */

interface Kpi {
  label: string
  icon: LucideIcon
  tile: TileColor
  num: MetricKey
  den?: MetricKey
  sub: string
  info: string
}

/** AIST 12-card grid (PG / colba / data365), 2 rows of 6. */
const KPIS: Kpi[] = [
  { label: 'Umumiy lid', icon: Users, tile: 'blue', num: 'umumiy', sub: 'Jami lidlar soni', info: 'Davrda yaratilgan barcha lidlar' },
  { label: 'Sifatli lid', icon: Sparkles, tile: 'cyan', num: 'sifatli', sub: 'Sifatli bosqichga yetgan', info: "«Sifatli lid» yoki undan keyingi bosqichga yetgan lidlar (keyin bekor bo'lganlari ham)" },
  { label: 'Sifatli konversiya', icon: Percent, tile: 'teal', num: 'sifatli', den: 'umumiy', sub: 'Sifatli lid ÷ Umumiy lid', info: 'Sifatli lid ÷ Umumiy lid' },
  { label: 'Tashrif belgilandi', icon: CalendarCheck, tile: 'indigo', num: 'belg', sub: 'Uchrashuv rejalashtirilgan', info: 'Uchrashuv belgilangan lidlar (hozirgi bosqichdan mustaqil)' },
  { label: 'Sifatli → Tashrif belg.', icon: TrendingUp, tile: 'purple', num: 'belg', den: 'sifatli', sub: 'Tashrif belgilandi ÷ Sifatli lid', info: 'Tashrif belgilandi ÷ Sifatli lid' },
  { label: 'Tashrif buyurdi', icon: Eye, tile: 'green', num: 'buy', sub: "Uchrashuv bo'lib o'tdi", info: "«Uchrashuv bo'ldi» bosqichiga yetgan lidlar" },
  { label: 'Sifatli → Tashrif buyurdi', icon: CircleCheck, tile: 'mint', num: 'buy', den: 'sifatli', sub: 'Qaror nuqtasidan', info: 'Tashrif buyurdi ÷ Sifatli lid' },
  { label: 'Jarayonda', icon: Hourglass, tile: 'yellow', num: 'jarayonda', sub: 'Jarayondagi lidlar', info: "Bitrix'da jarayonda deb belgilangan bosqichlardagi lidlar" },
  { label: 'Sifatsiz lid', icon: ShieldX, tile: 'orange', num: 'sifatsiz', sub: 'Sifatsiz deb belgilangan', info: '«Sifatsiz» bosqichidagi lidlar' },
  { label: "Bekor bo'ldi", icon: CircleX, tile: 'gray', num: 'bekor', sub: "Bekor bo'lgan lidlar", info: '«Bekor qilindi» bosqichidagi lidlar' },
  { label: "Qo'ng'iroq", icon: Phone, tile: 'pink', num: 'zvonok', sub: "Qo'ng'iroq manbasidan", info: "Manbasi «Qo'ng'iroq» bo'lgan lidlar" },
  { label: 'Yakuniy konversiya', icon: Target, tile: 'accent', num: 'buy', den: 'umumiy', sub: 'Tashrif buyurdi ÷ Umumiy lid', info: 'Tashrif buyurdi ÷ Umumiy lid' },
]

/** the visit cards: shown only where the business has visits (meta.visits !== false) */
const VISIT_KPIS = new Set(['Tashrif belgilandi', 'Sifatli → Tashrif belg.', 'Tashrif buyurdi', 'Sifatli → Tashrif buyurdi'])

/**
 * The KPI cards of this dashboard: without visits (owner, 2026-10-24: "not every dashboard has visit booked") the visit cards
 * are not there at all and the final conversion counts the leads that succeeded.
 */
export function kpisFor(meta: Pick<SnapshotMeta, 'visits' | 'qualifiedSet' | 'leadStages'>): (Kpi & { unset?: boolean; noSuccess?: boolean })[] {
  const visits = meta.visits !== false
  // without visits the final conversion counts the leads that reached a success stage: a portal whose lead pipeline has
  // none (the sales close in deals) would only ever show 0%, so the card says why instead
  const noSuccess = !visits && !!meta.leadStages?.length && !meta.leadStages.some((s) => s.group === 'won' || s.group === 'visited')
  return KPIS.filter((k) => visits || !VISIT_KPIS.has(k.label)).map((k) => {
    if (noSuccess && k.label === 'Yakuniy konversiya') return { ...k, sub: 'Muvaffaqiyatli ÷ Umumiy lid', info: 'Muvaffaqiyatli yakunlangan lidlar ÷ Umumiy lid', noSuccess: true }
    const shown = !visits && k.label === 'Yakuniy konversiya' ? { ...k, sub: 'Muvaffaqiyatli ÷ Umumiy lid', info: 'Muvaffaqiyatli yakunlangan lidlar ÷ Umumiy lid' } : k
    // the "Sifatli lid" cards before the owner chose its stages
    return meta.qualifiedSet === false && (k.num === 'sifatli' || k.den === 'sifatli') ? { ...shown, unset: true } : shown
  })
}

/**
 * The lead cards in their place (owner, 2026-11-09: "where are our default numbers — leads, leads in progress?"): every
 * dashboard opens on Umumiy lid and Jarayonda, as the default lead page always did; an industry's own tiles (an education
 * centre's trial lessons) come right after them, never in front.
 */
export const CORE_LEAD_KPIS = ['Umumiy lid', 'Jarayonda'] as const

export function leadKpiOrder<K extends { label: string }>(cards: readonly K[], industryFirst: readonly string[] | undefined): K[] {
  const core = CORE_LEAD_KPIS.flatMap((l) => cards.filter((k) => k.label === l))
  const rest = cards.filter((k) => !(CORE_LEAD_KPIS as readonly string[]).includes(k.label))
  return [...core, ...kpiOrder(rest, (k) => k.label, industryFirst)]
}

/** "Sifatli lid" is the owner's own choice: until he makes it, its cards say so instead of showing 0 */
const useQualifiedSet = () => useMeta().qualifiedSet !== false

/** where the owner chooses the "Sifatli lid" stages (the project's Questions step); null for viewers who can't change it */
function useQualifiedHref(): string | null {
  const { spec } = useDataSource()
  const user = useAuthUser()
  return spec.kind === 'project' && user ? `#/p/${spec.projectId}/savollar?q=lead.qualified` : null
}

/** a card that needs "Sifatli lid" while its stages are not chosen: "— · Belgilanmagan · belgilash" */
function UnsetKpi({ k }: { k: Kpi }) {
  const { t } = useT()
  const href = useQualifiedHref()
  return (
    <StatCard
      label={t(k.label)} uz={k.label}
      value={0}
      icon={k.icon}
      tile={k.tile}
      format={() => '—'}
      info={t("Qaysi bosqichlar sifatli lid ekanini hali belgilamagansiz — belgilagach, karta hisoblanadi.")}
      sub={
        <span className="text-ink-3" data-unset="qualified">
          {t('Belgilanmagan')}
          {href && (
            <>
              {' · '}
              <a href={href} className="font-semibold text-primary-strong underline-offset-2 hover:underline">
                {t('belgilash')}
              </a>
            </>
          )}
        </span>
      }
    />
  )
}

/** the final conversion where the portal's lead pipeline has no success stage: "—" and why, instead of a bare 0% */
function NoSuccessKpi({ k }: { k: Kpi }) {
  const { t } = useT()
  const why = t("Bu portalda lid uchun muvaffaqiyatli bosqich yo'q — sotuv sdelkalarda")
  return (
    <StatCard
      label={t(k.label)} uz={k.label}
      value={0}
      icon={k.icon}
      tile={k.tile}
      format={() => '—'}
      info={why}
      sub={
        <span className="text-ink-3" data-empty="no-lead-success">
          {why}
        </span>
      }
    />
  )
}

function KpiGrid({ leads, range, open, pageFilters }: { leads: Lead[]; range: DateRange; open: OpenLeads; pageFilters: MetricFilter[] }) {
  const { t, lang } = useT()
  const model = useLeadModel()
  const { TEST, count } = model
  const meta = useMeta()
  const lf = useLiveFilters()
  // how each card's number is computed, from the same leads and predicates (explain.ts): Nova's metric_definition
  const explain = (k: Kpi) => () =>
    explainLeadKpi(k, leads, {
      range,
      model,
      shown: t(k.label),
      callSources: meta.callSources,
      filters: {
        page: pageFilters,
        added: lf ? liveFilterTexts(lf.items, (it) => lf.value(it.field), lf.byKey) : [],
        hidden: lf ? liveFilterTexts(lf.hidden, (it) => it.value, lf.byKey) : [],
      },
    })
  const total = useMemo(() => count(leads), [leads])
  // the trend line: a point per day, week or month by the period's length (data/range bucketRows)
  const byDay = useMemo(() => bucketRows(leads, range, (l) => l.day).groups.map((g) => count(g)), [leads, range])
  // the core counts first, then the industry's tiles (a clinic: Qabulga yozildi, Qabulga keldi), then the rest
  const kpis = leadKpiOrder(kpisFor(meta), useIndustryProfile()?.kpiFirst.lead)
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {kpis.map((k) => {
        if (k.unset) return <UnsetKpi key={k.label} k={k} />
        if (k.noSuccess) return <NoSuccessKpi key={k.label} k={k} />
        const value = k.den ? ratio(total[k.num], total[k.den]) : total[k.num]
        const spark = byDay.map((c) => (k.den ? ratio(c[k.num], c[k.den]) : c[k.num]))
        return (
          <StatCard
            key={k.label}
            label={t(k.label)} uz={k.label}
            value={value}
            icon={k.icon}
            tile={k.tile}
            format={(n) => (k.den ? fmtPct(n, 1, lang) : fmtNum(n, 0, lang))}
            sub={<span className="text-ink-3">{t(k.sub)}</span>}
            spark={spark.length > 1 ? spark : undefined}
            onClick={() => open(k.label, leads.filter(TEST[k.num]), k.info)}
            explain={explain(k)}
          />
        )
      })}
    </div>
  )
}

/* ── Shared count / ratio columns ────────────────────────────────────────────────────────────────────── */

type CellOpen<R> = (r: R, k: MetricKey, label: string) => void

function countCol(key: MetricKey, label: string, open: CellOpen<GRow>, lang: Lang): Column<GRow> {
  return { key, label, align: 'end', value: (r) => r.c[key], format: (n) => fmtNum(n, 0, lang), total: sum((r) => r.c[key]), onCell: (r) => open(r, key, label) }
}
function ratioCol(key: string, label: string, num: MetricKey, den: MetricKey, open: CellOpen<GRow>, lang: Lang): Column<GRow> {
  return {
    key,
    label,
    align: 'end',
    value: (r) => ratio(r.c[num], r.c[den]),
    format: (n) => fmtPct(n, 1, lang),
    total: (rows) => ratio(sum<GRow>((r) => r.c[num])(rows), sum<GRow>((r) => r.c[den])(rows)),
    onCell: (r) => open(r, num, label),
  }
}

/* ── Lid va konversiya ───────────────────────────────────────────────────────────────────────────────── */

type Dim = 'manager' | 'source' | 'stage' | 'date'
const DIM_TABS: { value: Dim; label: string }[] = [
  { value: 'manager', label: "Mas'ul" },
  { value: 'source', label: 'Manba' },
  { value: 'stage', label: 'Bosqich' },
  { value: 'date', label: 'Sana' },
]

/**
 * A row of the expandable table (PG KonversiyaTable): Mas'ul → stages, Bosqich → Mas'ul, Sana → month → day.
 * Sorting uses the parent's values, so children always stay right under their parent.
 */
interface TRow extends GRow {
  depth: 0 | 1
  top: TRow | null
  /** drill title (already display text when `literal`) */
  title: string
  literal: boolean
  kids: TRow[]
}

const mkRow = (g: GRow, title: string, literal: boolean, top: TRow | null): TRow => ({ ...g, depth: top ? 1 : 0, top, title, literal, kids: [] })
const topOf = (r: TRow) => r.top ?? r

/** Drill-able number that the table shows for the row itself (sort/total run on the parent). */
function NumBtn({ v, text, onClick, sub }: { v: number; text: string; onClick: () => void; sub: boolean }) {
  if (!v) return <span className={sub ? 'text-ink-3' : undefined}>{text}</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cx('rounded-[6px] px-1 underline-offset-2 hover:bg-primary-soft hover:text-primary-strong hover:underline', sub ? 'font-medium text-ink-2' : 'font-semibold text-ink')}
    >
      {text}
    </button>
  )
}

function KonversiyaCard({ leads, hue, open }: { leads: Lead[]; hue: Map<string, number>; open: OpenLeads }) {
  const { t, lang } = useT()
  const visits = useMeta().visits !== false
  return (
    <TabsCard<Dim> title="Lid va konversiya" subtitle={visits ? 'Konversiya = Tashrif buyurdi ÷ Umumiy lid' : 'Konversiya = Muvaffaqiyatli ÷ Umumiy lid'} icon={Layers} tile="blue" tabs={DIM_TABS}>
      {(dim) => <KonversiyaTable key={dim} dim={dim} leads={leads} hue={hue} open={open} t={t} lang={lang} />}
    </TabsCard>
  )
}

function KonversiyaTable({ dim, leads, hue, open, t, lang }: { dim: Dim; leads: Lead[]; hue: Map<string, number>; open: OpenLeads; t: (s: string) => string; lang: Lang }) {
  const { TEST, groupBy, leadStage, stageOrder } = useLeadModel()
  const tops = useMemo<TRow[]>(() => {
    if (dim === 'manager')
      return groupBy(leads, (l) => l.manager).map((g) => {
        const top = mkRow(g, g.key, true, null)
        const by = groupBy(g.leads, (l) => leadStage(l))
        top.kids = stageOrder(by.map((x) => x.key)).flatMap((s) => {
          const k = by.find((x) => x.key === s)
          return k ? [mkRow(k, `${g.key} · ${t(s)}`, true, top)] : []
        })
        return top
      })
    if (dim === 'stage') {
      const g = groupBy(leads, (l) => leadStage(l))
      return stageOrder(g.map((x) => x.key)).flatMap((s) => {
        const x = g.find((r) => r.key === s)
        if (!x) return []
        const top = mkRow(x, s, false, null)
        top.kids = groupBy(x.leads, (l) => l.manager).map((m) => mkRow(m, `${t(s)} · ${m.key}`, true, top))
        return [top]
      })
    }
    if (dim === 'date')
      return groupBy(leads, (l) => l.day.slice(0, 7)).map((g) => {
        const top = mkRow(g, fmtMonth(new Date(`${g.key}-01T00:00:00`), lang), true, null)
        top.kids = groupBy(g.leads, (l) => l.day)
          .sort((a, b) => (a.key < b.key ? 1 : -1))
          .map((d) => mkRow(d, fmtDay(d.key), true, top))
        return top
      })
    return groupBy(leads, (l) => l.source).map((g) => mkRow(g, g.key, false, null))
  }, [dim, leads, t, lang])

  // Sana opens on the latest month; the other tabs start collapsed.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(dim === 'date' ? [...tops].sort((a, b) => (a.key < b.key ? 1 : -1)).slice(0, 1).map((r) => r.key) : []))
  const toggle = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  const rows = useMemo(() => tops.flatMap((r) => (expanded.has(r.key) ? [r, ...r.kids] : [r])), [tops, expanded])

  const first = DIM_TABS.find((d) => d.value === dim)!.label
  const cell = (r: TRow, k: MetricKey, col: string) => open(r.title, r.leads.filter(TEST[k]), col, r.literal)
  const onlyTop = (rows: TRow[]) => rows.filter((r) => !r.depth)

  const cnt = (key: MetricKey, label: string): Column<TRow> => ({
    key,
    label,
    align: 'end',
    value: (r) => topOf(r).c[key],
    // bars / colour rules measure the row's own number (value is the parent's, for sorting)
    own: (r) => r.c[key],
    render: (r) => <NumBtn v={r.c[key]} text={fmtNum(r.c[key], 0, lang)} sub={!!r.depth} onClick={() => cell(r, key, label)} />,
    format: (n) => fmtNum(n, 0, lang),
    total: (rows) => sum<TRow>((r) => r.c[key])(onlyTop(rows)),
  })
  const rat = (key: string, label: string, num: MetricKey, den: MetricKey): Column<TRow> => ({
    key,
    label,
    align: 'end',
    value: (r) => ratio(topOf(r).c[num], topOf(r).c[den]),
    own: (r) => ratio(r.c[num], r.c[den]),
    render: (r) => <NumBtn v={r.c[num]} text={fmtPct(ratio(r.c[num], r.c[den]), 1, lang)} sub={!!r.depth} onClick={() => cell(r, num, label)} />,
    format: (n) => fmtPct(n, 1, lang),
    total: (rows) => ratio(sum<TRow>((r) => r.c[num])(onlyTop(rows)), sum<TRow>((r) => r.c[den])(onlyTop(rows))),
  })

  const nameOf = (r: TRow): ReactNode => {
    if (r.depth) {
      const k = r.key
      if (dim === 'stage') return <NameCell name={k} hue={hue.get(k)} size={20} />
      if (dim === 'date') return fmtDay(k)
      return t(k)
    }
    if (dim === 'manager') return <NameCell name={r.key} hue={hue.get(r.key)} />
    if (dim === 'source')
      return (
        <span className="flex items-center gap-2">
          <SourceIcon source={r.key} />
          {t(r.key)}
        </span>
      )
    return dim === 'date' ? r.title : t(r.key)
  }

  // Only the Bosqich tab swaps "Tashrif buyurdi" → "Tashrif belgilandi" (PG KonversiyaTable); no visits, no column
  const visits = useMeta().visits !== false
  const qualifiedSet = useQualifiedSet()
  const visit = dim === 'stage' ? cnt('belg', 'Tashrif belgilandi') : cnt('buy', 'Tashrif buyurdi')
  const expandable = dim !== 'source'
  const columns: Column<TRow>[] = [
    {
      key: 'label',
      label: first,
      value: (r) => topOf(r).key,
      render: (r) => (
        <span className={cx('flex items-center gap-1.5 whitespace-nowrap', r.depth ? 'ps-6 text-[0.8125rem] font-normal text-ink-2' : '')}>
          {expandable && !r.depth && <ChevronRight size={14} className={cx('shrink-0 text-ink-3 transition-transform rtl:rotate-180', expanded.has(r.key) && '!rotate-90')} />}
          {nameOf(r)}
        </span>
      ),
    },
    cnt('umumiy', 'Umumiy lid'),
    cnt('jarayonda', 'Jarayonda'),
    cnt('bekor', "Bekor bo'ldi"),
    cnt('sifatsiz', 'Sifatsiz lid'),
    ...(visits ? [visit] : []),
    rat('konv', 'Konversiya', 'buy', 'umumiy'),
    ...(qualifiedSet ? [rat('sifkonv', 'Sifatli konversiya', 'sifatli', 'umumiy')] : []),
  ]
  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => (r.top ? `${r.top.key}|${r.key}` : r.key)}
        // a parent and its stages are compared within their own level
        level={(r) => r.depth}
        numbered
        maxHeight={dim === 'date' ? 560 : undefined}
        initialSort={dim === 'date' ? { key: 'label', dir: 'desc' } : undefined}
        onRow={(r) => (expandable && !r.depth ? toggle(r.key) : open(r.title, r.leads, first, r.literal))}
      />
    </>
  )
}

/* ── UTM bo'yicha ───────────────────────────────────────────────────────────────────────────────────── */

type UtmLevel = 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'manager'
type UtmMode = 'hier' | Exclude<UtmLevel, 'manager'>
const UTM_LEVELS: UtmLevel[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'manager']
const UTM_LABEL: Record<UtmLevel, string> = { utm_source: 'UTM source', utm_medium: 'UTM medium', utm_campaign: 'UTM campaign', utm_content: 'UTM content', manager: "Mas'ul" }
const UTM_MODES: { value: UtmMode; label: string }[] = [
  { value: 'hier', label: 'Ierarxiya' },
  { value: 'utm_source', label: 'Source' },
  { value: 'utm_medium', label: 'Medium' },
  { value: 'utm_campaign', label: 'Campaign' },
  { value: 'utm_content', label: 'Content' },
]

function UtmCard({ leads, hue, open }: { leads: Lead[]; hue: Map<string, number>; open: OpenLeads }) {
  const { t, lang } = useT()
  const { TEST, groupBy } = useLeadModel()
  const visits = useMeta().visits !== false
  const qualifiedSet = useQualifiedSet()
  const [mode, setMode] = useState<UtmMode>('hier')
  const [path, setPath] = useState<string[]>([])
  const depth = mode === 'hier' ? path.length : 0
  const level: UtmLevel = mode === 'hier' ? UTM_LEVELS[depth]! : mode
  const scoped = useMemo(() => (mode === 'hier' ? leads.filter((l) => path.every((v, i) => (l[UTM_LEVELS[i]!] || 'Belgilanmagan') === v)) : leads), [leads, mode, path])
  const rows = useMemo(() => groupBy(scoped, (l) => l[level]), [scoped, level])
  const label = (r: GRow) => (level === 'manager' || r.key !== 'Belgilanmagan' ? r.key : t(r.key))
  const literal = (r: GRow) => r.key !== 'Belgilanmagan'
  const cell = (r: GRow, k: MetricKey, col: string) => open(r.key, r.leads.filter(TEST[k]), col, literal(r))
  const last = level === 'manager'
  const columns: Column<GRow>[] = [
    {
      key: 'label',
      label: UTM_LABEL[level],
      value: (r) => r.key,
      render: (r) =>
        level === 'manager' ? (
          <NameCell name={r.key} hue={hue.get(r.key)} />
        ) : (
          <span className="flex items-center gap-1 whitespace-nowrap">
            {label(r)}
            {mode === 'hier' && <ChevronRight size={14} className="text-ink-3 rtl:rotate-180" />}
          </span>
        ),
    },
    countCol('umumiy', 'Umumiy lidlar', cell, lang),
    countCol('jarayonda', 'Jarayonda', cell, lang),
    ...(qualifiedSet ? [countCol('sifatli', 'Sifatli lid', cell, lang)] : []),
    ...(visits ? [countCol('belg', 'Tashrif belgilandi', cell, lang), countCol('buy', 'Tashrif buyurdi', cell, lang)] : []),
    countCol('sifatsiz', 'Sifatsiz', cell, lang),
    countCol('bekor', "Bekor bo'ldi", cell, lang),
    ratioCol('konv', 'Konversiya', 'buy', 'umumiy', cell, lang),
  ]
  return (
    <Card title={t("UTM bo'yicha")} uz={"UTM bo'yicha"} subtitle={t('Qatorni bosib keyingi darajani oching')} icon={ListTree} tile="purple" flush dense>
      <div className="scroll-thin overflow-x-auto px-4 pb-2 sm:px-5">
        <Segmented<UtmMode>
          size="xs"
          label={t("UTM bo'yicha")}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setPath([])
          }}
          options={UTM_MODES.map((m) => ({ value: m.value, label: t(m.label) }))}
        />
      </div>
      {mode === 'hier' && (
        <nav aria-label={t('Daraja')} className="flex flex-wrap items-center gap-1 px-4 pb-2 text-[0.8125rem] sm:px-5">
          <button type="button" onClick={() => setPath([])} className={cx('rounded-full px-2 py-0.5 hover:bg-surface-2', path.length ? 'text-primary-strong' : 'font-semibold text-ink')}>
            {t('Hammasi')}
          </button>
          {path.map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={13} className="text-ink-3 rtl:rotate-180" />
              <button
                type="button"
                onClick={() => setPath(path.slice(0, i + 1))}
                className={cx('max-w-[180px] truncate rounded-full px-2 py-0.5 hover:bg-surface-2', i === path.length - 1 ? 'font-semibold text-ink' : 'text-primary-strong')}
              >
                <span className="text-ink-3">{t(UTM_LABEL[UTM_LEVELS[i]!])}: </span>
                {v === 'Belgilanmagan' ? t(v) : v}
              </button>
            </span>
          ))}
        </nav>
      )}
      <DataTable
        key={`${mode}-${depth}`}
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        numbered
        onRow={(r) => (mode === 'hier' && !last ? setPath([...path, r.key]) : open(r.key, r.leads, UTM_LABEL[level], literal(r)))}
      />
    </Card>
  )
}

/* ── Reasons ────────────────────────────────────────────────────────────────────────────────────────── */

const reasonItems = (leads: Lead[], groupBy: LeadModel['groupBy']) => groupBy(leads, (l) => l.reason).map((r) => ({ reason: r.key, count: r.c.umumiy }))

type ReasonTab = 'bekor' | 'sifatsiz'

function ReasonByManager({ bekor, sifatsiz, hue, open }: { bekor: Lead[]; sifatsiz: Lead[]; hue: Map<string, number>; open: OpenLeads }) {
  return (
    <TabsCard<ReasonTab>
      title="Sabablar mas'ullar kesimida"
      subtitle="Har bir mas'ul bo'yicha sabablar soni"
      icon={UserX}
      tile="orange"
      tabs={[
        { value: 'bekor', label: "Bekor bo'lish" },
        { value: 'sifatsiz', label: 'Sifatsiz' },
      ]}
    >
      {(tab) => <ReasonMatrix key={tab} leads={tab === 'bekor' ? bekor : sifatsiz} hue={hue} open={open} />}
    </TabsCard>
  )
}

function ReasonMatrix({ leads, hue, open }: { leads: Lead[]; hue: Map<string, number>; open: OpenLeads }) {
  const { t } = useT()
  const { groupBy } = useLeadModel()
  const { rows, cols, cells } = useMemo(() => {
    const cells = new Map<string, Lead[]>()
    for (const l of leads) {
      const k = `${l.manager}|${l.reason || 'Belgilanmagan'}`
      let a = cells.get(k)
      if (!a) cells.set(k, (a = []))
      a.push(l)
    }
    return { rows: groupBy(leads, (l) => l.manager).map((r) => r.key), cols: groupBy(leads, (l) => l.reason).map((r) => r.key), cells }
  }, [leads])
  if (!rows.length) return <p className="py-8 text-center text-[0.875rem] text-ink-3">{t("Tanlangan davrda ma'lumot yo'q")}</p>
  return (
    <LeadMatrix
      rows={rows}
      cols={cols}
      rowLabel="Mas'ul"
      totalLabel="Jami"
      hue={hue}
      get={(r, c) => cells.get(`${r}|${c}`)?.length ?? 0}
      onCell={(r, c) => open(r, c ? cells.get(`${r}|${c}`) ?? [] : leads.filter((l) => l.manager === r), c ?? 'Jami', true)}
    />
  )
}

/* ── Page ───────────────────────────────────────────────────────────────────────────────────────────── */

const FILTER_KEYS = ['manager', 'stage', 'source'] as const
/** the filter bar's names (Nova reads them in a card's definition) */
const PAGE_FILTER_LABELS: Record<string, string> = { manager: "Mas'ul xodim", stage: 'Bosqich (hozirgi)', source: 'Manba' }

export default function LeadPage() {
  const { t, lang } = useT()
  const db = useDb()
  const meta = useMeta()
  const { TEST, groupBy, leadStage, stageOrder } = useLeadModel()
  const visits = meta.visits !== false
  const qualifiedSet = useQualifiedSet()
  const f = usePageFilters(FILTER_KEYS)
  const r = f.range
  const [drill, setDrill] = useState<LeadDrillState | null>(null)

  const inRange = useMemo(() => db.leads.filter((l) => l.ts >= r.from && l.ts < r.to), [db, r.from, r.to])
  const managers = useMemo(() => {
    const s = new Set(inRange.map((l) => l.manager))
    for (const v of f.multi.manager.values) s.add(v)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [inRange, f.multi.manager.values])
  const leads = useMemo(
    () => inRange.filter((l) => matchMulti(l.manager, f.multi.manager) && matchMulti(leadStage(l), f.multi.stage) && matchMulti(l.source, f.multi.source)),
    [inRange, f.multi],
  )
  const hue = useMemo(() => new Map(db.staff.map((s) => [s.name, s.hue])), [db])

  const open: OpenLeads = (title, rows, subtitle, literal) =>
    setDrill({
      title,
      literal,
      subtitle,
      rows: [...rows].sort((a, b) => b.ts - a.ts),
      columns: leadColumns(rows.some((l) => l.reason), t, lang, leadStage, rows.length > 0 && rows.every((l) => l.qualified) && rows.some((l) => l.qualified_by)),
    })

  // Lid mas'ullar kesimida: Mas'ul × every lead stage
  const matrix = useMemo(() => {
    const m = new Map<string, Lead[]>()
    for (const l of leads) {
      const k = `${l.manager}|${leadStage(l)}`
      let a = m.get(k)
      if (!a) m.set(k, (a = []))
      a.push(l)
    }
    return { rows: groupBy(leads, (l) => l.manager).map((x) => x.key), cells: m }
  }, [leads])

  // only the stage buckets that hold leads: a business without visits has no empty "Tashrif" columns, and a bucket no stage
  // maps to (e.g. the old "Sifatli lid" one, now the owner's own choice) is not shown as a stage of zeros
  const usedStages = useMemo(() => stageOrder(inRange.map((l) => leadStage(l))), [inRange])
  // the Bosqich filter offers the stages that hold leads in the period (plus any already chosen)
  const stageOptions = useMemo(() => stageOrder([...usedStages, ...f.multi.stage.values]), [usedStages, f.multi.stage.values])
  const sources = useMemo(() => groupBy(leads, (l) => l.source), [leads])
  const bekor = useMemo(() => leads.filter(TEST.bekor), [leads])
  const sifatsiz = useMemo(() => leads.filter(TEST.sifatsiz), [leads])

  // "Manba bo'yicha" may be nested (Ierarxiya / Nova, kit/hier): every level's row is the lead model's GRow of its leads,
  // so the table's columns (counts; Konversiya = Tashrif buyurdi ÷ Umumiy, Sifatli kon. = Sifatli ÷ Umumiy) are the group's own
  const { count } = useLeadModel()
  const makeRow = useCallback((key: string, ls: Lead[]): GRow => ({ key, label: key, leads: ls, c: count(ls) }), [count])
  const leadExtras = useMemo<HierExtra<Lead>[]>(
    () => [
      { key: 'stage', label: 'Bosqich', keyOf: (l) => leadStage(l), order: (a, b) => stageOrder([a, b])[0] === a ? -1 : 1 },
      { key: 'utm_source', label: 'UTM source', keyOf: (l) => l.utm_source },
      { key: 'utm_medium', label: 'UTM medium', keyOf: (l) => l.utm_medium },
      { key: 'utm_campaign', label: 'UTM campaign', keyOf: (l) => l.utm_campaign },
      { key: 'utm_content', label: 'UTM content', keyOf: (l) => l.utm_content },
    ],
    [leadStage, stageOrder],
  )
  const leadDims = useRecordDims<Lead>('source', leadExtras, meta.fields, 'lead', lang)

  const srcCell = (row: GRow, k: MetricKey, col: string) => open(row.key, row.leads.filter(TEST[k]), col)
  const sourceColumns: Column<GRow>[] = [
    { key: 'label', label: 'Manba', value: (x) => x.key, render: (x) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <SourceIcon source={x.key} />
          {t(x.key)}
        </span>
      ),
    },
    countCol('umumiy', 'Umumiy lidlar', srcCell, lang),
    ...(qualifiedSet ? [countCol('sifatli', 'Sifatli lid', srcCell, lang)] : []),
    ...(visits ? [countCol('belg', 'Tashrif belgilandi', srcCell, lang), countCol('buy', 'Tashrif buyurdi', srcCell, lang)] : []),
    countCol('sifatsiz', 'Sifatsiz lid', srcCell, lang),
    countCol('bekor', "Bekor bo'ldi", srcCell, lang),
    ratioCol('konv', 'Konversiya', 'buy', 'umumiy', srcCell, lang),
    ...(qualifiedSet ? [ratioCol('sifkonv', 'Sifatli kon.', 'sifatli', 'umumiy', srcCell, lang)] : []),
  ]

  return (
    <div className="page-in">
      <FilterBar preset={f.preset} onPreset={f.setPreset} active={f.active} onClear={f.clear}>
        <MultiSelect label="Mas'ul xodim" options={managers} value={f.multi.manager} onChange={(m) => f.set('manager', m)} />
        <MultiSelect label="Bosqich" options={stageOptions} value={f.multi.stage} onChange={(m) => f.set('stage', m)} />
        <MultiSelect label="Manba" options={meta.leadSources} value={f.multi.source} onChange={(m) => f.set('source', m)} />
      </FilterBar>
      <CoverageNote what="Lidlar" rows={db.leads} ts={rowTs} range={r} />

      <KpiGrid leads={leads} range={r} open={open} pageFilters={pageFilterList(f.multi, PAGE_FILTER_LABELS)} />

      <div className="mt-4">
        <KonversiyaCard leads={leads} hue={hue} open={open} />
      </div>

      <div className="mt-4">
        <Card title={t("Lid mas'ullar kesimida")} uz={"Lid mas'ullar kesimida"} icon={Users} tile="indigo" flush dense>
          {matrix.rows.length ? (
            <>
              <LeadMatrix
                rows={matrix.rows}
                cols={usedStages}
                rowLabel="Mas'ul"
                totalLabel="Umumiy lid"
                hue={hue}
                get={(m, s) => matrix.cells.get(`${m}|${s}`)?.length ?? 0}
                onCell={(m, s) => open(m, s ? matrix.cells.get(`${m}|${s}`) ?? [] : leads.filter((l) => l.manager === m), s ?? 'Umumiy lid', true)}
              />
            </>
          ) : (
            <p className="py-8 text-center text-[0.875rem] text-ink-3">{t("Tanlangan davrda ma'lumot yo'q")}</p>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title={t("Manba bo'yicha")} uz={"Manba bo'yicha"} subtitle={t('{n} ta manba', { n: sources.length })} icon={Radio} tile="teal" flush dense>
          <HierTable<Lead, GRow>
            records={leads}
            dims={leadDims}
            make={makeRow}
            rows={sources}
            columns={sourceColumns}
            rowKey={(x) => x.key}
            numbered
            onRow={(x, path) => (path.length > 1 ? open(path.join(' · '), x.leads, 'Manba', true) : open(x.key, x.leads, 'Manba'))}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card title={t("Bekor bo'lish sabablari")} uz={"Bekor bo'lish sabablari"} icon={CircleX} tile="gray">
          <ReasonList items={reasonItems(bekor, groupBy)} onItem={(x) => open(x, bekor.filter((l) => (l.reason || 'Belgilanmagan') === x), "Bekor bo'lish sabablari")} />
        </Card>
        <Card title={t('Sifatsiz sabablari')} uz={'Sifatsiz sabablari'} icon={ShieldX} tile="orange">
          <ReasonList items={reasonItems(sifatsiz, groupBy)} onItem={(x) => open(x, sifatsiz.filter((l) => (l.reason || 'Belgilanmagan') === x), 'Sifatsiz sabablari')} />
        </Card>
      </div>

      <div className="mt-4">
        <ReasonByManager bekor={bekor} sifatsiz={sifatsiz} hue={hue} open={open} />
      </div>

      <div className="mt-4">
        <UtmCard leads={leads} hue={hue} open={open} />
      </div>

      <LeadDrill drill={drill} onClose={() => setDrill(null)} />
    </div>
  )
}
