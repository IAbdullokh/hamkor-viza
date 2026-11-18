import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plane, Plus, Search, UserCheck, UserMinus, Users } from 'lucide-react'
import { useDb } from '@/data/db'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { dayKey } from '@/data/range'
import { Badge, Button, Card } from '@/ui/controls'
import { Avatar, Segmented, StatCard } from '@/ui/glass'
import { DropMenu, Modal, Sheet, useToast } from '@/ui/overlay'
import { OpCell, dayMonth } from './shared'
import { FULL_DAYS, MONTHS, SHORT_DAYS, WEEK_ORDER, dateOf, daysBetween, daysFromTo, hm, leavesOf, rangesByMonth, runsOfDays, tashkent, type Leave, type Op, type Tq } from './store'
import { Picker } from './DistributionPanel'
import type { Roster } from './TaqsimotPage'

type Status = 'all' | 'now' | 'not'
type Sort = 'start' | 'name'

/** the hours to choose from: every 30 minutes */
const STEPS = Array.from({ length: 49 }, (_, i) => i * 30)

/**
 * «Haftalik jadval» — the one place for the operators (owner, 2026-11-11: "every operator has its own working hours and days —
 * set under that place where we set day offs; add users in the table; we don't need to illustrate two"): a row per operator
 * with their working days (the weekly days off of before are the days not ticked) and their own hours, edited in the row;
 * «+ Operator qo'shish» adds one to the distribution (a live project's settings, the demo's own roster). On a phone a row is
 * a card. Leave and one-off days off stay in «Otpuska rejasi» / Kunlik jadval.
 */
