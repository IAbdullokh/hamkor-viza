import { useEffect, useRef, useState } from 'react'
import { Check, CircleX, LoaderCircle, Minus } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useT } from '@/i18n'
import { Odometer } from './glass'

/**
 * Progress pieces for server jobs (load, analysis, build).
 *
 *   const eta = useJobEta(job)
 *   <ProgressBar value={job.progress} label={t('Lidlar yuklanmoqda')} etaSec={eta.seconds} />
 *   <Countdown seconds={eta.seconds} />                     // big mm:ss, role="timer", announces whole minutes
 *   <PhaseList items={job.phases.map((p) => ({ id: p.id, label: phaseLabel(t, job.kind, p.id), state: p.state, progress: p.progress, done: p.done, total: p.total }))} />
 */

/** "~4 daqiqa qoldi" / "1 daqiqadan kam qoldi" / "Hisoblanmoqda…" */
export function etaText(t: (s: string, v?: Record<string, string | number>) => string, seconds: number | null | undefined): string {
  if (seconds == null) return t('Vaqt hisoblanmoqda…')
  if (seconds <= 0) return t('Deyarli tayyor')
  if (seconds < 60) return t('1 daqiqadan kam qoldi')
  const min = Math.ceil(seconds / 60)
  if (min < 60) return t('~{n} daqiqa qoldi', { n: min })
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? t('~{h} soat {m} daqiqa qoldi', { h, m }) : t('~{h} soat qoldi', { h })
}

export function ProgressBar({
  value,
  label,
  etaSec,
  showPercent = true,
  tone = 'primary',
  className,
}: {
  /** 0..1 */
  value: number
  label?: string
  /** seconds left (null = unknown, undefined = no ETA line) */
  etaSec?: number | null
  showPercent?: boolean
  tone?: 'primary' | 'good' | 'warn'
  className?: string
}) {
  const { t } = useT()
  const v = Math.max(0, Math.min(1, value))
  const pct = Math.round(v * 100)
  const bar = tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warm)' : undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {(label || showPercent) && (
        <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
          {label && <span className="min-w-0 truncate font-medium text-ink-2">{label}</span>}
          {showPercent && <span className="ms-auto shrink-0 font-semibold text-ink tabular-nums">{pct}%</span>}
        </div>
      )}
      <div
        className="meter h-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        aria-valuetext={etaSec !== undefined ? `${pct}% · ${etaText(t, etaSec)}` : `${pct}%`}
      >
        <span style={{ '--v': v, '--bar': bar } as React.CSSProperties} />
      </div>
      {etaSec !== undefined && <p className="text-[0.75rem] text-ink-3 tabular-nums">{etaText(t, etaSec)}</p>}
    </div>
  )
}

/**
 * The wait in whole minutes (owner, 2026-10-24: seconds ticking every second read as "milliseconds" — not needed). Under a
 * minute it says "<1"; from 100 minutes on it counts hours.
 */
export function waitParts(seconds: number): { value: number; unit: 'min' | 'hour' | 'lessMin' } {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return { value: 1, unit: 'lessMin' }
  const minutes = Math.ceil(total / 60)
  return minutes >= 100 ? { value: Math.round(minutes / 60), unit: 'hour' } : { value: minutes, unit: 'min' }
}

/**
 * The lock-screen countdown: rolling mm:ss digits. role="timer" (aria-live off) + a separate polite region that announces
 * only whole minutes ("4 daqiqa qoldi") and completion.
 */
