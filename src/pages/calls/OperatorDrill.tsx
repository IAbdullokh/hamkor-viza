import { useMemo, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useT } from '@/i18n'
import { fmtNum } from '@/lib/format'
import type { Call, Lead } from '@/data/types'
import { Button } from '@/ui/controls'
import { DataTable, sum, type Column } from '@/kit/DataTable'
import { answered, fmtDay, fmtDT, fmtHms, fullOf, outcomeOf } from './calc'
import { RecordingCell, StageChip, StatusChip, TypeChip } from './parts'
import { CrmLink } from '@/kit/CrmLink'

const PAGE = 10

interface DayRow {
  day: string
  total: number
  answered: number
  duration: number
}

/**
 * Operator drill: over a multi-day range, level 1 = one row per day (newest first);
 * picking a day opens level 2 = that day's call list. A single-day range opens the call list directly.
 */
export function OperatorDrill({ calls, singleDay, leads }: { calls: Call[]; singleDay: boolean; leads: Map<number, Lead> }) {
  const [day, setDay] = useState<string | null>(null)
  if (singleDay) return <CallList calls={calls} leads={leads} />
  if (!day) return <DaysList calls={calls} onPick={setDay} />
  return <CallList calls={calls.filter((c) => c.day === day)} leads={leads} backDay={day} onBack={() => setDay(null)} />
}

function DaysList({ calls, onPick }: { calls: Call[]; onPick: (d: string) => void }) {
  const { t, lang } = useT()
  const rows = useMemo(() => {
    const by = new Map<string, DayRow>()
    for (const c of calls) {
      let r = by.get(c.day)
      if (!r) by.set(c.day, (r = { day: c.day, total: 0, answered: 0, duration: 0 }))
      r.total++
      if (answered(c)) r.answered++
      r.duration += fullOf(c)
    }
    return [...by.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
  }, [calls])
  const max = Math.max(1, ...rows.map((r) => r.total))
  const columns: Column<DayRow>[] = [
    {
      key: 'day',
      label: 'Sana',
      value: (r) => r.day,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ChevronRight size={13} className="text-ink-3" />
          <span className="num">{fmtDay(r.day)}</span>
        </span>
      ),
    },
    {
      key: 'total',
      label: "Qo'ng'iroqlar",
      value: (r) => r.total,
      render: (r) => (
        <span className="relative block h-5 min-w-[120px] max-w-[260px] overflow-hidden rounded-[6px] bg-surface-2">
          <span className="absolute inset-y-0 start-0 rounded-[6px] bg-[var(--chart-1)] opacity-80" style={{ width: `${(r.total / max) * 100}%` }} />
          <span className="num absolute inset-y-0 end-2 text-[0.75rem] leading-5 font-bold text-ink">{fmtNum(r.total, 0, lang)}</span>
        </span>
      ),
      total: sum((r) => r.total),
      format: (v) => fmtNum(v, 0, lang),
    },
    { key: 'answered', label: 'Muvaffaqiyatli', align: 'end', value: (r) => r.answered, render: (r) => <span className="num font-semibold text-good">{fmtNum(r.answered, 0, lang)}</span>, total: sum((r) => r.answered), format: (v) => fmtNum(v, 0, lang) },
    { key: 'dur', label: 'Davomiylik', align: 'end', value: (r) => r.duration, format: fmtHms, total: sum((r) => r.duration) },
  ]
  if (!rows.length) return <p className="py-8 text-center text-[0.875rem] text-ink-3">{t("Qo'ng'iroqlar topilmadi")}</p>
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.day} onRow={(r) => onPick(r.day)} maxHeight={480} />
}

export function CallList({ calls, leads, backDay, onBack }: { calls: Call[]; leads: Map<number, Lead>; backDay?: string; onBack?: () => void }) {
  const { t, lang } = useT()
  const list = useMemo(() => [...calls].sort((a, b) => b.ts - a.ts).slice(0, 1000), [calls])
  const [visible, setVisible] = useState(PAGE)
  const [playing, setPlaying] = useState<Call['id'] | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const shown = list.slice(0, visible)
  const totalSec = list.reduce((s, c) => s + fullOf(c), 0)

  const columns: Column<Call>[] = [
    { key: 'phone', label: 'Telefon', value: (c) => c.phone, render: (c) => <span className="num">{c.phone || '—'}</span> },
    { key: 'dir', label: 'Turi', value: (c) => c.direction, render: (c) => <TypeChip call={c} /> },
    { key: 'dur', label: 'Davomiylik', align: 'end', value: (c) => fullOf(c), format: fmtHms, total: () => fmtHms(totalSec) },
    { key: 'ts', label: 'Sana va vaqt', value: (c) => c.ts, render: (c) => <span className="num whitespace-nowrap text-ink-2">{fmtDT(c.ts)}</span> },
    { key: 'st', label: 'Status', value: (c) => outcomeOf(c), render: (c) => <StatusChip call={c} /> },
    { key: 'lead', label: 'Lead', value: (c) => c.lead_id, render: (c) => (c.lead_id ? <CrmLink kind="lead" id={c.lead_id} /> : <span className="text-ink-3">—</span>) },
    { key: 'stage', label: 'Bosqich', value: (c) => (c.lead_id ? (leads.get(c.lead_id)?.stage ?? null) : null), render: (c) => <StageChip lead={c.lead_id ? leads.get(c.lead_id) : undefined} /> },
    {
      key: 'rec',
      label: 'Yozuv',
      width: 210,
      value: (c) => (c.recorded ? 1 : 0),
      render: (c) => <RecordingCell call={c} active={playing === c.id} onOpen={() => setPlaying(c.id)} onClose={() => setPlaying(null)} />,
    },
  ]

  const more = () => {
    setVisible((v) => Math.min(list.length, v + PAGE))
    requestAnimationFrame(() => box.current?.scrollBy({ top: box.current.clientHeight * 0.8, behavior: 'smooth' }))
  }
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48 && visible < list.length) setVisible((v) => Math.min(list.length, v + PAGE))
  }

  return (
    <div>
      {onBack && backDay && (
        <div className="border-b border-line px-4 py-2 sm:px-5">
          <Button size="xs" variant="secondary" onClick={onBack}>
            ← <span className="num">{fmtDay(backDay)}</span>
          </Button>
        </div>
      )}
      {!list.length ? (
        <p className="py-8 text-center text-[0.875rem] text-ink-3">{t("Qo'ng'iroqlar topilmadi")}</p>
      ) : (
        <>
          <div ref={box} onScroll={onScroll} className="scroll-thin max-h-[min(58vh,480px)] overflow-y-auto [&_.data-table_td]:!px-2 [&_.data-table_th]:!px-2">
            <DataTable columns={columns} rows={shown} rowKey={(c) => String(c.id)} numbered />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-4 py-2.5 sm:px-5">
            <span className="me-auto text-[0.8125rem] text-ink-2">
              {t("{shown} / {total} ta qo'ng'iroq ko'rsatilmoqda", { shown: fmtNum(shown.length, 0, lang), total: fmtNum(list.length, 0, lang) })}
            </span>
            {visible < list.length && (
              <>
                <Button size="xs" variant="soft" onClick={more}>
                  {t('Yana {n} ta yuklash', { n: Math.min(PAGE, list.length - visible) })}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setVisible(list.length)}>
                  {t("Barchasini ko'rsatish ({n})", { n: fmtNum(list.length, 0, lang) })}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
