import { useMemo, type ReactNode } from 'react'
import { BarChart3, CalendarX, Clock, PieChart, TrendingUp } from 'lucide-react'
import { useT } from '@/i18n'
import { fmtNum } from '@/lib/format'
import { useDb } from '@/data/db'
import { RESPONSE_EMPTY } from '@/data/datasets'
import { useMeta } from '@/data/source'
import { DAY, bucketLabel, bucketRows, dayKey, startOfDay, type DateRange } from '@/data/range'
import type { Lead } from '@/data/types'
import { EChart, tooltipHtml } from '@/charts/EChart'
import { Card } from '@/ui/controls'
import { InfoTip } from '@/ui/glass'
import type { Drill } from '@/kit/blocks'
import { leadDrill } from './shared'
import { FULL_DAYS, WEEK_ORDER, fmtSec, median, type Tq } from './store'

export function StatistikaTab({ tq, range, now, onDrill }: { tq: Tq; range: DateRange; now: number; onDrill: (d: Drill<Lead>) => void }) {
  const { t, lang } = useT()
  const db = useDb()
  const { leadStageLabels } = useMeta()
  const hourly = range.key === 'today'

  const data = useMemo(() => {
    const leads = db.leads.filter((l) => l.ts >= range.from && l.ts < range.to)
    const by = new Map<string, Lead[]>()
    for (const l of leads) {
      const a = by.get(l.manager_id)
      if (a) a.push(l)
      else by.set(l.manager_id, [l])
    }
    const load = tq.ops.map((op, i) => ({ op, i, leads: by.get(op.id) ?? [] }))
    const opTotal = load.reduce((s, x) => s + x.leads.length, 0)
    // trend
    // a point per hour of one day, else per day, week or month by the period's length (data/range bucketRows)
    let trend: Lead[][]
    let labels: string[]
    if (hourly) {
      labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
      trend = labels.map(() => [] as Lead[])
      for (const l of leads) trend[new Date(l.ts).getHours()]?.push(l)
    } else {
      const b = bucketRows(leads, range, (l) => l.day)
      trend = b.groups
      labels = b.buckets.map((x) => bucketLabel(x, b.grain))
    }
    // response time (only leads already answered)
    const resp = tq.ops.map((op) => {
      const answered = (by.get(op.id) ?? []).filter((l) => l.ts + l.first_response_sec * 1000 <= now)
      return { op, answered, med: median(answered.map((l) => l.first_response_sec)) }
    })
    return { leads, load, opTotal, trend, labels, resp }
  }, [db, tq.ops, range, hourly, now])

  const sorted = useMemo(() => [...data.load].sort((a, b) => a.leads.length - b.leads.length), [data.load])

  const loadOption = useMemo(
    () => (c: { series: string[]; ink3: string }) => ({
      grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: { dataIndex: number }[]) => {
          const x = sorted[p[0]!.dataIndex]!
          return tooltipHtml(x.op.name, [{ color: c.series[0], label: t('Lidlar'), value: fmtNum(x.leads.length, 0, lang) }])
        },
      },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: sorted.map((x) => x.op.name), axisLabel: { width: 120, overflow: 'truncate' } },
      series: [{ type: 'bar', name: t('Lidlar'), data: sorted.map((x) => x.leads.length), color: c.series[0], barMaxWidth: 18, label: { show: true, position: 'right', color: c.ink3, fontSize: 11 } }],
    }),
    [sorted, t, lang],
  )

  const pieOption = useMemo(
    () => (c: { series: string[]; ink2: string; surface: string }) => ({
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number; color: string }) => tooltipHtml(p.name, [{ color: p.color, label: t('Lidlar'), value: `${fmtNum(p.value, 0, lang)} · ${fmtNum(p.percent, 1, lang)}%` }]),
      },
      series: [
        {
          type: 'pie',
          radius: ['34%', '58%'],
          padAngle: 2,
          itemStyle: { borderRadius: 4, borderColor: c.surface, borderWidth: 2 },
          // "{name} — {pct}%" (Hilol); on phones the percentage goes to its own line so it never breaks mid-number
          label: { formatter: (p: { name: string; percent: number }) => `${p.name}${window.innerWidth < 640 ? '\n' : ' — '}${fmtNum(p.percent, 1, lang)}%`, color: c.ink2, fontSize: 11, lineHeight: 14, alignTo: 'edge', edgeDistance: 6, overflow: 'break' },
          labelLayout: { hideOverlap: false },
          labelLine: { length: 8, length2: 6 },
          data: data.load.filter((x) => x.leads.length).map((x) => ({ name: x.op.name, value: x.leads.length, itemStyle: { color: c.series[x.i % 8] } })),
        },
      ],
    }),
    [data.load, t, lang],
  )

  const trendOption = useMemo(
    () => (c: { series: string[] }) => ({
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p: { dataIndex: number; axisValue: string }[]) => tooltipHtml(p[0]!.axisValue, [{ color: c.series[0], label: t('Lidlar'), value: fmtNum(data.trend[p[0]!.dataIndex]!.length, 0, lang) }]),
      },
      xAxis: { type: 'category', data: data.labels, boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'line',
          name: t('Lidlar'),
          smooth: 0.3,
          smoothMonotone: 'x',
          showSymbol: hourly,
          symbolSize: 8,
          data: data.trend.map((x) => x.length),
          color: c.series[0],
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.1 },
        },
      ],
    }),
    [data, hourly, t, lang],
  )

  const respOption = useMemo(
    () => (c: { series: string[] }) => ({
      grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: { dataIndex: number }[]) => {
          const x = data.resp[p[0]!.dataIndex]!
          return tooltipHtml(x.op.name, [{ color: c.series[0], label: t("O'rtacha"), value: fmtSec(x.med, lang) }], t('{n} ta lid', { n: x.answered.length }))
        },
      },
      xAxis: { type: 'category', data: data.resp.map((x) => x.op.name.split(' ')[0]), axisLabel: { interval: 0, fontSize: 10, hideOverlap: false } },
      yAxis: { type: 'value', interval: niceStep(Math.max(...data.resp.map((x) => x.med))), max: (v: { max: number }) => Math.ceil(v.max / niceStep(v.max)) * niceStep(v.max), axisLabel: { formatter: (v: number) => fmtSec(v, lang) } },
      series: [{ type: 'bar', name: t("O'rtacha"), data: data.resp.map((x) => Math.round(x.med)), color: c.series[0], barMaxWidth: 28 }],
    }),
    [data.resp, t, lang],
  )

  const opDrill = (i: number, list: { op: { name: string }; leads?: Lead[]; answered?: Lead[] }[], title: string) => {
    const x = list[i]
    if (!x) return
    onDrill(leadDrill(title, x.op.name, x.leads ?? x.answered ?? [], t, lang, now, leadStageLabels))
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={t('Operator yuklamasi')} uz={'Operator yuklamasi'}
          subtitle={<Sub>{t("Har bir operatorga to'g'ri kelgan lidlar soni")}</Sub>}
          icon={BarChart3}
          tile="blue"
          actions={<InfoTip label={t('Operator yuklamasi')} text={t("Lidlar — tanlangan davrda Bitrixda shu operatorga biriktirilgan (mas'ul shaxs) lidlar soni.")} />}
        >
          <MobileSub>{t("Har bir operatorga to'g'ri kelgan lidlar soni")}</MobileSub>
          {data.opTotal ? (
            <EChart height={Math.max(260, sorted.length * 40)} option={loadOption} onClick={(p) => opDrill(p.dataIndex, sorted, 'Operator yuklamasi')} />
          ) : (
            <Empty />
          )}
        </Card>
        <Card
          title={t('Taqsimot balansi')} uz={'Taqsimot balansi'}
          subtitle={t("Operatorlar o'rtasida lidlar ulushi")}
          icon={PieChart}
          tile="purple"
          actions={<InfoTip label={t('Taqsimot balansi')} text={t("Ulush = operator lidlari ÷ jami lidlar × 100%. Manba: Bitrix lidlari, tanlangan davr bo'yicha, mas'ul shaxsga qarab guruhlangan.")} />}
        >
          {data.opTotal ? (
            <EChart
              height={Math.max(260, sorted.length * 40)}
              option={pieOption}
              onClick={(p) => {
                const i = data.load.findIndex((x) => x.op.name === p.name)
                opDrill(i, data.load, 'Taqsimot balansi')
              }}
            />
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <Card
        title={hourly ? t('Soatlik trend') : t('Kunlik trend')} uz={hourly ? 'Soatlik trend' : 'Kunlik trend'}
        subtitle={hourly ? t("Lidlar soni soatlar bo'yicha") : t("Lidlar soni kunlar bo'yicha")}
        icon={TrendingUp}
        tile="teal"
        actions={<InfoTip label={t('Trend')} text={t("Barcha lidlar (har qanday mas'ul) yaratilgan kun yoki soat bo'yicha.")} />}
      >
        {data.leads.length ? (
          <div className="scroll-thin overflow-x-auto">
            <div style={{ minWidth: Math.max(560, data.labels.length * 38) }}>
              <EChart
                height={280}
                option={trendOption}
                onClick={(p) => {
                  const rows = data.trend[p.dataIndex]
                  if (rows?.length) onDrill(leadDrill(hourly ? 'Soatlik trend' : 'Kunlik trend', data.labels[p.dataIndex], rows, t, lang, now, leadStageLabels))
                }}
              />
            </div>
          </div>
        ) : (
          <Empty />
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={t('Javob vaqti')} uz={'Javob vaqti'}
          subtitle={t("Operatorlarning o'rtacha javob vaqti")}
          icon={Clock}
          tile="orange"
          bodyClassName="flex flex-col"
          actions={<InfoTip label={t('Javob vaqti')} text={t("Lid yaratilganidan operatorning birinchi harakatigacha bo'lgan vaqt. O'rtacha — bu yerda median qiymat.")} />}
        >
          {data.resp.some((x) => x.answered.length) ? (
            <div className="relative min-h-[320px] flex-1">
              <div className="absolute inset-0">
                <EChart height="100%" option={respOption} onClick={(p) => opDrill(p.dataIndex, data.resp, 'Javob vaqti')} />
              </div>
            </div>
          ) : (
            // operators have leads, none answered yet: say why instead of "no data"
            <Empty text={data.opTotal ? t(RESPONSE_EMPTY) : undefined} />
          )}
        </Card>
        <IstisnoStats tq={tq} now={now} />
      </div>
    </div>
  )
}

/** Card subtitle on sm+ only; on phones the same sentence wraps inside the body (MobileSub) instead of being truncated. */
function Sub({ children }: { children: ReactNode }) {
  return <span className="hidden sm:inline">{children}</span>
}
function MobileSub({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[0.8125rem] text-ink-2 sm:hidden">{children}</p>
}

function Empty({ text }: { text?: string }) {
  const { t } = useT()
  return <p className="grid h-[220px] place-items-center px-4 text-center text-[0.875rem] text-ink-3">{text ?? t('Ma\'lumot topilmadi')}</p>
}

/** Istisno statistikasi — always the last 30 days (not period-filtered), like Hilol. */
function IstisnoStats({ tq, now }: { tq: Tq; now: number }) {
  const { t } = useT()
  const rows = useMemo(() => {
    const today = startOfDay(now)
    const days = Array.from({ length: 30 }, (_, i) => dayKey(today - (29 - i) * DAY))
    const todayKey = dayKey(today)
    return tq.ops.map((op) => {
      const weekly = days.filter((d) => op.weekly.includes(new Date(`${d}T00:00:00`).getDay())).length
      const exc = days.filter((d) => tq.offEntry(op.id, d) !== null).length
      let ahead = 0
      for (const k of tq.offMap.keys()) if (k.startsWith(`${op.id}:`) && k.slice(op.id.length + 1) > todayKey) ahead++
      return { op, weekly, exc, ahead, total: weekly + exc }
    })
  }, [tq, now])
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <Card
      title={t('Istisno statistikasi')} uz={'Istisno statistikasi'}
      subtitle={<Sub>{t('Har bir operator oxirgi 30 kunda necha kun ishlamagan')}</Sub>}
      icon={CalendarX}
      tile="indigo"
      actions={
        <InfoTip
          label={t('Istisno statistikasi')}
          text={t("Haftalik — doimiy dam olish kunlari. Istisno — bir martalik istisno va otpuska kunlari. 30 kunda — ikkalasining yig'indisi. Rejada — bugundan keyingi belgilangan kunlar.")}
        />
      }
    >
      <MobileSub>{t('Har bir operator oxirgi 30 kunda necha kun ishlamagan')}</MobileSub>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[var(--chart-1)]" /> {t('Haftalik dam kunlari (doimiy)')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[var(--chart-5)]" /> {t('Istisno / otpuska (bir martalik)')}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <div key={r.op.id} className="flex items-start gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.875rem] font-medium text-ink">{r.op.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.op.weekly.length ? (
                  WEEK_ORDER.filter((d) => r.op.weekly.includes(d)).map((d) => (
                    <span key={d} className="rounded-full bg-surface-2 px-2 py-px text-[0.6875rem] text-ink-2">
                      {t(FULL_DAYS[d]!)}
                    </span>
                  ))
                ) : (
                  <span className="text-[0.6875rem] text-ink-3">{t('Har kuni ishlaydi')}</span>
                )}
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-surface-2">
                <span className="h-full bg-[var(--chart-1)]" style={{ width: `${(r.weekly / max) * 100}%` }} />
                {r.exc > 0 && <span className="h-full border-s-2 border-[var(--surface-solid)] bg-[var(--chart-5)]" style={{ width: `${(r.exc / max) * 100}%` }} />}
              </div>
            </div>
            <div className="shrink-0 text-end">
              <p className="num text-[0.9375rem] font-bold text-ink">{t('{n} kun', { n: r.total })}</p>
              <p className="num text-[0.6875rem] text-ink-3">{t('{w} haftalik + {e} istisno', { w: r.weekly, e: r.exc })}</p>
              {r.ahead > 0 && <p className="num text-[0.6875rem] font-semibold text-warm">{t('+{n} rejada', { n: r.ahead })}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Readable time ticks: 30s, 1m, 2m, 5m, 10m, 30m, 1h… */
function niceStep(max: number): number {
  for (const s of [15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]) if (max / s <= 6) return s
  return 14400
}