export function Countdown({ seconds, size = 'xl', className, doneText }: { seconds: number | null; size?: 'md' | 'xl'; className?: string; doneText?: string }) {
  const { t } = useT()
  const [announce, setAnnounce] = useState('')
  const lastMin = useRef<number | null>(null)
  const minutes = seconds == null ? null : Math.ceil(seconds / 60)
  useEffect(() => {
    if (minutes == null) return
    if (lastMin.current === minutes) return
    const first = lastMin.current === null
    lastMin.current = minutes
    if (first) return
    setAnnounce(minutes <= 0 ? (doneText ?? t('Tayyor')) : t('{n} daqiqa qoldi', { n: minutes }))
  }, [minutes, doneText, t])
  return (
    <div className={className}>
      <div
        role="timer"
        aria-live="off"
        aria-label={seconds == null ? t('Vaqt hisoblanmoqda…') : etaText(t, seconds)}
        className={cx('font-bold tracking-[-0.04em] text-ink tabular-nums', size === 'xl' ? 'text-[4rem] leading-none sm:text-[5.5rem]' : 'text-[2rem] leading-none')}
      >
        {seconds == null ? (
          <span className="text-ink-3">--</span>
        ) : (
          <WaitNumber seconds={seconds} size={size} />
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  )
}

export type PhaseState = 'pending' | 'running' | 'done' | 'skipped' | 'error'

export interface PhaseItem {
  id: string
  label: string
  state: PhaseState
  /** 0..1, shown while running */
  progress?: number
  done?: number
  total?: number
  /** what the running phase is doing now ("O'zgarganlar tekshirilyapti"); done / total then count that pass */
  hint?: string
  /** a line under the label in any state ("O'tkazib yuboriladi", "Oxirgi 6 oy") */
  note?: string
  /** controls at the row's end (the load's skip / period per section) */
  aside?: React.ReactNode
  /** dimmed (a section the owner skipped) */
  dim?: boolean
}

/** Vertical list of a job's phases with their state; the running one shows a bar and "done / total". */
export function PhaseList({ items, className }: { items: PhaseItem[]; className?: string }) {
  const { t } = useT()
  return (
    <ol className={cx('flex flex-col gap-1', className)}>
      {items.map((p) => (
        // a row with controls wraps them under the label on a phone (390 px: "50 / 1 170 893" + period + skip do not fit one line)
        <li key={p.id} className={cx('flex items-center gap-3 rounded-[14px] px-2 py-2', !!p.aside && 'flex-wrap gap-y-1', p.state === 'running' && 'bg-surface-2')}>
          <span className={cx('contents', p.dim && '[&>*]:opacity-60')}>
            <PhaseIcon state={p.state} />
          </span>
          <div className={cx('min-w-0 flex-1', !!p.aside && 'min-w-[10rem]', p.dim && 'opacity-60')}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className={cx('min-w-[6rem] flex-1 truncate text-[0.9375rem]', p.state === 'pending' || p.state === 'skipped' ? 'text-ink-3' : 'text-ink', p.state === 'running' && 'font-semibold')}>
                {p.label}
              </span>
              {p.state === 'skipped' && <span className="text-[0.75rem] text-ink-3">{t("O'tkazib yuborildi")}</span>}
              {p.total != null && p.state !== 'pending' && p.state !== 'skipped' && (
                <span className="shrink-0 text-[0.75rem] text-ink-3 tabular-nums">
                  {(p.done ?? 0).toLocaleString('ru-RU').replace(/,/g, ' ')} / {p.total.toLocaleString('ru-RU').replace(/,/g, ' ')}
                </span>
              )}
            </div>
            {p.state === 'running' && p.hint && <p className="truncate text-[0.75rem] text-ink-2">{p.hint}</p>}
            {p.note && <p className="truncate text-[0.75rem] text-ink-3">{p.note}</p>}
            {p.state === 'running' && p.progress != null && (
              <div className="meter mt-1.5 h-1.5" role="presentation">
                <span style={{ '--v': Math.max(0, Math.min(1, p.progress)) } as React.CSSProperties} />
              </div>
            )}
          </div>
          {p.aside && <div className="ml-auto flex max-w-full shrink-0 items-center gap-1">{p.aside}</div>}
        </li>
      ))}
    </ol>
  )
}

function PhaseIcon({ state }: { state: PhaseState }) {
  const { t } = useT()
  const base = 'grid h-6 w-6 shrink-0 place-items-center rounded-full'
  switch (state) {
    case 'done':
      return (
        <span className={cx(base, 'bg-mint text-mint-ink')} aria-label={t('Tayyor')} role="img">
          <Check size={14} strokeWidth={3} />
        </span>
      )
    case 'running':
      return (
        <span className={cx(base, 'bg-primary-soft text-primary-strong')} aria-label={t('Ishlanmoqda…')} role="img">
          <LoaderCircle size={14} className="animate-spin" />
        </span>
      )
    case 'error':
      return (
        <span className={cx(base, 'bg-danger-soft text-danger')} aria-label={t('Xato')} role="img">
          <CircleX size={14} />
        </span>
      )
    case 'skipped':
      return (
        <span className={cx(base, 'bg-surface-2 text-ink-3')} aria-hidden>
          <Minus size={14} />
        </span>
      )
    case 'pending':
      return <span className={cx(base, 'border border-line-strong')} aria-hidden />
  }
}

function WaitNumber({ seconds, size }: { seconds: number; size: 'md' | 'xl' }) {
  const { t } = useT()
  const w = waitParts(seconds)
  const unit = w.unit === 'hour' ? t('soat') : t('daqiqa')
  return (
    <span className="inline-flex items-baseline gap-[0.18em]">
      {w.unit === 'lessMin' && <span>&lt;</span>}
      <Odometer value={w.value} />
      <span className={cx('font-semibold tracking-normal text-ink-2', size === 'xl' ? 'text-[1.5rem] sm:text-[2rem]' : 'text-[1rem]')}>{unit}</span>
    </span>
  )
}
