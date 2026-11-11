import { useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, Minus, PieChart, Plus, Scale, Users } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtNum, fmtTime } from '@/lib/format'
import { useDb } from '@/data/db'
import { DEFAULT_WORK_END_HOUR, useMeta } from '@/data/source'
import type { Lead } from '@/data/types'
import { Badge, Button, Card } from '@/ui/controls'
import { useToast } from '@/ui/overlay'
import type { Drill } from '@/kit/blocks'
import { OpCell, leadDrill } from './shared'
import { MONTHS, teamDay, type Op, type Tq } from './store'

const DEFAULT_WORK_START_HOUR = 9
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

export function FoizlarTab({ tq, now, onDrill }: { tq: Tq; now: number; onDrill: (d: Drill<Lead>) => void }) {
  return (
    <div className="grid gap-4">
      <fieldset disabled={tq.readOnly} className="contents">
        <ShareEditor tq={tq} />
      </fieldset>
      <BugungiTaqsimot tq={tq} now={now} onDrill={onDrill} />
    </div>
  )
}

/* ---------------- Taqsimot sozlamalari ---------------- */

function ShareEditor({ tq }: { tq: Tq }) {
  const { t, lang } = useT()
  const toast = useToast()
  const { workEndHour: metaEnd = DEFAULT_WORK_END_HOUR } = useMeta()
  const hours = `${hh(tq.startHour ?? DEFAULT_WORK_START_HOUR)}–${hh(tq.endHour ?? metaEnd)}`
  const [flash, setFlash] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const total = Math.round(tq.ops.reduce((s, o) => s + o.share, 0) * 10) / 10
  const ok = total === 100

  const warn = (next: number) => {
    if (Math.round(next * 10) / 10 !== 100) toast(`${t('Diqqat')} · ${t("Jami: {x}% (100% bo'lishi kerak)", { x: fmtNum(next, 1, lang).replace(/[,.]0$/, '') })}`, 'info')
  }
  const change = (op: Op, v: number) => {
    const val = Math.max(0, Math.min(100, Math.round(v)))
    if (val === op.share) return
    tq.setShare(op.id, val)
    setFlash(op.id)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlash(null), 900)
    warn(total - op.share + val)
  }
  const equal = () => {
    const n = tq.ops.length
    if (!n) return
    const b = Math.floor(100 / n)
    let rem = 100 - b * n
    tq.setShares(Object.fromEntries(tq.ops.map((o) => [o.id, b + (rem-- > 0 ? 1 : 0)])))
    toast(t('Saqlandi'))
  }
  const clear = () => {
    tq.setShares(Object.fromEntries(tq.ops.map((o) => [o.id, 0])))
    warn(0)
  }

  return (
    <Card
      dense
      flush
      title={t('Taqsimot sozlamalari')} uz={'Taqsimot sozlamalari'}
      subtitle={<span className="hidden sm:inline">{t("Har bir xodim uchun ulushni kiriting — jami 100% bo'lishi shart")}</span>}
      icon={PieChart}
      tile="indigo"
      actions={<Badge tone={ok ? 'good' : 'warn'}>{t('Jami {x} %', { x: fmtNum(total, 1, lang).replace(/[,.]0$/, '') })}</Badge>}
    >
      <p className="px-4 pb-2 text-[0.8125rem] text-ink-2 sm:hidden">{t("Har bir xodim uchun ulushni kiriting — jami 100% bo'lishi shart")}</p>
      <div className="flex flex-wrap gap-2 border-b border-line px-4 pb-3 sm:px-5">
        <Button size="xs" variant="soft" icon={Scale} onClick={equal}>
          {t('Teng taqsimlash')}
        </Button>
        <Button size="xs" variant="ghost" icon={Eraser} onClick={clear}>
          {t('Tozalash')}
        </Button>
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky start-0 z-[2]">{t('Xodim')}</th>
              <th className="hidden sm:table-cell">{t('Ish vaqti')}</th>
              <th className="hidden w-[180px] sm:table-cell" aria-label={t('Ulush')} />
              <th className="text-end">{t('Taqsimot %')}</th>
            </tr>
          </thead>
          <tbody>
            {tq.ops.map((op) => (
              <tr key={op.id} className={cx('transition-colors duration-500', flash === op.id && 'bg-[color-mix(in_srgb,var(--good)_14%,transparent)]')}>
                <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                  <OpCell op={op} sub={<><span className="sm:hidden">{hours} · </span>{op.sub}</>} />
                </td>
                <td className="num hidden text-ink-2 sm:table-cell">{hours}</td>
                <td className="hidden sm:table-cell">
                  <div className="h-2 w-[160px] overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500" style={{ width: `${Math.min(100, op.share * 2.5)}%` }} />
                  </div>
                </td>
                <td className="text-end">
                  <div className="inline-flex items-center gap-1">
                    <button type="button" aria-label="−5" onClick={() => change(op, op.share - 5)} className="pressable grid h-7 w-7 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface-2">
                      <Minus size={13} />
                    </button>
                    {editing === op.id ? (
                      <ShareInput
                        value={op.share}
                        onDone={(v) => {
                          setEditing(null)
                          if (v !== null) change(op, v)
                        }}
                      />
                    ) : (
                      <button type="button" onClick={() => setEditing(op.id)} className="num min-w-[58px] rounded-[8px] px-1.5 py-1 text-center font-semibold text-ink hover:bg-primary-soft">
                        {op.share > 0 ? `${op.share} %` : '— %'}
                      </button>
                    )}
                    <button type="button" aria-label="+5" onClick={() => change(op, op.share + 5)} className="pressable grid h-7 w-7 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface-2">
                      <Plus size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="sticky start-0 z-[1] border-t-2 border-[var(--border-strong)] bg-[rgb(var(--card-rgb)/0.92)] !py-3.5">{t('Jami')}</td>
              <td className="hidden border-t-2 border-[var(--border-strong)] sm:table-cell" />
              <td className="hidden border-t-2 border-[var(--border-strong)] sm:table-cell" />
              <td className={cx('num border-t-2 border-[var(--border-strong)] !py-3.5 text-end', ok ? 'text-good' : 'text-warm')}>
                {ok ? t("{x}% to'g'ri", { x: 100 }) : `${fmtNum(total, 1, lang).replace(/[,.]0$/, '')}%`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="h-2" />
    </Card>
  )
}

function ShareInput({ value, onDone }: { value: number; onDone: (v: number | null) => void }) {
  const [s, setS] = useState(String(value))
  const done = useRef(false)
  const finish = (v: number | null) => {
    if (done.current) return
    done.current = true
    onDone(v)
  }
  const commit = () => finish(s.trim() === '' || Number.isNaN(+s) ? null : +s)
  return (
    <input
      autoFocus
      type="number"
      min={0}
      max={100}
      step={1}
      value={s}
      onChange={(e) => setS(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') finish(null)
      }}
      className="field num h-8 w-[64px] rounded-[8px] px-2 text-center text-[0.875rem] text-ink"
    />
  )
}

/* ---------------- Bugungi taqsimot (leads) ---------------- */

function BugungiTaqsimot({ tq, now, onDrill }: { tq: Tq; now: number; onDrill: (d: Drill<Lead>) => void }) {
  const { t, lang } = useT()
  const db = useDb()
  const { leadStageLabels, workEndHour: metaEnd = DEFAULT_WORK_END_HOUR } = useMeta()
  // the automatic distribution's own hours win (the same team day it hands leads out by)
  const workEndHour = tq.endHour ?? metaEnd

  // business day endHour → endHour
  const win = useMemo(() => teamDay(now, workEndHour), [now, workEndHour])

  const { rows, leadsBy, totalAll } = useMemo(() => {
    const leads = db.leads.filter((l) => l.ts >= win.from && l.ts < Math.min(win.to, now))
    const by = new Map<string, Lead[]>()
    for (const l of leads) {
      const a = by.get(l.manager_id)
      if (a) a.push(l)
      else by.set(l.manager_id, [l])
    }
    const active = tq.ops.filter((o) => o.share > 0)
    const working = active.filter((o) => !tq.isOff(o, win.businessDay))
    const sumW = working.reduce((s, o) => s + tq.shareOn(o, win.businessDay), 0)
    // the actual share is of the roster's leads (the targets add up to 100 over the same people)
    const rosterLeads = active.reduce((s, o) => s + (by.get(o.id)?.length ?? 0), 0)
    const rows = active.map((op) => {
      const off = tq.isOff(op, win.businessDay)
      const target = !off && sumW ? Math.round((tq.shareOn(op, win.businessDay) / sumW) * 1000) / 10 : 0
      const count = by.get(op.id)?.length ?? 0
      const actual = rosterLeads ? Math.round((count / rosterLeads) * 1000) / 10 : null
      return { op, off, target, count, actual, diff: actual === null ? null : Math.round((actual - target) * 10) / 10 }
    })
    return { rows, leadsBy: by, totalAll: leads.length }
  }, [db, tq, win, now])

  const listed = rows.reduce((s, r) => s + r.count, 0)
  const offLeads = rows.filter((r) => r.off && r.count > 0)
  const bd = new Date(`${win.businessDay}T00:00:00`)
  const bdLabel = `${bd.getDate()} ${t(MONTHS[bd.getMonth()]!).toLowerCase()}`
  const fmtP = (x: number) => fmtNum(x, 1, lang).replace(/[,.]0$/, '')

  return (
    <Card
      dense
      flush
      title={t('Bugungi taqsimot')} uz={'Bugungi taqsimot'}
      subtitle={<span className="hidden sm:inline">{t('Ish kuni {h} da almashadi — undan keyingi lidlar ertangi kun jamoasiga', { h: hh(workEndHour) })}</span>}
      icon={Users}
      tile="green"
      actions={
        <div className="text-end">
          <div className="num text-[1.375rem] leading-none font-bold text-ink">{fmtNum(listed, 0, lang)}</div>
          <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[0.6875rem] text-ink-3">
            {t('Bugungi lidlar')} <span className="num rounded-full bg-surface-2 px-1.5 py-px">{fmtTime(new Date(now))}</span>
          </div>
        </div>
      }
    >
      <p className="px-4 pb-1.5 text-[0.8125rem] text-ink-2 sm:hidden">{t('Ish kuni {h} da almashadi — undan keyingi lidlar ertangi kun jamoasiga', { h: hh(workEndHour) })}</p>
      <p className={cx('border-b border-line px-4 pb-3 text-[0.8125rem] sm:px-5', win.after ? 'text-warm' : 'text-ink-2')}>
        {win.after ? t('Ish kuni tugadi — bu raqamlar ertangi kunga ({date}) tegishli', { date: bdLabel }) : t('Ish kuni: {date}, kechagi {h} dan bugungi {h} gacha', { date: bdLabel, h: hh(workEndHour) })}
      </p>
      <div className="scroll-thin overflow-x-auto">
        <table className="data-table max-sm:[&_td]:!px-1.5 max-sm:[&_td:first-child]:!ps-3 max-sm:[&_th]:!px-1.5 max-sm:[&_th:first-child]:!ps-3">
          <thead>
            <tr>
              <th className="sticky start-0 z-[2]">{t('Xodim')}</th>
              <th className="text-end">
                <span className="sm:hidden">{t('Maqsad')}</span>
                <span className="hidden sm:inline">{t('Maqsad %')}</span>
              </th>
              <th className="text-end">
                <span className="sm:hidden">{t('Lidlar')}</span>
                <span className="hidden sm:inline">{t('Bugungi lidlar')}</span>
              </th>
              <th className="hidden w-[170px] sm:table-cell" aria-label={t('Haqiqiy ulush')} />
              <th className="text-end">
                <span className="sm:hidden">{t('Haqiqiy')}</span>
                <span className="hidden sm:inline">{t('Haqiqiy %')}</span>
              </th>
              <th className="text-end">{t('Farq')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const scale = Math.max(r.actual ?? 0, r.target, 30)
              const ad = r.diff === null ? 0 : Math.abs(r.diff)
              return (
                <tr key={r.op.id} className={r.off ? 'opacity-55' : undefined}>
                  <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                    <div className="max-w-[96px] sm:max-w-none">
                      <OpCell op={r.op} size={24} sub={<span className="hidden sm:inline">{r.op.sub}</span>} />
                    </div>
                  </td>
                  <td className="num text-end">
                    {r.off ? (
                      <span className="inline-block max-w-[52px] text-[0.75rem] leading-tight whitespace-normal text-ink-3 sm:max-w-none sm:text-[0.8125rem]">
                        {t('dam olyapti')}
                        {r.count > 0 && '*'}
                      </span>
                    ) : (
                      <>
                        <div className="font-semibold">{fmtP(r.target)}%</div>
                        {r.target !== r.op.share && <div className="hidden text-[0.6875rem] text-ink-3 sm:block">{t('sozlamada {x}%', { x: r.op.share })}</div>}
                      </>
                    )}
                  </td>
                  <td className="num text-end">
                    {r.count > 0 ? (
                      <button
                        type="button"
                        onClick={() => onDrill(leadDrill('Bugungi lidlar', r.op.name, leadsBy.get(r.op.id) ?? [], t, lang, now, leadStageLabels))}
                        className="rounded-[6px] px-1 font-semibold text-primary-strong underline-offset-2 hover:bg-primary-soft hover:underline"
                      >
                        {fmtNum(r.count, 0, lang)}
                      </button>
                    ) : (
                      <span className="text-ink-3">0</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">{r.actual === null ? <span className="text-ink-3">—</span> : <ShareBar actual={r.actual} target={r.target} scale={scale} off={r.off} className="w-[150px]" />}</td>
                  <td className="num text-end font-semibold">
                    {r.actual === null ? '—' : `${fmtP(r.actual)}%`}
                    {r.actual !== null && <ShareBar actual={r.actual} target={r.target} scale={scale} off={r.off} className="ms-auto mt-1.5 w-[48px] sm:hidden" />}
                  </td>
                  <td className={cx('num text-end font-semibold', r.off || r.diff === null ? 'text-ink-3' : ad < 5 ? 'text-good' : 'text-warm', ad >= 10 && !r.off && 'font-bold')}>
                    {r.diff === null ? '—' : `${r.diff > 0 ? '+' : r.diff < 0 ? '−' : ''}${fmtP(Math.abs(r.diff))}`}
                  </td>
                </tr>
              )
            })}
            {(!rows.length || !totalAll) && !rows.some((r) => r.count) && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-3">
                  {t('Bugun hali lid kelmagan yoki taqsimot sozlanmagan')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-3 text-[0.75rem] text-ink-2 sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-[var(--chart-2)]" /> {t('Haqiqiy ulush')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-0.5 rounded-full bg-ink" /> {t("Maqsad chizig'i")}
        </span>
        {offLeads.length > 0 && (
          <span className="basis-full text-ink-3">
            * {t('Dam olish kunida kelgan lidlar')}: {offLeads.map((r) => `${r.op.name} (${fmtNum(r.count, 0, lang)})`).join(', ')}
          </span>
        )}
      </div>
    </Card>
  )
}

function ShareBar({ actual, target, scale, off, className }: { actual: number; target: number; scale: number; off: boolean; className?: string }) {
  return (
    <div className={cx('relative h-2.5 rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full bg-[var(--chart-2)] transition-[width] duration-500" style={{ width: `${(actual / scale) * 100}%` }} />
      {!off && <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ insetInlineStart: `${(target / scale) * 100}%` }} />}
    </div>
  )
}
