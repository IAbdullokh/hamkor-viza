import { useEffect, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { useT } from '@/i18n'
import { useMeta } from '@/data/source'
import type { Call, Lead } from '@/data/types'
import { Badge } from '@/ui/controls'
import { useToast } from '@/ui/overlay'
import type { Column } from '@/kit/DataTable'
import { fmtDT, fmtHms, fullOf, isIn, outcomeOf, reasonOf, REASON_LABEL, talkOf } from './calc'
import { CrmLink } from '@/kit/CrmLink'

/** Turi chip: Kiruvchi / Chiquvchi */
export function TypeChip({ call }: { call: Call }) {
  const { t } = useT()
  return isIn(call) ? <Badge tone="good">{t('Kiruvchi')}</Badge> : <Badge tone="accent">{t('Chiquvchi')}</Badge>
}

/** Status chip: Muvaffaqiyatli / Qisqa suhbat / Javob bermadi (our call) / O'tkazib yuborilgan (theirs); the reason Bitrix gave on hover */
export function StatusChip({ call }: { call: Call }) {
  const { t } = useT()
  const o = outcomeOf(call)
  if (o === 'answered') return <Badge tone="good">{t('Muvaffaqiyatli')}</Badge>
  const why = reasonOf(call)
  const title = why === 'unknown' ? undefined : t(REASON_LABEL[why])
  if (o === 'short')
    return (
      <Badge tone="neutral" title={t(REASON_LABEL.short)}>
        {t('Qisqa suhbat')}
      </Badge>
    )
  return o === 'missed' ? (
    <Badge tone="warn" title={title}>
      {t("O'tkazib yuborilgan")}
    </Badge>
  ) : (
    <Badge tone="neutral" title={title}>
      {t('Javob bermadi')}
    </Badge>
  )
}

/** Bosqich chip: the current stage of the call's lead */
export function StageChip({ lead }: { lead: Lead | undefined }) {
  const { t } = useT()
  const { leadStageLabels } = useMeta()
  if (!lead) return <span className="text-ink-3">—</span>
  const label = leadStageLabels[lead.stage]
  const tone = lead.stage === 'won' ? 'good' : lead.stage === 'lost' || lead.stage === 'junk' ? 'neutral' : 'accent'
  return <Badge tone={tone}>{t(label)}</Badge>
}

/** Columns of a plain call list (KPI / table-cell drill sheets). */
export function callColumns(leads: Map<number, Lead>, t: (uz: string) => string): Column<Call>[] {
  return [
    { key: 'ts', label: 'Sana va vaqt', value: (c) => c.ts, render: (c) => <span className="num">{fmtDT(c.ts)}</span> },
    { key: 'phone', label: 'Telefon', value: (c) => c.phone, render: (c) => <span className="num">{c.phone || '—'}</span> },
    { key: 'dir', label: 'Turi', value: (c) => c.direction, render: (c) => <TypeChip call={c} /> },
    { key: 'op', label: 'Operator', value: (c) => c.operator },
    { key: 'st', label: 'Status', value: (c) => outcomeOf(c), render: (c) => <StatusChip call={c} /> },
    { key: 'why', label: 'Sabab', value: (c) => (c.status === 'answered' ? '' : reasonOf(c)), render: (c) => (c.status === 'answered' || reasonOf(c) === 'unknown' ? <span className="text-ink-3">—</span> : <span className="text-ink-2">{t(REASON_LABEL[reasonOf(c)])}</span>) },
    { key: 'talk', label: 'Suhbat', align: 'end', value: (c) => talkOf(c), format: fmtHms },
    { key: 'dur', label: 'Davomiylik', align: 'end', value: (c) => fullOf(c), format: fmtHms },
    { key: 'lead', label: 'Lead', value: (c) => c.lead_id, render: (c) => (c.lead_id ? <CrmLink kind="lead" id={c.lead_id} /> : <span className="text-ink-3">—</span>) },
    { key: 'stage', label: 'Bosqich', value: (c) => (c.lead_id ? (leads.get(c.lead_id)?.stage ?? null) : null), render: (c) => <StageChip lead={c.lead_id ? leads.get(c.lead_id) : undefined} /> },
  ]
}

/**
 * Yozuv cell: "Tinglash" button that turns into an inline player (one at a time, controlled by the parent). A real call
 * plays its own recording (record_url, from Bitrix / the PBX); the demo has no audio files, so its player is a sample UI.
 */
export function RecordingCell({ call, active, onOpen, onClose }: { call: Call; active: boolean; onOpen: () => void; onClose: () => void }) {
  if (call.record_url) return <RealRecording url={call.record_url} active={active} onOpen={onOpen} onClose={onClose} />
  return <SampleRecording call={call} active={active} onOpen={onOpen} onClose={onClose} />
}

function RealRecording({ url, active, onOpen, onClose }: { url: string; active: boolean; onOpen: () => void; onClose: () => void }) {
  const { t } = useT()
  if (!active)
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="pressable inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft px-3 py-1 text-[0.75rem] font-semibold text-primary-strong hover:bg-[rgb(var(--accent-rgb)/0.18)]"
      >
        <Play size={12} fill="currentColor" /> {t('Tinglash')}
      </button>
    )
  return (
    <div className="flex w-[240px] items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <audio src={url} controls autoPlay preload="none" className="h-8 min-w-0 flex-1" />
      <button type="button" aria-label={t('Yopish')} onClick={onClose} className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:text-ink">
        <X size={13} />
      </button>
    </div>
  )
}

function SampleRecording({ call, active, onOpen, onClose }: { call: Call; active: boolean; onOpen: () => void; onClose: () => void }) {
  const { t } = useT()
  const toast = useToast()
  const [playing, setPlaying] = useState(true)
  const [pos, setPos] = useState(0)
  const len = Math.max(1, talkOf(call))

  useEffect(() => {
    if (!active) {
      setPos(0)
      setPlaying(true)
    }
  }, [active])

  useEffect(() => {
    if (!active || !playing) return
    const id = setInterval(() => setPos((p) => (p + 1 >= len ? len : p + 1)), 1000)
    return () => clearInterval(id)
  }, [active, playing, len])

  if (!call.recorded) return <span className="text-ink-3">—</span>
  if (!active)
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
          toast(t('Yozuv namunasi'), 'info')
        }}
        className="pressable inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft px-3 py-1 text-[0.75rem] font-semibold text-primary-strong hover:bg-[rgb(var(--accent-rgb)/0.18)]"
      >
        <Play size={12} fill="currentColor" /> {t('Tinglash')}
      </button>
    )
  const done = pos >= len
  return (
    <div className="flex w-[196px] items-center gap-1.5 rounded-full bg-surface-2 py-1 ps-1 pe-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={t(playing && !done ? 'Pauza' : 'Tinglash')}
        onClick={() => {
          if (done) setPos(0)
          setPlaying((p) => (done ? true : !p))
        }}
        className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-fill text-white"
      >
        {playing && !done ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
      </button>
      {/* progress bar with the time readout under it, so the player stays narrow */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="h-1 overflow-hidden rounded-full bg-[var(--border)]">
          <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${(pos / len) * 100}%` }} />
        </span>
        <span className="num text-[0.625rem] leading-none text-ink-2">
          {fmtHms(pos).slice(3)} / {fmtHms(len).slice(3)}
        </span>
      </span>
      <button type="button" aria-label={t('Yopish')} onClick={onClose} className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:text-ink">
        <X size={13} />
      </button>
    </div>
  )
}
