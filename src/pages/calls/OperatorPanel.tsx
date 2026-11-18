import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtNum } from '@/lib/format'
import type { Call, Lead } from '@/data/types'
import { Avatar, Segmented } from '@/ui/glass'
import { answered, fmtDay, fmtHms, talkOf, type OpRow } from './calc'
import { CallList } from './OperatorDrill'

interface DayRow {
  day: string
  total: number
  answered: number
  duration: number
}

function byDay(calls: Call[]): DayRow[] {
  const by = new Map<string, DayRow>()
  for (const c of calls) {
    let r = by.get(c.day)
    if (!r) by.set(c.day, (r = { day: c.day, total: 0, answered: 0, duration: 0 }))
    r.total++
    if (answered(c)) r.answered++
    r.duration += talkOf(c)
  }
  return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
}

/**
 * An operator opened in "Operatorlar bo'yicha", right under the operator's row (owner, 2026-11-04: "this expansion looks
 * not good — illustrate it better"): who it is with a strip of four numbers, a thin bar per day (answered in green over
 * the rest), and two views — Kunlar (each day: answered / all as a split bar and the talk time; a day opens its calls) and
 * Qo'ng'iroqlar (every call: OperatorDrill's CallList, a picked day only when one is picked).
 */
export function OperatorPanel({ op, singleDay, leads, onClose }: { op: OpRow; singleDay: boolean; leads: Map<number, Lead>; onClose: () => void }) {
  const { t, lang } = useT()
  const days = useMemo(() => byDay(op.calls), [op.calls])
  const [tab, setTab] = useState<'days' | 'calls'>(singleDay ? 'calls' : 'days')
  const [day, setDay] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  // opened: in sight, the row above it too
  useEffect(() => {
    // braces: a newer browser's scrollIntoView answers with a promise, and an effect may only return its cleanup
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])
  const max = Math.max(1, ...days.map((d) => d.total))
  const pick = (d: string) => {
    setDay(d)
    setTab('calls')
  }
  const n = (v: number) => fmtNum(v, 0, lang)
  const facts: [string, string, string?][] = [
    [t('Jami'), n(op.cAll)],
    [t('Muvaffaqiyatli'), `${Math.round(op.rate * 100)}%`, 'text-good'],
    [t("O'rtacha suhbat"), fmtHms(op.avgTalk)],
    [t('Qaytarilmagan'), n(op.unrecalled), op.unrecalled ? 'text-danger' : undefined],
  ]

  return (
    <div ref={box} className="scroll-mt-24 border-y border-[rgb(var(--accent-rgb)/0.18)] bg-[rgb(var(--accent-rgb)/0.035)] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={op.name} size={36} />
          <p className="truncate text-[1rem] font-bold text-ink">{op.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {facts.map(([label, value, tone]) => (
            <span key={label} className="inline-flex items-baseline gap-1.5 rounded-full bg-surface px-3 py-1 text-[0.8125rem] shadow-[inset_0_0_0_1px_var(--border)]">
              <span className="text-ink-3">{label}</span>
              <span className={cx('num font-bold text-ink', tone)}>{value}</span>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label={t('Yopish')} className="pressable ms-auto grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X size={16} />
        </button>
      </div>

      {days.length > 1 && <DayStrip days={days} max={max} picked={day} onPick={pick} />}

      {!singleDay && (
        <Segmented<'days' | 'calls'>
          size="xs"
          className="mt-4"
          label={t("Ko'rinish")}
          value={tab}
          onChange={(v) => {
            setTab(v)
            if (v === 'days') setDay(null)
          }}
          options={[
            { value: 'days', label: t('Kunlar') },
            { value: 'calls', label: t("Qo'ng'iroqlar") },
          ]}
        />
      )}

      {tab === 'days' && !singleDay ? (
        // at most about ten days in sight; the rest scroll inside, so the operators below stay near
        <ul className="scroll-thin mt-3 flex max-h-[min(50vh,420px)] flex-col gap-1 overflow-y-auto">
          {[...days].reverse().map((d) => (
            <li key={d.day}>
              <button
                type="button"
                onClick={() => pick(d.day)}
                className="pressable grid w-full grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] items-center gap-4 rounded-[12px] px-3 py-2 text-start hover:bg-surface"
              >
                <span className="num text-[0.875rem] font-semibold text-ink">{fmtDay(d.day)}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="absolute inset-y-0 start-0 rounded-full bg-ink-3/25" style={{ width: `${(d.total / max) * 100}%` }} />
                    <span className="absolute inset-y-0 start-0 rounded-full bg-good" style={{ width: `${(d.answered / max) * 100}%` }} />
                  </span>
                  <span className="num w-16 shrink-0 text-end text-[0.8125rem] text-ink-2">
                    <b className="font-bold text-good">{n(d.answered)}</b> / {n(d.total)}
                  </span>
                </span>
                <span className="num text-end text-[0.8125rem] text-ink-2">{fmtHms(d.duration)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--border)]">
          {day && (
            <div className="flex items-center gap-2 border-b border-line px-4 py-2">
              <span className="num text-[0.875rem] font-semibold text-ink">{fmtDay(day)}</span>
              <button type="button" onClick={() => setDay(null)} aria-label={t('Barcha kunlar')} className="pressable grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
                <X size={13} />
              </button>
            </div>
          )}
          <CallList key={day ?? 'all'} calls={day ? op.calls.filter((c) => c.day === day) : op.calls} leads={leads} />
        </div>
      )}
    </div>
  )
}

/**
 * The days at a glance (owner, 2026-11-05: "which day it is is not understandable, and the bars are too big"): one narrow
 * bar per day with calls — answered (green) under the rest — its day of the month under it and the month's name where a
 * month begins; the day pointed at (or picked) is said in words beside the strip, not in a tooltip over the tabs. A bar
 * opens that day's calls. A long period scrolls sideways inside the panel.
 */
function DayStrip({ days, max, picked, onPick }: { days: DayRow[]; max: number; picked: string | null; onPick: (day: string) => void }) {
  const { t, lang } = useT()
  const [hover, setHover] = useState<string | null>(null)
  const shown = days.find((d) => d.day === (hover ?? picked))
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'uz-UZ'
  const month = (day: string) => new Date(`${day}T00:00:00`).toLocaleString(locale, { month: 'short' }).replace('.', '')
  const n = (v: number) => fmtNum(v, 0, lang)
  return (
    <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
      <div className="scroll-thin min-w-0 max-w-full overflow-x-auto pb-1">
        <div className="flex w-max items-end gap-[3px]" role="list" aria-label={t('Kunlar')} onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => {
            const newMonth = i === 0 || d.day.slice(0, 7) !== days[i - 1]!.day.slice(0, 7)
            const on = picked === d.day
            return (
              <div key={d.day} role="listitem" className="flex w-[18px] flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPick(d.day)}
                  onMouseEnter={() => setHover(d.day)}
                  onFocus={() => setHover(d.day)}
                  onBlur={() => setHover(null)}
                  aria-label={`${fmtDay(d.day)} · ${n(d.answered)} / ${n(d.total)}`}
                  aria-pressed={on}
                  className="flex h-10 w-[12px] flex-col justify-end rounded-t-[3px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    className={cx('flex w-full flex-col justify-end overflow-hidden rounded-t-[3px] transition-opacity', hover && hover !== d.day && !on ? 'opacity-55' : '', on && 'ring-2 ring-primary')}
                    style={{ height: `${Math.max(8, (d.total / max) * 100)}%` }}
                  >
                    <span className="block w-full bg-ink-3/25" style={{ height: `${((d.total - d.answered) / d.total) * 100}%` }} />
                    <span className="block w-full bg-good" style={{ height: `${(d.answered / d.total) * 100}%` }} />
                  </span>
                </button>
                <span className={cx('num text-[0.625rem] leading-none', on || hover === d.day ? 'font-bold text-ink' : 'text-ink-3')}>{Number(d.day.slice(8))}</span>
                <span className="h-[0.625rem] text-[0.5625rem] leading-none font-semibold whitespace-nowrap text-ink-3 uppercase">{newMonth ? month(d.day) : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="num min-h-[1.25rem] pb-5 text-[0.8125rem] text-ink-2" aria-live="polite">
        {shown ? (
          <>
            <b className="font-semibold text-ink">{fmtDay(shown.day)}</b> · <b className="font-bold text-good">{n(shown.answered)}</b> / {n(shown.total)} · {fmtHms(shown.duration)}
          </>
        ) : null}
      </p>
    </div>
  )
}
