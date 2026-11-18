import { useMemo, useState, type ReactNode } from 'react'
import {
  AlarmClock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Grid3x3,
  Hourglass,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  PhoneOff,
  PieChart,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtNum, fmtPct } from '@/lib/format'
import { useDb } from '@/data/db'
import { useMeta } from '@/data/source'
import { bucketLabel, bucketRows, dayCount, prevRange } from '@/data/range'
import { CoverageNote } from '@/kit/CoverageNote'
import type { Call, Lead } from '@/data/types'
import { EChart, tooltipHtml } from '@/charts/EChart'
import { StatCard, type TileColor } from '@/ui/glass'
import { Badge, Button, Card, Delta, EmptyState } from '@/ui/controls'
import { FilterBar, MultiSelect, matchMulti, usePageFilters } from '@/kit/filters'
import { DataTable, sum, type Column } from '@/kit/DataTable'
import { DrillSheet, type Drill } from '@/kit/blocks'
import {
  answered,
  cardsOf,
  dailyCards,
  fmtDT,
  fmtHms,
  hourGrid,
  isIn,
  isMissed,
  isNoAnswer,
  isOut,
  isRecalled,
  isShort,
  isUnrecalled,
  leadFirstCalls,
  callbackWaits,
  pickupWaits,
  operatorRows,
  outcomeOf,
  phoneKey,
  reasonRows,
  REASON_LABEL,
  waitingClients,
  type Cards,
  type OpRow,
} from './calc'
import { callColumns } from './parts'
import { ReactionSheet } from './ReactionSheet'
import { uncalledColumns } from './uncalled'
import type { UncalledLead } from './calc'
import { OperatorPanel } from './OperatorPanel'

const rowTs = (c: { ts: number }) => c.ts

/**
 * Qo'ng'iroqlar (owner, 2026-11-03: "make it as detailed as the lead section, easy to understand, stunning"). Top to bottom:
 * eight plain numbers → what happened to incoming and outgoing calls → the days / hours → the clients still waiting for a
 * call back and why calls did not connect → when calls come → each operator, with their own call list. Every number opens
 * the calls behind it. The rules are in calc.ts.
 */

const DIRS = ['Kiruvchi', 'Chiquvchi'] as const
const RESULTS = ['Muvaffaqiyatli', 'Qisqa suhbat', 'Javob bermadi', "O'tkazib yuborilgan"] as const
const dirOf = (c: Call) => (isIn(c) ? 'Kiruvchi' : 'Chiquvchi')
const resultOf = (c: Call) =>
  ({
    answered: 'Muvaffaqiyatli',
    short: 'Qisqa suhbat',
    noanswer: 'Javob bermadi',
    missed: "O'tkazib yuborilgan",
  })[outcomeOf(c)]

type Unit = 'ta' | 'min' | 'time'
interface CardDef {
  key: keyof Cards
  label: string
  icon: LucideIcon
  tile: TileColor
  unit: Unit
  goodUp: boolean
  /** share of all calls as a badge */
  share?: 'good' | 'neutral'
  pick: (c: Call) => boolean
  info: string
}

