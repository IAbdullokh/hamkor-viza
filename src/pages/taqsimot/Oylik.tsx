import { useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { dayKey } from '@/data/range'
import { Card } from '@/ui/controls'
import { StatCard } from '@/ui/glass'
import { HATCH, OpCell, Swatch, dayMonth } from './shared'
import { MONTHS, SHORT_DAYS, dateOf, daysFromTo, monthPlan, type DayState, type Tq } from './store'

/** solid, not the Kunlik tab's pale pills: a month is read at a glance, and "not working" has to stand out of the row */
const BAR: Record<DayState, string> = {
  work: 'border-transparent bg-[color-mix(in_srgb,var(--good)_72%,transparent)]',
  weekly: 'border-line bg-surface-2',
  otpuska: 'border-transparent bg-[var(--chart-3)]',
  istisno: 'border-transparent bg-[color-mix(in_srgb,var(--warm)_88%,transparent)]',
}
const COLUMN = 'bg-[rgb(var(--accent-rgb)/0.07)]'

/**
 * The month as a chart (owner, 2026-11-06: "easy to analyze who doesn't work, who works at what time during one month"):
 * one row per person, one mark per day, and on top how many people work that day. Pressing a day names them.
 * The same plan the distribution goes by: Kunlik's day-offs, Haftalik's weekly days off and the leave plan.
 */
export function OylikTab({ tq, now }: { tq: Tq; now: number }) {
  const { t, lang } = useT()
  const [offset, setOffset] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const today = dayKey(now)
  const base = new Date(now)
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const y = first.getFullYear()
  const m = first.getMonth()
  const days = useMemo(() => daysFromTo(dayKey(new Date(y, m, 1).getTime()), dayKey(new Date(y, m + 1, 0).getTime())), [y, m])
  const plan = useMemo(() => monthPlan(tq.ops, days, tq.offEntry, tq.isWeeklyOff), [tq.ops, days, tq.offEntry, tq.isWeeklyOff])
  const open = picked && days.includes(picked) ? picked : days.includes(today) ? today : null

  const total = tq.ops.length
  // a day nobody works is a closed day, not a thin one: it shows as an empty column
  const fewest = Math.min(...(plan.working.some((n) => n > 0) ? plan.working.filter((n) => n > 0) : plan.working))
  const most = Math.max(...plan.working)
  const lows = days.filter((_, i) => plan.working[i] === fewest)
  const least = plan.rows[0]
  const top = plan.rows[plan.rows.length - 1]

  const words: Record<DayState, string> = { work: t('Ishlaydi'), weekly: t('Dam olish (haftalik)'), otpuska: t('Otpuskada'), istisno: t('Istisno') }
  const whyOff = (id: string, day: string, state: DayState) => {
    const note = tq.offEntry(id, day)?.note.trim()
    return note ? `${words[state]} · ${note}` : words[state]
  }
  const openIndex = open ? days.indexOf(open) : -1
  const working = openIndex < 0 ? [] : plan.rows.filter((r) => r.states[openIndex] === 'work')
  const away = openIndex < 0 ? [] : plan.rows.filter((r) => r.states[openIndex] !== 'work')

  return (
    <>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label={t('Eng kam odam')} uz={'Eng kam odam'}
          value={fewest}
          icon={Users}
          tile="orange"
          sub={`${dayMonth(lows[0]!, lang, t)}${lows.length > 1 ? ` +${lows.length - 1}` : ''}`}
        />
        <StatCard label={t('Eng kam ishlaydi')} uz={'Eng kam ishlaydi'} value={least?.work ?? 0} icon={TrendingDown} tile="purple" sub={least?.op.name} />
        <StatCard className="col-span-2 sm:col-span-1" label={t("Eng ko'p ishlaydi")} uz={"Eng ko'p ishlaydi"} value={top?.work ?? 0} icon={TrendingUp} tile="green" sub={top?.op.name} />
      </div>

      <Card className="mt-4" dense flush title={t('Oylik jadval')} uz={'Oylik jadval'} icon={CalendarRange} tile="indigo">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 pb-3 sm:px-5">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-ink-2">
            <Swatch cls={BAR.work} label={t('Ishlaydi')} />
            <Swatch cls={BAR.weekly} hatch label={t('Dam olish (haftalik)')} />
            <Swatch cls={BAR.otpuska} label={t('Otpuskada')} />
            <Swatch cls={BAR.istisno} label={t('Istisno')} />
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={t('Oldingi oy')} onClick={() => setOffset((o) => o - 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => setOffset(0)} className={cx('pressable rounded-full px-3 py-1 text-[0.8125rem] font-medium', offset === 0 ? 'bg-primary-soft text-primary-strong' : 'text-ink-2 hover:bg-surface-2')}>
              {t(MONTHS[m]!)} {y}
            </button>
            <button type="button" aria-label={t('Keyingi oy')} onClick={() => setOffset((o) => o + 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {total > 0 ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky start-0 z-[2] w-[130px] sm:w-[190px]">{t('Operator')}</th>
                  {days.map((day) => (
                    <th key={day} className={cx('!px-0 text-center', day === open && COLUMN)}>
                      <button type="button" aria-pressed={day === open} aria-label={dayMonth(day, lang, t)} onClick={() => setPicked(day)} className="flex w-full min-w-[24px] flex-col items-center gap-0.5 py-0.5">
                        <span className="text-[0.5625rem] font-normal normal-case">{t(SHORT_DAYS[dateOf(day).getDay()]!)}</span>
                        <span className={cx('num grid h-[22px] min-w-[22px] place-items-center rounded-full text-[0.75rem] font-semibold', day === today ? 'bg-primary-fill text-white' : 'text-ink-2')}>{dateOf(day).getDate()}</span>
                      </button>
                    </th>
                  ))}
                  <th className="whitespace-nowrap !ps-3 text-end">{t('Ish kunlari')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="[&>td]:!border-b-2 [&>td]:!border-b-[var(--ink-3)]">
                  <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)] text-[0.8125rem] font-semibold text-ink">{t('Jami ishlaydi')}</td>
                  {days.map((day, i) => {
                    const n = plan.working[i]!
                    const thin = n === fewest && fewest < most
                    return (
                      <td key={day} className={cx('!px-0 !py-1.5', day === open ? 'bg-[rgb(var(--accent-rgb)/0.14)]' : COLUMN)}>
                        <button type="button" title={`${dayMonth(day, lang, t)}: ${n} / ${total}`} onClick={() => setPicked(day)} className="flex h-[52px] w-full flex-col items-center justify-end gap-0.5">
                          <span className="num text-[0.6875rem] font-semibold text-ink">{n}</span>
                          <span className="flex h-8 w-full items-end justify-center">
                            <span className={cx('w-[calc(100%-6px)] min-w-[10px] rounded-t-[4px]', thin ? 'bg-[color-mix(in_srgb,var(--warm)_88%,transparent)]' : 'bg-primary-fill')} style={{ height: `${n ? Math.max((n / total) * 100, 6) : 0}%` }} />
                          </span>
                        </button>
                      </td>
                    )
                  })}
                  <td className={cx('num whitespace-nowrap !ps-3 text-end text-[0.875rem] font-semibold text-ink', COLUMN)}>
                    {plan.rows.reduce((n, r) => n + r.work, 0)}
                    <span className="font-normal text-ink-3"> / {days.length * total}</span>
                  </td>
                </tr>
                {plan.rows.map((row) => (
                  <tr key={row.op.id}>
                    <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                      <div className="max-w-[112px] sm:max-w-[170px]">
                        <OpCell op={row.op} sub={row.op.sub} />
                      </div>
                    </td>
                    {days.map((day, i) => {
                      const state = row.states[i]!
                      return (
                        <td key={day} className={cx('!px-0 !py-1.5', day === open && COLUMN)}>
                          <button
                            type="button"
                            title={`${row.op.name} · ${dayMonth(day, lang, t)}\n${whyOff(row.op.id, day, state)}`}
                            aria-label={`${row.op.name}, ${dayMonth(day, lang, t)}: ${whyOff(row.op.id, day, state)}`}
                            onClick={() => setPicked(day)}
                            style={state === 'weekly' ? HATCH : undefined}
                            className={cx('mx-auto block h-7 w-[calc(100%-4px)] min-w-[20px] rounded-[4px] border', BAR[state])}
                          />
                        </td>
                      )
                    })}
                    <td className="num whitespace-nowrap !ps-3 text-end text-[0.875rem] font-semibold text-ink">
                      {row.work}
                      <span className="font-normal text-ink-3"> / {days.length}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-[0.9375rem] text-ink-3">{t('0 ta operator')}</p>
        )}

        {open && total > 0 && (
          <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
            <div>
              <p className="mb-2 text-[0.8125rem] font-semibold text-ink">
                {dayMonth(open, lang, t)} · {t('Ishlaydi')}: <span className="num">{working.length}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {working.map((r) => (
                  <span key={r.op.id} className="chip">
                    {r.op.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[0.8125rem] font-semibold text-ink">
                {t('Ishlamaydi')}: <span className="num">{away.length}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {away.map((r) => (
                  <span key={r.op.id} className="chip">
                    {r.op.name} · {whyOff(r.op.id, open, r.states[openIndex]!)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