export function HaftalikTab({ tq, now, roster }: { tq: Tq; now: number; roster: Roster | null }) {
  const { t } = useT()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  // by name: a row stays where it is while its hours are edited
  const [sort, setSort] = useState<Sort>('name')
  const [per, setPer] = useState(10)
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const db = useDb()
  const editable = !tq.readOnly && roster !== null

  const working = (op: Op) => tq.isWorkingAt(op, now)
  const workingNow = tq.ops.filter(working).length
  const todayKey = tashkent(now)
  const offToday = tq.ops.filter((o) => o.weekly.includes(todayKey.dow) || tq.offMap.has(`${o.id}:${todayKey.day}`)).length

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const rows = tq.ops.filter((o) => (!qq || `${o.name} ${o.sub}`.toLowerCase().includes(qq)) && (status === 'all' || (status === 'now') === tq.isWorkingAt(o, now)))
    return sort === 'start' ? [...rows].sort((a, b) => a.from - b.from || a.to - b.to || a.name.localeCompare(b.name)) : [...rows].sort((a, b) => a.name.localeCompare(b.name))
  }, [tq, q, status, sort, now])
  const pages = Math.max(1, Math.ceil(list.length / per))
  const cur = Math.min(page, pages)
  const shown = list.slice((cur - 1) * per, cur * per)

  const toggleDay = (op: Op, dow: number) => {
    const work = WEEK_ORDER.filter((d) => !op.weekly.includes(d))
    const next = work.includes(dow) ? work.filter((d) => d !== dow) : [...work, dow]
    if (!next.length) return toast(t('Kamida bitta ish kuni qolishi kerak'), 'info')
    tq.setWorkDays(op.id, next)
    // coverage per weekday: someone with a share > 0 must still work
    const weekly = [0, 1, 2, 3, 4, 5, 6].filter((d) => !next.includes(d))
    const after = tq.ops.map((o) => (o.id === op.id ? { ...o, weekly } : o))
    const empty = WEEK_ORDER.filter((d) => !after.some((o) => o.share > 0 && !o.weekly.includes(d)))
    // only the day just taken away: a day nobody worked before is not news
    if (empty.includes(dow) && next.length < work.length)
      toast(`${t('Diqqat')} · ${t("Ba'zi kunlarda lid qabul qiladigan operator qolmadi")}: ${empty.map((d) => t(FULL_DAYS[d]!)).join(', ')}`, 'info')
  }
  const remove = (op: Op) => {
    if (!roster) return
    roster.remove(op.id)
    toast(t('{name} taqsimotdan olindi', { name: op.name }), 'ok', { action: { label: t('Qaytarish'), onClick: () => roster.add(op.id) } })
  }

  return (
    <>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t('Operatorlar')} uz={'Operatorlar'} value={tq.ops.length} icon={Users} tile="blue" />
        <StatCard label={t('Hozir ishlayapti')} uz={'Hozir ishlayapti'} value={workingNow} icon={UserCheck} tile="green" sub={tq.ops.length ? `${hm(Math.round(tq.startHour * 60))} – ${hm(Math.round(tq.endHour * 60))}` : undefined} />
        <StatCard className="col-span-2 sm:col-span-1" label={t('Bugun dam oladi')} uz={'Bugun dam oladi'} value={offToday} icon={CalendarDays} tile="purple" />
      </div>

      <Card
        className="mt-4"
        dense
        flush
        title={t('Haftalik jadval')}
        uz={'Haftalik jadval'}
        icon={CalendarDays}
        tile="indigo"
        actions={
          editable ? (
            <Button size="sm" variant="primary" icon={Plus} disabled={roster.busy} onClick={() => setAdding((v) => !v)}>
              {t("Operator qo'shish")}
            </Button>
          ) : undefined
        }
      >
        {adding && editable && (
          <div className="border-b border-line px-4 pb-3 sm:px-5">
            <div className="max-w-[420px]">
              <Picker staff={db.staff} exclude={[...tq.ops.map((o) => o.id), ...roster.exclude]} onPick={(id) => (roster.add(id), setAdding(false))} />
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 pb-3 sm:px-5">
          <label className="field flex min-h-[38px] min-w-0 flex-1 basis-[220px] items-center gap-2 rounded-[14px] px-3">
            <Search size={15} className="shrink-0 text-ink-3" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={t('Operator qidirish...')}
              className="w-full min-w-0 bg-transparent text-[0.875rem] text-ink outline-none placeholder:text-ink-3"
            />
          </label>
          <select aria-label={t('Holat')} value={status} onChange={(e) => (setStatus(e.target.value as Status), setPage(1))} className="field select-chevron min-h-[38px] rounded-[14px] ps-3 pe-8 text-[0.8125rem] text-ink">
            <option value="all">{t('Barchasi')}</option>
            <option value="now">{t('Hozir ishlayapti')}</option>
            <option value="not">{t('Hozir ishlamayapti')}</option>
          </select>
          <select aria-label={t('Saralash')} value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field select-chevron min-h-[38px] min-w-0 max-w-full rounded-[14px] ps-3 pe-8 text-[0.8125rem] text-ink">
            <option value="name">{t("Ism bo'yicha")}</option>
            <option value="start">{t("Ish boshlanishi bo'yicha")}</option>
          </select>
        </div>

        {/* desktop: the table */}
        <div className="scroll-thin hidden overflow-x-auto sm:block">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky start-0 z-[2]">{t('Operator')}</th>
                <th>{t('Ish kunlari')}</th>
                <th>{t('Ish vaqti')}</th>
                {editable && <th className="text-end">{t('Amallar')}</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((op) => (
                <tr key={op.id}>
                  <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                    <OpCell op={op} sub={<NowMark on={working(op)} sub={op.sub} />} />
                  </td>
                  <td>
                    <DayToggles op={op} disabled={!editable} onToggle={(d) => toggleDay(op, d)} />
                  </td>
                  <td>
                    <HoursPick op={op} disabled={!editable} onChange={(a, b) => tq.setHours(op.id, a, b)} />
                  </td>
                  {editable && (
                    <td className="text-end">
                      <RemoveButton disabled={roster.busy} onClick={() => remove(op)} />
                    </td>
                  )}
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={editable ? 4 : 3} className="py-8 text-center text-ink-3">
                    {tq.ops.length ? t("Qidiruvga mos operator yo'q") : t("Hali operator yo'q")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* phone: a row is a card */}
        <ul className="flex flex-col divide-y divide-line sm:hidden">
          {shown.map((op) => (
            <li key={op.id} className="flex flex-col gap-2.5 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <OpCell op={op} sub={<NowMark on={working(op)} sub={op.sub} />} />
                </div>
                {editable && <RemoveButton disabled={roster.busy} onClick={() => remove(op)} />}
              </div>
              <DayToggles op={op} disabled={!editable} onToggle={(d) => toggleDay(op, d)} block />
              <HoursPick op={op} disabled={!editable} onChange={(a, b) => tq.setHours(op.id, a, b)} />
            </li>
          ))}
          {!shown.length && <li className="py-8 text-center text-[0.875rem] text-ink-3">{tq.ops.length ? t("Qidiruvga mos operator yo'q") : t("Hali operator yo'q")}</li>}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[0.8125rem] text-ink-2 sm:px-5">
          <span className="num">{list.length ? t('{a}-{b} / {n} ta operator', { a: (cur - 1) * per + 1, b: Math.min(cur * per, list.length), n: list.length }) : t('0 ta operator')}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-ink-3">{t('Sahifada:')}</span>
            <select aria-label={t('Sahifada:')} value={per} onChange={(e) => (setPer(+e.target.value), setPage(1))} className="field select-chevron min-h-[32px] rounded-[10px] ps-2.5 pe-7 text-[0.8125rem] text-ink">
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button type="button" aria-label={t('Oldingi')} disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="pressable grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setPage(p)} className={cx('num grid h-8 min-w-8 place-items-center rounded-full px-2', p === cur ? 'bg-primary-soft font-semibold text-primary-strong' : 'hover:bg-surface-2')}>
                {p}
              </button>
            ))}
            <button type="button" aria-label={t('Keyingi')} disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="pressable grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Card>

      <OtpuskaSection tq={tq} now={now} />
    </>
  )
}