const CARDS: CardDef[] = [
  {
    key: 'total',
    label: "Jami qo'ng'iroqlar",
    icon: Phone,
    tile: 'blue',
    unit: 'ta',
    goodUp: true,
    pick: () => true,
    info: "Tanlangan davrdagi barcha kiruvchi va chiquvchi qo'ng'iroqlar",
  },
  {
    key: 'success',
    label: 'Muvaffaqiyatli',
    icon: PhoneCall,
    tile: 'mint',
    unit: 'ta',
    goodUp: true,
    share: 'good',
    pick: answered,
    info: "Xodim mijoz bilan gaplashgan qo'ng'iroqlar (avtojavob va ovozli pochta hisobga kirmaydi)",
  },
  {
    key: 'noanswer',
    label: 'Javob bermadi',
    icon: PhoneOff,
    tile: 'gray',
    unit: 'ta',
    goodUp: false,
    share: 'neutral',
    pick: isNoAnswer,
    info: "Biz qilgan qo'ng'iroqqa mijoz javob bermagan yoki band bo'lgan",
  },
  {
    key: 'missed',
    label: "O'tkazib yuborilgan",
    icon: PhoneMissed,
    tile: 'orange',
    unit: 'ta',
    goodUp: false,
    share: 'neutral',
    pick: isMissed,
    info: "Mijoz qo'ng'iroq qilgan, lekin hech kim javob bermagan",
  },
  {
    key: 'unrecalled',
    label: "Qayta qo'ng'iroq qilinmagan",
    icon: AlarmClock,
    tile: 'pink',
    unit: 'ta',
    goodUp: false,
    pick: isUnrecalled,
    info: "O'tkazib yuborilgan qo'ng'iroqdan keyin mijozga bir hafta ichida qaytib qo'ng'iroq qilinmagan",
  },
  {
    key: 'avgTalk',
    label: "O'rtacha suhbat",
    icon: Clock,
    tile: 'indigo',
    unit: 'min',
    goodUp: true,
    pick: answered,
    info: "Bitta muvaffaqiyatli qo'ng'iroqdagi o'rtacha suhbat vaqti",
  },
  {
    key: 'talkSum',
    label: 'Jami suhbat vaqti',
    icon: Timer,
    tile: 'purple',
    unit: 'time',
    goodUp: true,
    pick: answered,
    info: "Barcha muvaffaqiyatli qo'ng'iroqlardagi suhbat vaqti yig'indisi",
  },
  {
    key: 'reaksiya',
    label: 'Reaksiya vaqti',
    icon: Hourglass,
    tile: 'cyan',
    unit: 'time',
    goodUp: false,
    pick: isRecalled,
    info: "O'tkazib yuborilgan qo'ng'iroqqa qaytish tezligi (yarmi shundan tezroq). Bosing: javob berish, qaytish va yangi lidga qo'ng'iroq tezligi",
  },
]

/** Qo'ng'iroqlar needs a telephony source; a project without one gets a clear empty state instead of zeros. */
export default function CallsPage() {
  const { t } = useT()
  const { sources } = useMeta()
  if (!sources.telephony)
    return (
      <Card className="page-in">
        <EmptyState
          icon={PhoneOff}
          title={t('Telefoniya ulanmagan')}
          text={t("Bu loyihada qo'ng'iroqlar manbasi yo'q. Bitrix24 telefoniyasi yoki OnlinePBX ulanganda qo'ng'iroqlar shu yerda ko'rinadi.")}
        />
      </Card>
    )
  return <CallsBody />
}

