import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Info, TriangleAlert, UserCheck, Users, UserX } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { dayKey } from '@/data/range'
import { Button, Card, TextField } from '@/ui/controls'
import { StatCard } from '@/ui/glass'
import { Modal, useToast } from '@/ui/overlay'
import { CELL, HATCH, Hint, OpCell, Swatch } from './shared'
import { FULL_DAYS, MONTHS, SHORT_DAYS, offText, type OffEntry, type Op, type Tq } from './store'

interface Confirm {
  op: Op
  day: string
  label: string
  isToday: boolean
  action: 'add' | 'remove'
  entry: OffEntry | null
}

export function KunlikTab({ tq, now }: { tq: Tq; now: number }) {
  const { t } = useT()
  const toast = useToast()
  const [week, setWeek] = useState(0)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [note, setNote] = useState('')
  const today = dayKey(now)

  const dates = useMemo(() => {
    const d = new Date(now)
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + week * 7)
    return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
  }, [now, week])

  const stats = useMemo(() => {
    const off = tq.ops.filter((op) => tq.isOff(op, today)).length
    return { working: tq.ops.length - off, off, total: tq.ops.length }
  }, [tq, today])

  const M = (d: Date) => t(MONTHS[d.getMonth()]!)
  const weekLabel = (() => {
    const a = dates[0]!
    const b = dates[6]!
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${M(a)}`
    return `${a.getDate()} ${M(a)} – ${b.getDate()} ${M(b)}`
  })()

  const open = (op: Op, d: Date, action: 'add' | 'remove') => {
    const day = dayKey(d.getTime())
    setConfirm({ op, day, label: `${t(FULL_DAYS[d.getDay()]!)}, ${d.getDate()} ${M(d)}`, isToday: day === today, action, entry: action === 'remove' ? tq.offEntry(op.id, day) : null })
    setNote('')
  }

  const doConfirm = () => {
    if (!confirm) return
    if (confirm.action === 'add') {
      tq.addOff(confirm.op.id, [confirm.day], 'istisno', note)
      toast(`${t('Saqlandi')} · ${t('{name} — istisno belgilandi', { name: confirm.op.name })}`)
    } else {
      tq.removeOff(confirm.op.id, confirm.day)
      toast(`${t('Qaytarildi')} · ${t('{name} — yana ishlaydi', { name: confirm.op.name })}`)
    }
    setConfirm(null)
  }

  const vac = confirm?.action === 'remove' && confirm.entry?.kind === 'otpuska'

  return (
    <>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t('Bugun ishlaydi')} uz={'Bugun ishlaydi'} value={stats.working} icon={UserCheck} tile="green" sub={t('{n} dan', { n: stats.total })} />
        <StatCard
          label={t('Bugun istisno')} uz={'Bugun istisno'}
          value={stats.off}
          icon={UserX}
          tile={stats.off > 0 ? 'orange' : 'green'}
          sub={stats.off > 0 ? t('Dam olish / istisno') : t('Barcha operatorlar ishlaydi')}
        />
        <StatCard className="col-span-2 sm:col-span-1" label={t('Jami operatorlar')} uz={'Jami operatorlar'} value={stats.total} icon={Users} tile="blue" sub={t('Faol operatorlar')} />
      </div>

      <Card
        className="mt-4"
        dense
        flush
        title={t('Kunlik jadval')} uz={'Kunlik jadval'}
        subtitle={<span className="hidden sm:inline">{t("Istalgan kunni bosib istisno qiling. Bugungi kunni istisno qilsangiz, lidlar boshqalarga o'tadi.")}</span>}
        icon={CalendarDays}
        tile="indigo"
      >
        <p className="px-4 pb-2 text-[0.8125rem] text-ink-2 sm:hidden">{t("Istalgan kunni bosib istisno qiling. Bugungi kunni istisno qilsangiz, lidlar boshqalarga o'tadi.")}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 pb-3 sm:px-5">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-ink-2">
            <Swatch cls={CELL.work} label={t('Ishlaydi')} />
            <Swatch cls={CELL.istisno} label={t('Istisno (kunlik)')} />
            <Swatch cls={CELL.otpuska} label={t('Otpuskada')} />
            <Swatch cls={CELL.weekly} hatch label={t('Dam olish (haftalik)')} />
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={t('Oldingi hafta')} onClick={() => setWeek((w) => w - 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setWeek(0)}
              className={cx('pressable rounded-full px-3 py-1 text-[0.8125rem] font-medium', week === 0 ? 'bg-primary-soft text-primary-strong' : 'text-ink-2 hover:bg-surface-2')}
            >
              {week === 0 ? t('Shu hafta') : weekLabel}
            </button>
            <button type="button" aria-label={t('Keyingi hafta')} onClick={() => setWeek((w) => w + 1)} className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="scroll-thin overflow-x-auto">
          <table className="data-table min-w-[640px] sm:min-w-[720px]">
            <thead>
              <tr>
                <th className="sticky start-0 z-[2] w-[150px] sm:w-[210px]">{t('Operator')}</th>
                {dates.map((d) => {
                  const isToday = dayKey(d.getTime()) === today
                  return (
                    <th key={d.getTime()} className={cx('!px-1.5 text-center', isToday && 'bg-[rgb(var(--accent-rgb)/0.07)]')}>
                      <div className="flex flex-col items-center gap-0.5 py-0.5">
                        <span className={cx('text-[0.625rem]', isToday && 'text-primary-strong')}>{t(SHORT_DAYS[d.getDay()]!)}</span>
                        <span className={cx('grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[0.9375rem] font-bold normal-case', isToday ? 'bg-primary-fill text-white' : 'text-ink-2')}>
                          {d.getDate()}
                        </span>
                        <span className={cx('text-[0.5625rem] normal-case', isToday ? 'font-semibold text-primary-strong' : 'font-normal')}>{isToday ? t('Bugun') : M(d).slice(0, 3)}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {tq.ops.map((op) => (
                <tr key={op.id}>
                  <td className="sticky start-0 z-[1] bg-[rgb(var(--card-rgb)/0.92)]">
                    <div className="max-w-[124px] sm:max-w-[200px]">
                      <OpCell op={op} sub={op.share > 0 ? `${op.share}%` : t('Sozlanmagan')} />
                    </div>
                  </td>
                  {dates.map((d) => {
                    const day = dayKey(d.getTime())
                    const isToday = day === today
                    const weekly = tq.isWeeklyOff(op, day)
                    const entry = tq.offEntry(op.id, day)
                    const daily = entry !== null
                    const vacation = entry?.kind === 'otpuska'
                    const past = day < today
                    const title =
                      weekly && !daily
                        ? t('{day} — haftalik dam olish', { day: t(FULL_DAYS[d.getDay()]!) })
                        : daily
                          ? `${vacation ? t('Otpuskada') : t('Istisno')}${entry.note ? ` — ${entry.note}` : ''}\n${t('Bosing — olib tashlash')}`
                          : t('Bosing — istisno belgilash')
                    return (
                      <td key={day} className={cx('!px-1.5 !py-1.5', isToday && 'bg-[rgb(var(--accent-rgb)/0.07)]')}>
                        <button
                          type="button"
                          title={title}
                          disabled={tq.readOnly || (weekly && !daily)}
                          onClick={() => open(op, d, daily ? 'remove' : 'add')}
                          style={weekly && !daily ? HATCH : undefined}
                          className={cx(
                            'group relative h-8 w-full rounded-full border text-[0.6875rem] font-medium transition-all active:scale-95',
                            weekly && !daily && cx(CELL.weekly, 'cursor-not-allowed'),
                            daily && cx(vacation ? CELL.otpuska : CELL.istisno, 'hover:brightness-110'),
                            !weekly && !daily && cx(CELL.work, past ? 'opacity-50 hover:opacity-75' : 'hover:border-[color-mix(in_srgb,var(--warm)_45%,transparent)] hover:bg-warm-soft'),
                          )}
                        >
                          {daily && <span className="block truncate px-1 text-[0.75rem] font-semibold">{vacation ? t('Otpuska') : t('Istisno')}</span>}
                          {weekly && !daily && <span className="block truncate px-1 text-[0.75rem] font-medium">{t('Dam')}</span>}
                          {!weekly && !daily && (
                            <span className="flex items-center justify-center">
                              <Check size={16} strokeWidth={2.75} className="transition-opacity group-hover:opacity-0" />
                              <UserX size={14} className="absolute text-warm opacity-0 transition-opacity group-hover:opacity-90" />
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {!tq.ops.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-3">
                    {t('Operatorlar topilmadi')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line bg-surface-2 px-4 py-3 text-[0.8125rem] sm:px-5">
          <span className="text-ink-3">
            {t('Bugun ishlaydi')}: <Hint tone="good">{stats.working}</Hint>
          </span>
          <span className="text-ink-3">
            {t('Bugun istisno')}: <span className={cx('font-semibold', stats.off > 0 ? 'text-warm' : 'text-ink-3')}>{stats.off}</span>
          </span>
          {week !== 0 && (
            <button type="button" onClick={() => setWeek(0)} className="inline-flex items-center gap-1 text-primary-strong hover:underline">
              <ArrowRight size={13} /> {t('Shu haftaga qaytish')}
            </button>
          )}
        </div>
      </Card>

      <Modal
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        width={400}
        title={confirm?.action === 'remove' ? (vac ? t('Otpuskani bekor qilish?') : t('Istisnoni bekor qilish?')) : t('Istisno belgilash')}
        subtitle={confirm?.label}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
              {t('Bekor qilish')}
            </Button>
            <Button size="sm" variant="primary" onClick={doConfirm}>
              {confirm?.action === 'remove' ? t("Ha, ishga qo'yish") : confirm?.isToday ? t('Istisno + qayta taqsimlash') : t('Istisno qilish')}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="flex flex-col gap-3">
            <div className="rounded-[14px] bg-surface-2 p-3">
              <OpCell op={confirm.op} size={34} sub={confirm.op.sub} />
            </div>
            {confirm.action === 'add' ? (
              <>
                <TextField label={t('Sabab (ixtiyoriy)')} placeholder={t('Masalan: kasallik, shaxsiy sabab...')} value={note} onChange={(e) => setNote(e.target.value)} />
                {confirm.isToday ? (
                  <p className="flex gap-2 rounded-[14px] bg-warm-soft p-3 text-[0.8125rem] text-warm">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    {t("Diqqat: Bu operator bugun ishlamaslik deb belgilanadi. Bugun unga taqsimlangan lidlar boshqa ishlaydigan operatorlarga avtomatik o'tkaziladi.")}
                  </p>
                ) : (
                  <p className="flex gap-2 rounded-[14px] bg-primary-soft p-3 text-[0.8125rem] text-primary-strong">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    {t('Bu operator shu kuni ishlamaslik deb belgilanadi. Shu kunga kelgan lidlar bu operatorga taqsimlanmaydi.')}
                  </p>
                )}
              </>
            ) : (
              <>
                {confirm.entry && (
                  <p className="text-[0.8125rem] text-ink-2">
                    {t('Sabab')}: <span className="text-ink">{offText(confirm.entry, t)}</span>
                  </p>
                )}
                <p className="text-[0.875rem] text-ink-2">
                  {vac ? t('Otpuska olib tashlanadi va shu kunda unga ham lid taqsimlanadi.') : t('Istisno olib tashlanadi va shu kunda unga ham lid taqsimlanadi.')}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