/** working now (their day, their hours, Tashkent): a green dot and «Ishda» before the branch */
function NowMark({ on, sub }: { on: boolean; sub: string }) {
  const { t } = useT()
  return (
    <>
      {on && (
        <span className="inline-flex items-center gap-1 font-medium text-good">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" />
          {t('Ishda')}
        </span>
      )}
      {on && sub && ' · '}
      {sub}
    </>
  )
}

/** the seven days, Monday first: ticked = a working day */
function DayToggles({ op, disabled, onToggle, block }: { op: Op; disabled: boolean; onToggle: (dow: number) => void; block?: boolean }) {
  const { t } = useT()
  return (
    <div role="group" aria-label={t('Ish kunlari')} className={cx('gap-1', block ? 'grid grid-cols-7' : 'inline-flex')}>
      {WEEK_ORDER.map((d) => {
        const on = !op.weekly.includes(d)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={t(FULL_DAYS[d]!)}
            title={t(FULL_DAYS[d]!)}
            disabled={disabled}
            onClick={() => onToggle(d)}
            className={cx(
              'pressable grid h-8 place-items-center rounded-[10px] border text-[0.75rem] font-semibold transition-colors disabled:cursor-default',
              block ? 'w-full' : 'w-8',
              on ? 'border-transparent bg-primary-fill text-white' : 'border-line text-ink-3 enabled:hover:bg-surface-2',
            )}
          >
            {t(SHORT_DAYS[d]!)}
          </button>
        )
      })}
    </div>
  )
}

/** from – to, every 30 minutes; an end before the start is the next morning (an overnight shift, "+1") */
function HoursPick({ op, disabled, onChange }: { op: Op; disabled: boolean; onChange: (from: number, to: number) => void }) {
  const { t } = useT()
  const cls = 'field select-chevron num min-h-[34px] rounded-[10px] ps-2.5 pe-7 text-[0.875rem] font-semibold text-ink disabled:opacity-100'
  // a saved time off the 30-minute grid still shows as itself; the ends run on from the start, past midnight
  const after = (m: number) => (m > op.from ? m : m + 1440)
  const opts = (xs: number[], v: number, key: (m: number) => number = (m) => m) => [...new Set([...xs, v])].sort((a, b) => key(a) - key(b))
  return (
    <div className="flex items-center gap-1.5">
      <select aria-label={t('Boshlanishi')} value={op.from} disabled={disabled} onChange={(e) => onChange(+e.target.value, op.to)} className={cls}>
        {opts(STEPS.filter((m) => m !== op.to && m < 1440), op.from).map((m) => (
          <option key={m} value={m}>
            {hm(m)}
          </option>
        ))}
      </select>
      <span className="text-ink-3">–</span>
      <select aria-label={t('Tugashi')} value={op.to} disabled={disabled} onChange={(e) => onChange(op.from, +e.target.value)} className={cls}>
        {opts(STEPS.filter((m) => m !== op.from && m > 0), op.to, after).map((m) => (
          <option key={m} value={m}>
            {m < op.from ? `${hm(m)} +1` : hm(m)}
          </option>
        ))}
      </select>
    </div>
  )
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { t } = useT()
  return (
    <button
      type="button"
      title={t('Taqsimotdan olish')}
      aria-label={t('Taqsimotdan olish')}
      disabled={disabled}
      onClick={onClick}
      className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger disabled:opacity-40"
    >
      <UserMinus size={16} />
    </button>
  )
}