function CallsBody() {
  const { t, lang } = useT()
  const db = useDb()
  const f = usePageFilters(['operator', 'direction', 'result'] as const)
  const r = f.range
  const [drill, setDrill] = useState<Drill<Call> | null>(null)
  const [uncalled, setUncalled] = useState<Drill<UncalledLead<Lead>> | null>(null)
  const [openOp, setOpenOp] = useState<string | null>(null)
  const [reaction, setReaction] = useState(false)
  const { callSources } = useMeta()

  const leads = useMemo(() => new Map<number, Lead>(db.leads.map((l) => [l.id, l])), [db])
  // a missed call that reached nobody still belongs to a client: their latest lead by number says whose they are
  const leadByPhone = useMemo(() => {
    const m = new Map<string, Lead>()
    for (const l of db.leads) {
      const k = phoneKey(l.phone)
      if (k && (m.get(k)?.ts ?? -Infinity) < l.ts) m.set(k, l)
    }
    return m
  }, [db])
  const operators = useMemo(() => [...new Set(db.calls.map((c) => c.operator))].sort(), [db])
  const keep = (c: Call) => matchMulti(c.operator, f.multi.operator) && matchMulti(dirOf(c), f.multi.direction) && matchMulti(resultOf(c), f.multi.result)

  const data = useMemo(() => {
    const calls = db.calls.filter((c) => c.ts >= r.from && c.ts < r.to && keep(c))
    const pr = prevRange(r)
    const prev = cardsOf(db.calls.filter((c) => c.ts >= pr.from && c.ts < pr.to && keep(c)))
    return {
      calls,
      cards: cardsOf(calls),
      prev,
      daily: dailyCards(calls, r),
      ops: operatorRows(calls),
      waiting: waitingClients(calls),
      reasons: reasonRows(calls),
      grid: hourGrid(calls),
      pickup: pickupWaits(calls),
      callback: callbackWaits(calls),
      lead: leadFirstCalls(
        db.leads.filter((l) => l.ts >= r.from && l.ts < r.to && matchMulti(l.manager, f.multi.operator)),
        db.calls.filter((c) => c.ts >= r.from),
        callSources,
        db.calls,
      ),
    }
  }, [db, r.from, r.to, f.multi, callSources])

  const { calls, cards, prev } = data
  const singleDay = dayCount(r) === 1
  const cols = useMemo(() => callColumns(leads, t), [leads, t])
  const open = (title: string, rows: Call[], subtitle?: string) =>
    setDrill({
      title: t(title),
      subtitle,
      rows: [...rows].sort((a, b) => b.ts - a.ts),
      columns: cols,
      rowKey: (c) => String(c.id),
    })
  const n0 = (v: number) => fmtNum(v, 0, lang)

  const fmtVal = (unit: Unit, v: number | null) => (v == null ? '—' : unit === 'time' ? fmtHms(v) : unit === 'min' ? t('{n} min', { n: fmtNum(v / 60, 1, lang) }) : n0(v))
  const deltaText = (unit: Unit, cur: number, p: number) =>
    unit === 'time'
      ? fmtHms(Math.abs(cur - p))
      : unit === 'min'
        ? t('{n} min', { n: fmtNum(Math.abs(cur - p) / 60, 1, lang) })
        : `${fmtNum((Math.abs(cur - p) / Math.abs(p)) * 100, 1, lang)}%`

  // ---- days (or hours of one day), split by outcome ----
  const dyn = useMemo(() => {
    const bucket = (xs: Call[]) => ({
      ok: xs.filter(answered).length,
      short: xs.filter(isShort).length,
      no: xs.filter(isNoAnswer).length,
      miss: xs.filter(isMissed).length,
    })
    if (singleDay) {
      const hrs = calls.map((c) => c.hour)
      const lo = Math.min(8, ...hrs)
      const hi = r.key === 'today' ? Math.max(lo, new Date(r.to).getHours(), ...hrs) : Math.max(20, ...hrs)
      const xs = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
      const b = xs.map((h) => bucket(calls.filter((c) => c.hour === h)))
      return { labels: xs.map((h) => `${String(h).padStart(2, '0')}:00`), groups: [] as Call[][], b }
    }
    // a bar per day, week or month by the period's length (data/range bucketRows): a year is ~12 bars, not 365
    const { grain, buckets, groups } = bucketRows(calls, r, (c) => c.day)
    return {
      labels: buckets.map((x) => bucketLabel(x, grain)),
      groups,
      b: groups.map(bucket),
    }
  }, [calls, singleDay, r.from, r.to, r.key])

  const dynOption = useMemo(
    () => (c: { series: string[] }) => ({
      grid: { left: 4, right: 12, top: 36, bottom: 4, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        data: [t('Muvaffaqiyatli'), t('Qisqa suhbat'), t('Javob bermadi'), t("O'tkazib yuborilgan")],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (
          ps: {
            axisValueLabel: string
            color: string
            seriesName: string
            value: number
          }[],
        ) =>
          tooltipHtml(
            ps[0]?.axisValueLabel ?? '',
            ps.map((p) => ({
              color: p.color,
              label: p.seriesName,
              value: n0(p.value),
            })),
          ),
      },
      xAxis: { type: 'category', data: dyn.labels },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: t('Muvaffaqiyatli'),
          type: 'bar',
          stack: 'x',
          barMaxWidth: 28,
          color: c.series[1],
          data: dyn.b.map((x) => x.ok),
        },
        {
          name: t('Qisqa suhbat'),
          type: 'bar',
          stack: 'x',
          barMaxWidth: 28,
          color: c.series[6],
          data: dyn.b.map((x) => x.short),
        },
        {
          name: t('Javob bermadi'),
          type: 'bar',
          stack: 'x',
          barMaxWidth: 28,
          color: c.series[7],
          data: dyn.b.map((x) => x.no),
        },
        {
          name: t("O'tkazib yuborilgan"),
          type: 'bar',
          stack: 'x',
          barMaxWidth: 28,
          color: c.series[4],
          itemStyle: { borderRadius: [5, 5, 0, 0] },
          data: dyn.b.map((x) => x.miss),
        },
      ],
    }),
    [dyn, t, lang],
  )

  // ---- when calls come: weekday × hour ----
  const WEEK = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
  const hours = useMemo(() => {
    let lo = 23,
      hi = 0
    data.grid.total.forEach((row) => row.forEach((v, h) => v > 0 && ((lo = Math.min(lo, h)), (hi = Math.max(hi, h)))))
    return lo > hi ? [] : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  }, [data.grid])
  const heatOption = useMemo(
    () => (c: { series: string[] }) => {
      const cells: [number, number, number][] = []
      data.grid.total.forEach((row, d) => hours.forEach((h, i) => cells.push([i, d, row[h]!])))
      const max = Math.max(1, ...cells.map((x) => x[2]))
      return {
        grid: { left: 4, right: 8, top: 4, bottom: 4, containLabel: true },
        tooltip: {
          formatter: (p: { value: [number, number, number] }) => {
            const [i, d, v] = p.value
            const miss = data.grid.missed[d]![hours[i]!]!
            return tooltipHtml(`${t(WEEK[d]!)} · ${String(hours[i]).padStart(2, '0')}:00`, [
              {
                color: c.series[1]!,
                label: t("Qo'ng'iroqlar"),
                value: n0(v),
              },
              {
                color: c.series[4]!,
                label: t("O'tkazib yuborilgan"),
                value: n0(miss),
              },
            ])
          },
        },
        xAxis: {
          type: 'category',
          data: hours.map((h) => String(h).padStart(2, '0')),
          splitArea: { show: false },
        },
        yAxis: { type: 'category', data: WEEK.map((w) => t(w)), inverse: true },
        visualMap: {
          show: false,
          min: 0,
          max,
          inRange: { color: ['rgba(120,130,160,0.08)', c.series[1]!] },
        },
        series: [
          {
            type: 'heatmap',
            data: cells,
            itemStyle: {
              borderRadius: 4,
              borderColor: 'transparent',
              borderWidth: 2,
            },
            emphasis: { itemStyle: { shadowBlur: 6 } },
          },
        ],
      }
    },
    [data.grid, hours, t, lang],
  )

  // ---- operators ----
  const cell = (v: number, onClick: () => void, tone?: string) =>
    v > 0 ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={cx('num rounded-[6px] px-1 font-semibold text-ink underline-offset-2 hover:bg-primary-soft hover:text-primary-strong hover:underline', tone)}
      >
        {n0(v)}
      </button>
    ) : (
      <span className="num text-ink-3">0</span>
    )
  const opColumns: Column<OpRow>[] = [
    {
      key: 'name',
      label: 'Operator',
      value: (o) => o.name,
      render: (o) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="num text-[0.75rem] text-ink-3">{String(o.rank).padStart(2, '0')}</span>
          <span className="max-w-[150px] truncate font-semibold" title={o.name}>
            {o.name}
          </span>
          {openOp === o.id ? <ChevronUp size={14} className="text-primary-strong" /> : <ChevronDown size={14} className="text-ink-3" />}
        </span>
      ),
    },
    {
      key: 'cAll',
      label: 'Jami',
      align: 'end',
      value: (o) => o.cAll,
      total: sum((o) => o.cAll),
      format: n0,
      render: (o) => cell(o.cAll, () => open(`${o.name} — ${t("barcha qo'ng'iroqlar")}`, o.calls)),
    },
    {
      key: 'cIn',
      label: 'Kiruvchi',
      align: 'end',
      value: (o) => o.cIn,
      total: sum((o) => o.cIn),
      format: n0,
      render: (o) => cell(o.cIn, () => open(`${o.name} — ${t('Kiruvchi')}`, o.calls.filter(isIn))),
    },
    {
      key: 'cOut',
      label: 'Chiquvchi',
      align: 'end',
      value: (o) => o.cOut,
      total: sum((o) => o.cOut),
      format: n0,
      render: (o) => cell(o.cOut, () => open(`${o.name} — ${t('Chiquvchi')}`, o.calls.filter(isOut))),
    },
    {
      key: 'rate',
      label: 'Muvaffaqiyatli',
      value: (o) => o.rate,
      render: (o) => (
        <span className="inline-flex min-w-[128px] items-center gap-2">
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="absolute inset-y-0 start-0 rounded-full bg-[var(--chart-2)]" style={{ width: `${Math.round(o.rate * 100)}%` }} />
          </span>
          <button
            type="button"
            onClick={(e) => (e.stopPropagation(), open(`${o.name} — ${t('Muvaffaqiyatli')}`, o.calls.filter(answered)))}
            className="num w-[78px] text-end text-[0.8125rem] font-semibold text-ink hover:text-primary-strong"
          >
            {n0(o.success)} · {fmtPct(o.rate, 0, lang)}
          </button>
        </span>
      ),
    },
    {
      key: 'talk',
      label: 'Suhbat',
      align: 'end',
      value: (o) => o.talk,
      format: fmtHms,
      total: sum((o) => o.talk),
    },
    {
      // the whole length of the calls, ringing included (owner, 2026-11-09: "add Davomiylik")
      key: 'duration',
      label: 'Davomiylik',
      align: 'end',
      value: (o) => o.duration,
      format: fmtHms,
      total: sum((o) => o.duration),
    },
    {
      key: 'avgTalk',
      label: "O'rtacha",
      align: 'end',
      value: (o) => o.avgTalk,
      format: fmtHms,
    },
    {
      key: 'missed',
      label: "O'tkazilgan",
      align: 'end',
      value: (o) => o.missed,
      total: sum((o) => o.missed),
      format: n0,
      render: (o) => cell(o.missed, () => open(`${o.name} — ${t("O'tkazib yuborilgan")}`, o.calls.filter(isMissed)), 'text-warm'),
    },
    {
      key: 'unrecalled',
      label: 'Qaytarilmagan',
      align: 'end',
      value: (o) => o.unrecalled,
      total: sum((o) => o.unrecalled),
      format: n0,
      render: (o) => cell(o.unrecalled, () => open(`${o.name} — ${t("Qayta qo'ng'iroq qilinmagan")}`, o.calls.filter(isUnrecalled)), 'text-danger'),
    },
    {
      key: 'reaksiya',
      label: 'Tezlik',
      align: 'end',
      value: (o) => o.reaksiya,
      format: (v) => (v == null ? '—' : fmtHms(v as number)),
    },
  ]
  const openRow = data.ops.find((o) => o.id === openOp) ?? null
  // an operator opens right under their row (OperatorPanel, which brings itself into sight)
  const toggleOp = (o: OpRow) => setOpenOp((cur) => (cur === o.id ? null : o.id))

  // ---- what happened: one bar per direction ----
  const flows = [
    {
      label: 'Kiruvchi',
      icon: PhoneMissed,
      total: cards.inbound,
      parts: [
        {
          label: 'Muvaffaqiyatli',
          value: cards.inbound - cards.missed - cards.shortIn,
          color: 'var(--chart-2)',
          pick: (c: Call) => isIn(c) && answered(c),
        },
        {
          label: 'Qisqa suhbat',
          value: cards.shortIn,
          color: 'var(--chart-7)',
          pick: (c: Call) => isIn(c) && isShort(c),
        },
        {
          label: "Qaytib qo'ng'iroq qilingan",
          value: cards.recalled,
          color: 'var(--chart-6)',
          pick: isRecalled,
        },
        {
          label: "Qayta qo'ng'iroq qilinmagan",
          value: cards.unrecalled,
          color: 'var(--chart-5)',
          pick: isUnrecalled,
        },
      ],
    },
    {
      label: 'Chiquvchi',
      icon: PhoneForwarded,
      total: cards.outbound,
      parts: [
        {
          label: 'Muvaffaqiyatli',
          value: cards.outbound - cards.noanswer - (cards.short - cards.shortIn),
          color: 'var(--chart-2)',
          pick: (c: Call) => isOut(c) && answered(c),
        },
        {
          label: 'Qisqa suhbat',
          value: cards.short - cards.shortIn,
          color: 'var(--chart-7)',
          pick: (c: Call) => isOut(c) && isShort(c),
        },
        {
          label: 'Javob bermadi',
          value: cards.noanswer,
          color: 'var(--chart-8)',
          pick: isNoAnswer,
        },
      ],
    },
  ]
  const reasonTotal = data.reasons.reduce((s, x) => s + x.calls.length, 0)
  // a phone system that gives no reason (OnlinePBX, the demo) has nothing to show there: the call-back list takes the row
  const hasReasons = data.reasons.some((x) => x.reason !== 'unknown')
  const waitShown = data.waiting.slice(0, 8)
  const ago = (ts: number) => {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000))
    return m < 60 ? t('{n} daqiqa', { n: m }) : m < 1440 ? t('{n} soat', { n: Math.round(m / 60) }) : t('{n} kun', { n: Math.round(m / 1440) })
  }

  return (
    <div className="page-in">
      <FilterBar
        preset={f.preset}
        onPreset={(p) => {
          f.setPreset(p)
          setOpenOp(null)
        }}
        active={f.active}
        onClear={() => {
          f.clear()
          setOpenOp(null)
        }}
      >
        <MultiSelect label="Mas'ul xodim" options={operators} value={f.multi.operator} onChange={(m) => f.set('operator', m)} />
        <MultiSelect label="Qo'ng'iroq turi" options={[...DIRS]} value={f.multi.direction} onChange={(m) => f.set('direction', m)} />
        <MultiSelect label="Natija" options={[...RESULTS]} value={f.multi.result} onChange={(m) => f.set('result', m)} />
      </FilterBar>
      <CoverageNote what="Qo'ng'iroqlar" rows={db.calls} ts={rowTs} range={r} />

      {/* eight plain numbers — 2 / 4 columns */}
      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {CARDS.map((d) => {
          const cur = cards[d.key] as number | null
          const p = prev[d.key] as number | null
          const hasDelta = cur != null && p != null && p !== 0
          const diff = hasDelta ? cur! - p! : 0
          const shownZero =
            d.unit === 'min'
              ? Math.round(Math.abs(diff) / 6) === 0
              : d.unit === 'time'
                ? Math.round(Math.abs(diff)) === 0
                : hasDelta && Math.round((Math.abs(diff) / Math.abs(p!)) * 1000) === 0
          const spark = data.daily.map((x) => (x[d.key] as number | null) ?? 0)
          // the same base as the "Qo'ng'iroqlar natijasi" card: a missed call of the incoming ones, a no-answer of ours
          const base = d.key === 'missed' ? cards.inbound : d.key === 'noanswer' ? cards.outbound : cards.total
          const share = d.share && base ? Math.round(((cur ?? 0) / base) * 100) : null
          const sub: ReactNode = (
            <>
              {d.key === 'total' ? (
                <span className="text-[0.75rem] text-ink-2">
                  {t('Kiruvchi')} <b className="num text-ink">{n0(cards.inbound)}</b> · {t('Chiquvchi')} <b className="num text-ink">{n0(cards.outbound)}</b>
                </span>
              ) : (
                share != null && <Badge tone={d.share}>{share}%</Badge>
              )}
              {hasDelta ? (
                <span className="inline-flex flex-wrap items-center gap-1">
                  <Delta value={shownZero ? 0 : diff} good={d.goodUp ? 'up' : 'down'} format={() => deltaText(d.unit, cur!, p!)} />
                  <span className="text-[0.75rem] text-ink-3">{t("o'tgan davrga")}</span>
                </span>
              ) : null}
            </>
          )
          return (
            <div
              key={d.key}
              className="card-hover relative min-w-0 cursor-pointer rounded-[26px] has-[>button:focus-visible]:outline-2 has-[>button:focus-visible]:outline-[var(--primary)]"
            >
              <button
                type="button"
                aria-label={t(d.label)}
                onClick={() => (d.key === 'reaksiya' ? setReaction(true) : open(d.label, calls.filter(d.pick)))}
                className="absolute inset-0 rounded-[26px] focus:outline-none"
              />
              <StatCard
                className="pointer-events-none h-full [&_button]:pointer-events-auto"
                label={t(d.label)} uz={d.label}
                value={cur ?? 0}
                format={(v) => fmtVal(d.unit, cur == null ? null : v)}
                icon={d.icon}
                tile={d.tile}
                sub={sub}
                spark={spark.length > 1 ? spark : undefined}
                info={t(d.info)}
              />
            </div>
          )
        })}
      </div>

      {/* what happened + the days */}
      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-3">
        <Card title={t("Qo'ng'iroqlar natijasi")} uz={"Qo'ng'iroqlar natijasi"} icon={PieChart} tile="green">
          <div className="flex flex-col gap-5">
            {flows.map((fl) => (
              <div key={fl.label} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <fl.icon aria-hidden size={15} className="self-center text-ink-3" />
                  <span className="font-semibold text-ink">{t(fl.label)}</span>
                  <span className="num ms-auto text-[1.125rem] font-bold text-ink">{n0(fl.total)}</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
                  {fl.parts.map((x) =>
                    x.value > 0 ? (
                      <button
                        key={x.label}
                        type="button"
                        title={`${t(x.label)}: ${n0(x.value)}`}
                        onClick={() => open(`${t(fl.label)} — ${t(x.label)}`, calls.filter(x.pick))}
                        className="h-full transition-[filter] hover:brightness-110"
                        style={{
                          width: `${(x.value / Math.max(1, fl.total)) * 100}%`,
                          background: x.color,
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <ul className="flex flex-col">
                  {fl.parts.map((x) => (
                    <li key={x.label}>
                      <button
                        type="button"
                        onClick={() => open(`${t(fl.label)} — ${t(x.label)}`, calls.filter(x.pick))}
                        className="pressable flex w-full items-center gap-2 rounded-[10px] px-1.5 py-1 text-start hover:bg-surface-2"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.color }} />
                        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-2">{t(x.label)}</span>
                        <span className="num text-[0.875rem] font-semibold text-ink">{n0(x.value)}</span>
                        <span className="num w-10 text-end text-[0.75rem] text-ink-3">{fl.total ? `${Math.round((x.value / fl.total) * 100)}%` : '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <Card title={singleDay ? t("Soatlar bo'yicha") : t("Kunlar bo'yicha")} uz={singleDay ? "Soatlar bo'yicha" : "Kunlar bo'yicha"} icon={BarChart3} tile="blue" className="lg:col-span-2">
          <EChart
            height={300}
            option={dynOption}
            onClick={(p) =>
              open(
                dyn.labels[p.dataIndex] ?? '',
                // a bar is the calls of its snapshot days (c.day, Tashkent), as the bars were counted
                singleDay ? calls.filter((c) => `${String(c.hour).padStart(2, '0')}:00` === dyn.labels[p.dataIndex]) : (dyn.groups[p.dataIndex] ?? []),
              )
            }
          />
        </Card>
      </div>

      {/* who to call back + why calls failed */}
      <div className={cx('mt-4 grid gap-3 sm:gap-4', hasReasons && 'lg:grid-cols-2')}>
        <Card
          title={t("Qayta qo'ng'iroq kutayotganlar")} uz={"Qayta qo'ng'iroq kutayotganlar"}
          subtitle={t('{n} ta mijoz', { n: n0(data.waiting.length) })}
          icon={AlarmClock}
          tile="pink"
          flush
          actions={
            data.waiting.length > waitShown.length ? (
              <Button size="xs" variant="soft" onClick={() => open("Qayta qo'ng'iroq kutayotganlar", data.waiting)}>
                {t('Hammasi')}
              </Button>
            ) : undefined
          }
        >
          {waitShown.length === 0 ? (
            <p className="px-5 py-8 text-center text-[0.875rem] text-good">{t("Hamma mijozga qaytib qo'ng'iroq qilingan")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {waitShown.map((c) => {
                const lead = (c.lead_id ? leads.get(c.lead_id) : undefined) ?? leadByPhone.get(phoneKey(c.phone) ?? '')
                // nobody answered: who should call back is the client's lead owner (owner, 2026-11-09: "why we have not assigned")
                const reachedNobody = c.operator_id === '0'
                const who = !reachedNobody ? c.operator : lead?.manager ? t("Mas'ul: {name}", { name: lead.manager }) : t('Hech kimga ulanmagan')
                return (
                  <li key={String(c.id)}>
                    <button
                      type="button"
                      onClick={() =>
                        open(
                          c.phone,
                          calls.filter((x) => phoneKey(x.phone) === phoneKey(c.phone)),
                        )
                      }
                      className="pressable flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-surface-2 sm:px-5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(var(--danger-rgb,220_60_60)/0.12)] text-danger">
                        <PhoneMissed aria-hidden size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="num block truncate font-semibold text-ink">{c.phone}</span>
                        <span className="block truncate text-[0.75rem] text-ink-3">
                          {fmtDT(c.ts)} · {who}
                          {lead ? ` · #${lead.id}` : ''}
                        </span>
                      </span>
                      <span className="num shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[0.75rem] font-semibold text-ink-2">{ago(c.ts)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        {hasReasons && (
          <Card title={t('Javobsizlik sabablari')} uz={'Javobsizlik sabablari'} subtitle={t('{n} ta javobsiz', { n: n0(reasonTotal) })} icon={PhoneOff} tile="gray">
            {data.reasons.length === 0 ? (
              <p className="py-8 text-center text-[0.875rem] text-ink-3">{t("Javobsiz qo'ng'iroq yo'q")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.reasons.map((x) => (
                  <li key={x.reason}>
                    <button
                      type="button"
                      onClick={() => open(REASON_LABEL[x.reason], x.calls)}
                      className="pressable flex w-full flex-col gap-1 rounded-[12px] px-2 py-1.5 text-start hover:bg-surface-2"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">{t(REASON_LABEL[x.reason])}</span>
                        <span className="num text-[0.875rem] font-semibold text-ink">{n0(x.calls.length)}</span>
                        <span className="num w-10 text-end text-[0.75rem] text-ink-3">{Math.round((x.calls.length / Math.max(1, reasonTotal)) * 100)}%</span>
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-[var(--chart-8)]"
                          style={{
                            width: `${(x.calls.length / Math.max(1, data.reasons[0]!.calls.length)) * 100}%`,
                          }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* when calls come */}
      {hours.length > 0 && (
        <Card className="mt-4" title={t("Qo'ng'iroqlar qaysi kun va soatda")} uz={"Qo'ng'iroqlar qaysi kun va soatda"} icon={Grid3x3} tile="indigo">
          <EChart height={250} option={heatOption} />
        </Card>
      )}

      {/* operators, each with their own call list */}
      <Card className="mt-4" title={t("Operatorlar bo'yicha")} uz={"Operatorlar bo'yicha"} subtitle={t('{n} operator', { n: data.ops.length })} icon={Users} tile="teal" flush dense>
        {/* compact cells so every column fits at desktop width (phones scroll inside the card) */}
        <div className="[&_.data-table_td]:!px-2 [&_.data-table_td]:text-[0.8125rem] [&_.data-table_th]:!px-2 [&_.data-table_th]:whitespace-normal">
          <DataTable
            columns={opColumns}
            rows={data.ops}
            rowKey={(o) => o.id}
            onRow={toggleOp}
            empty="Ma'lumot yo'q"
            expanded={(o) => (o.id === openRow?.id ? <OperatorPanel key={`${o.id}:${r.from}`} op={o} singleDay={singleDay} leads={leads} onClose={() => setOpenOp(null)} /> : null)}
          />
        </div>
      </Card>

      <ReactionSheet
        open={reaction}
        onClose={() => setReaction(false)}
        pickup={data.pickup}
        callback={data.callback}
        lead={data.lead}
        onCalls={(title, rows) => open(title, rows)}
        onUncalled={(rows) =>
          setUncalled({
            title: t("Qo'ng'iroq qilinmagan lidlar"),
            rows,
            columns: uncalledColumns(t),
            rowKey: (r) => String(r.lead.id),
            // a row opens the lead in the portal: the stage and the history there are the proof
            crm: { kind: 'lead', id: (r) => r.lead.id },
          })
        }
      />
      <DrillSheet drill={drill} onClose={() => setDrill(null)} />
      <DrillSheet drill={uncalled} onClose={() => setUncalled(null)} />
    </div>
  )
}
