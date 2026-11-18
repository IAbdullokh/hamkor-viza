import type { ReactNode } from 'react'
import type { SnapshotMeta } from '@/features/projects/types'
import type { Lead } from '@/data/types'
import { fmtTime } from '@/lib/format'
import type { Lang } from '@/lib/settings'
import { cx } from '@/lib/cx'
import { useT } from '@/i18n'
import { Avatar } from '@/ui/glass'
import type { Drill } from '@/kit/blocks'
import { MONTHS, dateOf, fmtSec, type Op } from './store'

type T = (uz: string, vars?: Record<string, string | number>) => string

/** Russian says "20 ноября", not the month's own name "20 Ноябрь" */
const RU_DAY_MONTH = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' })

/** a day as words: "20 Noyabr", "20 ноября", "20 November" */
export function dayMonth(day: string, lang: Lang, t: T): string {
  const d = dateOf(day)
  return lang === 'ru' ? RU_DAY_MONTH.format(d) : `${d.getDate()} ${t(MONTHS[d.getMonth()]!)}`
}

/** Drill-down into the leads behind a number: Lid · Vaqt · Manba · Mas'ul · Bosqich · Javob vaqti. */
export function leadDrill(title: string, subtitle: string | undefined, rows: Lead[], t: T, lang: Lang, now: number, stages: SnapshotMeta['leadStageLabels']): Drill<Lead> {
  const dd = (ts: number) => {
    const d = new Date(ts)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${fmtTime(d)}`
  }
  return {
    title,
    subtitle,
    rows: [...rows].sort((a, b) => b.ts - a.ts),
    rowKey: (r) => String(r.id),
    // a row opens the lead in the portal (live projects; kit/blocks DrillSheet)
    crm: { kind: 'lead', id: (r) => r.id },
    columns: [
      { key: 'name', label: 'Lid', value: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
      { key: 'ts', label: 'Vaqt', value: (r) => r.ts, render: (r) => <span className="num text-ink-2">{dd(r.ts)}</span> },
      { key: 'source', label: 'Manba', value: (r) => t(r.source) },
      { key: 'manager', label: "Mas'ul", value: (r) => r.manager },
      { key: 'stage', label: 'Bosqich', value: (r) => t(stages[r.stage]) },
      {
        key: 'resp',
        label: 'Javob vaqti',
        align: 'end',
        value: (r) => (r.ts + r.first_response_sec * 1000 <= now ? r.first_response_sec : null),
        render: (r) => (r.ts + r.first_response_sec * 1000 <= now ? <span className="num">{fmtSec(r.first_response_sec, lang)}</span> : <span className="text-warm">{t('Kutilmoqda')}</span>),
      },
    ],
  }
}

export function OpCell({ op, sub, size = 28 }: { op: Op; sub?: ReactNode; size?: number }) {
  const { t } = useT()
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={op.name} hue={op.hue} size={size} />
      <div className="min-w-0">
        <div className="truncate text-[0.8125rem] font-medium text-ink">
          {op.name}
          {op.staff.fired && <span className="ml-1.5 rounded-full bg-warm-soft px-1.5 py-px text-[0.625rem] font-medium text-warm">{t('ishdan ketgan')}</span>}
        </div>
        {sub !== undefined && <div className="truncate text-[0.6875rem] text-ink-3">{sub}</div>}
      </div>
    </div>
  )
}

/** Cell-state colours, theme tokens only (Hilol: emerald / amber / violet / hatched). */
export const CELL = {
  work: 'border-[color-mix(in_srgb,var(--good)_35%,transparent)] bg-[color-mix(in_srgb,var(--good)_13%,transparent)] text-good',
  istisno: 'border-[color-mix(in_srgb,var(--warm)_45%,transparent)] bg-warm-soft text-warm',
  otpuska: 'border-[color-mix(in_srgb,var(--chart-3)_50%,transparent)] bg-[color-mix(in_srgb,var(--chart-3)_22%,transparent)] text-[var(--chart-3)]',
  weekly: 'border-line text-ink-3',
}
export const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in srgb, var(--ink-3) 22%, transparent) 3px 4px)' }

export function Swatch({ cls, hatch, label }: { cls: string; hatch?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('h-3.5 w-3.5 rounded-[4px] border', cls)} style={hatch ? HATCH : undefined} />
      {label}
    </span>
  )
}

/** Small summary card (Hilol MetricCard): label, big value, hint, tone. */
export function Hint({ children, tone }: { children: ReactNode; tone?: 'good' | 'warn' }) {
  return <span className={cx(tone === 'good' && 'text-good', tone === 'warn' && 'text-warm')}>{children}</span>
}