/* ---------------- Otpuska rejasi ---------------- */

/**
 * The leave plan as a plain table (owner, 2026-11-06: business users must understand it at once; a calendar grid was "no way"):
 * one button adds a leave — who, from, until, a note — and the leaves are a table like the one above it, who is away now first.
 * One row per person (owner, 2026-11-06), however many leaves they have.
 * A leave that ended leaves the table. "Bekor qilish" takes back what has not passed yet; the toast's "Qaytarish" undoes it.
 */
function OtpuskaSection({ tq, now }: { tq: Tq; now: number }) {
  const { t, lang } = useT()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState<Leave | null>(null)
  const today = dayKey(now)
  const leaves = useMemo(() => leavesOf(tq.ops, tq.offMap, today), [tq.ops, tq.offMap, today])
  const people = useMemo(() => {
    const byOp = new Map<string, Leave[]>()
    for (const l of leaves) byOp.set(l.op.id, [...(byOp.get(l.op.id) ?? []), l])
    return [...byOp.values()]
  }, [leaves])

  const dateText = (day: string) => dayMonth(day, lang, t)
  const rangeText = (l: Leave) => {
    if (l.from === l.to) return dateText(l.from)
    const a = dateOf(l.from)
    const b = dateOf(l.to)
    return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${dateText(l.to)}` : `${dateText(l.from)} – ${dateText(l.to)}`
  }
  const whenText = (l: Leave) => {
    if (l.from <= today) {
      const left = daysBetween(today, l.to)
      return left === 0 ? t('Bugun oxirgi kun') : t('{n} kun qoldi', { n: left })
    }
    const wait = daysBetween(today, l.from)
    return wait === 1 ? t('Ertaga') : t('{n} kundan keyin', { n: wait })
  }

  // the month once: "3–12, 14 Noyabr" (dayMonth gives "14 Noyabr" / "14 ноября", its month is the part after the day)
  const allRanges = (ls: Leave[]) =>
    rangesByMonth(ls)
      .map((g) => `${g.parts.join(', ')} ${dayMonth(g.day, lang, t).split(' ').slice(1).join(' ')}`)
      .join(', ')
  // the status speaks of the first leave only, so with more to come it says when the next one starts
  const statusText = (ls: Leave[]) => {
    const next = ls.find((l) => l.from > today)
    return ls[0]!.from <= today && next ? `${whenText(ls[0]!)} · ${t('keyingisi {n} kundan keyin', { n: daysBetween(today, next.from) })}` : whenText(ls[0]!)
  }

  const cancel = () => {
    if (!pick) return
    // the days that have passed stay as they were: leads were already handed out by them
    const ds = pick.days.filter((d) => d >= today)
    for (const d of ds) tq.removeOff(pick.op.id, d)
    const { op, note } = pick
    toast(t('{name} — yana ishlaydi', { name: op.name }), 'ok', { action: { label: t('Qaytarish'), onClick: () => tq.addOff(op.id, ds, 'otpuska', note) } })
    setPick(null)
  }

  return (
    <Card
      className="mt-4"
      dense
      flush
      title={t('Otpuska rejasi')} uz={'Otpuska rejasi'}
      icon={Plane}
      tile="purple"
      actions={
        !tq.readOnly && tq.ops.length > 0 ? (
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setAdding(true)}>
            {t("Otpuska qo'shish")}
          </Button>
        ) : undefined
      }
    >
      {leaves.length ? (
        <div className="scroll-thin overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky start-0 z-[2]">{t('Operator')}</th>
                <th className="hidden sm:table-cell">{t('Sanalar')}</th>
                <th className="hidden sm:table-cell">{t('Kunlar')}</th>
                <th className="hidden sm:table-cell">{t('Holat')}</th>
                {!tq.readOnly && <th className="text-end">{t('Amallar')}</th>}
              </tr>
            </thead>
            <tbody>
              {people.map((ls) => {
                const first = ls[0]!
                const ranges = allRanges(ls)
                const dayCount = t('{n} kun', { n: ls.reduce((n, l) => n + l.days.length, 0) })
                const notes = [...new Set(ls.map((l) => l.note.trim()).filter(Boolean))].join(' · ')
                return (
                  <tr key={first.op.id}>
                    <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                      <OpCell op={first.op} sub={notes || first.op.sub} />
                      <div className="mt-1.5 sm:hidden">
                        <p className="text-[0.875rem] font-semibold text-ink">{ranges}</p>
                        <p className="text-[0.75rem] text-ink-2">
                          {dayCount} · {statusText(ls)}
                        </p>
                      </div>
                    </td>
                    <td className="hidden font-semibold text-ink sm:table-cell">{ranges}</td>
                    <td className="num hidden whitespace-nowrap sm:table-cell">{dayCount}</td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={first.from <= today ? 'accent' : 'neutral'}>{statusText(ls)}</Badge>
                    </td>
                    {!tq.readOnly && (
                      <td className="text-end">
                        {ls.length === 1 ? (
                          <Button size="sm" variant="ghost" onClick={() => setPick(first)}>
                            {t('Bekor qilish')}
                          </Button>
                        ) : (
                          <DropMenu
                            trigger={
                              <Button size="sm" variant="ghost">
                                {t('Bekor qilish')}
                              </Button>
                            }
                            items={ls.map((l) => ({ label: rangeText(l), icon: Plane, onSelect: () => setPick(l) }))}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-8 text-center text-[0.9375rem] text-ink-3">{t("Hozircha otpuska yo'q")}</p>
      )}

      <Modal
        open={!!pick}
        onOpenChange={(v) => !v && setPick(null)}
        width={420}
        title={t('Otpuskani bekor qilish?')}
        subtitle={pick ? rangeText(pick) : undefined}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setPick(null)}>
              {t('Ortga')}
            </Button>
            <Button size="sm" variant="primary" onClick={cancel}>
              {t("Ha, ishga qo'yish")}
            </Button>
          </>
        }
      >
        {pick && (
          <div className="rounded-[14px] bg-surface-2 p-3">
            <OpCell op={pick.op} size={34} sub={pick.note.trim() || t('{n} kun', { n: pick.days.length })} />
          </div>
        )}
      </Modal>

      <Sheet open={adding} onOpenChange={setAdding} width={460} title={t("Otpuska qo'shish")}>
        {adding && (
          <OtpuskaForm
            tq={tq}
            today={today}
            onClose={() => setAdding(false)}
            onSave={(op, days, note) => {
              tq.addOff(op.id, days, 'otpuska', note)
              toast(`${t('Saqlandi')} · ${t('Otpuska kunlari belgilandi')}`)
              setAdding(false)
            }}
          />
        )}
      </Sheet>
    </Card>
  )
}

function OtpuskaForm({ tq, today, onClose, onSave }: { tq: Tq; today: string; onClose: () => void; onSave: (op: Op, days: string[], note: string) => void }) {
  const { t, lang } = useT()
  const { ops } = tq
  const [who, setWho] = useState<string | null>(ops.length === 1 ? ops[0]!.id : null)
  const [mode, setMode] = useState<'range' | 'days'>('range')
  const [picked, setPicked] = useState<string[]>([])
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [note, setNote] = useState('')
  const op = ops.find((o) => o.id === who)
  const taken = (day: string) => !!op && tq.offEntry(op.id, day)?.kind === 'otpuska'

  const base = dateOf(today)
  const y = new Date(base.getFullYear(), base.getMonth() + offset, 1).getFullYear()
  const m = new Date(base.getFullYear(), base.getMonth() + offset, 1).getMonth()
  const n = new Date(y, m + 1, 0).getDate()
  // Monday first: the empty places before the 1st
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = Array.from({ length: n }, (_, i) => dayKey(new Date(y, m, i + 1).getTime()))

  // what can be chosen: not past, not already this person's leave
  const usable = (from: string, to: string) => daysFromTo(from, to).filter((d) => d >= today && !taken(d))
  const chosen = picked.filter((d) => !taken(d))
  const preview = mode === 'range' && anchor && hover ? usable(anchor < hover ? anchor : hover, anchor < hover ? hover : anchor) : []

  const click = (day: string) => {
    if (mode === 'days') {
      setPicked((p) => (p.includes(day) ? p.filter((x) => x !== day) : [...p, day]))
      return
    }
    if (!anchor) {
      setAnchor(day)
      return
    }
    const add = usable(anchor < day ? anchor : day, anchor < day ? day : anchor)
    setPicked((p) => [...new Set([...p, ...add])])
    setAnchor(null)
    setHover(null)
  }

  const short = (day: string) => dayMonth(day, lang, t)
  const summary = runsOfDays(chosen)
    .map(([a, b]) => (a === b ? short(a) : dateOf(a).getMonth() === dateOf(b).getMonth() ? `${dateOf(a).getDate()} – ${short(b)}` : `${short(a)} – ${short(b)}`))
    .join(', ')

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('Operator')}>
        {ops.map((o) => {
          const on = o.id === who
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setWho(o.id)}
              className={cx(
                'pressable inline-flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-[0.875rem] font-medium transition-colors',
                on ? 'border-transparent bg-[var(--chart-3)] text-white' : 'border-line text-ink hover:bg-surface-2',
              )}
            >
              <Avatar name={o.name} hue={o.hue} size={26} />
              {o.name}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] bg-surface-2 p-3 sm:p-4">
        <Segmented<'range' | 'days'>
          size="xs"
          block
          label={t('Kunlarni tanlash')}
          value={mode}
          onChange={(v) => {
            setMode(v)
            setAnchor(null)
            setHover(null)
          }}
          options={[
            { value: 'range', label: t('Oraliq') },
            { value: 'days', label: t('Alohida kunlar') },
          ]}
        />
        <div className="flex items-center justify-between">
          <button type="button" aria-label={t('Oldingi oy')} disabled={offset <= 0} onClick={() => setOffset((o) => o - 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface disabled:opacity-30">
            <ChevronLeft size={17} />
          </button>
          <span className="text-[0.9375rem] font-bold text-ink">
            {t(MONTHS[m]!)} {y}
          </span>
          <button type="button" aria-label={t('Keyingi oy')} onClick={() => setOffset((o) => o + 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface">
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1" onPointerLeave={() => setHover(null)}>
          {WEEK_ORDER.map((d) => (
            <span key={d} className="pb-1 text-center text-[0.6875rem] font-semibold text-ink-3 uppercase">
              {t(SHORT_DAYS[d]!)}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {days.map((k) => {
            const num = Number(k.slice(8))
            const past = k < today
            const had = taken(k)
            const on = chosen.includes(k) || k === anchor
            const near = preview.includes(k)
            return (
              <button
                key={k}
                type="button"
                disabled={past || had}
                aria-pressed={on}
                aria-label={short(k)}
                onClick={() => click(k)}
                onPointerEnter={() => setHover(k)}
                className={cx(
                  'num mx-auto grid h-10 w-10 place-items-center rounded-full text-[0.9375rem] font-semibold transition-colors',
                  past && 'text-ink-3/50',
                  had && 'bg-[color-mix(in_srgb,var(--chart-3)_22%,transparent)] text-[var(--chart-3)]',
                  !past && !had && !on && !near && 'text-ink hover:bg-surface',
                  near && !on && 'bg-[color-mix(in_srgb,var(--chart-3)_30%,transparent)] text-ink',
                  on && 'bg-[var(--chart-3)] text-white shadow-sm',
                  k === today && !on && 'ring-2 ring-inset ring-primary',
                )}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-[0.9375rem] text-ink">
            <b className="font-bold">{t('{n} kun', { n: chosen.length })}</b> · {summary}
          </p>
          <button
            type="button"
            onClick={() => {
              setPicked([])
              setAnchor(null)
            }}
            className="pressable shrink-0 rounded-full px-2.5 py-1 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft"
          >
            {t('Tozalash')}
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] font-semibold text-ink-2">{t('Izoh (ixtiyoriy)')}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Masalan: Yillik otpuska')} rows={2} className="field rounded-[14px] px-3.5 py-2.5 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none" />
      </label>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('Bekor qilish')}
        </Button>
        <Button size="sm" variant="primary" disabled={!op || !chosen.length} onClick={() => op && onSave(op, [...chosen].sort(), note)}>
          {t("Otpuska qo'shish")}
        </Button>
      </div>
    </div>
  )
}
