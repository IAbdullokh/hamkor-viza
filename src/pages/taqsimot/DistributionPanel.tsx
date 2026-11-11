import { useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, Clock, CloudOff, FlaskConical, Inbox, Plus, Power, RefreshCw, Search, Shuffle, UserRound, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { useDb } from '@/data/db'
import type { Staff } from '@/data/types'
import { ApiError, putDistribution, type DistributionEntry, type DistributionMode, type DistributionSettings } from '@/features/projects/api'
import { Avatar, Segmented } from '@/ui/glass'
import { Badge, Card } from '@/ui/controls'
import { useToast } from '@/ui/overlay'
import { CrmLink } from '@/kit/CrmLink'

/**
 * «Avtomatik taqsimot» (owner, 2026-11-03: "a lead that comes on Main goes to an operator; a switch here only, nicely
 * illustrated; operators added with a button, never asked again; hours changeable, 9:00–18:00 by default"). The switch is
 * O'chiq / Sinov / Yoqilgan: Sinov decides and lists who each lead would go to without touching Bitrix24. The rules run
 * every minute on the dashboard's own publishing server, never on Studio (owner, 2026-11-03: "it should work without
 * Studio on its own server; if it isn't published we warn and it stays off") — apps/api …/Distribution/LeadDistributor.cs.
 */
export function DistributionPanel({
  slug,
  settings,
  log,
  published,
  reached,
  pending,
  onSaved,
  onReload,
}: {
  slug: string
  settings: DistributionSettings
  log: DistributionEntry[]
  published: boolean
  reached: boolean
  /** the server still runs with other settings: the last change did not reach it */
  pending: boolean
  onSaved: (s: DistributionSettings) => void
  onReload: () => void
}) {
  const { t } = useT()
  const toast = useToast()
  const db = useDb()
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState<'op' | 'main' | null>(null)
  const nameOf = useMemo(() => new Map(db.staff.map((s) => [s.id, s])), [db])
  const label = (id: string) => nameOf.get(id)?.name ?? `#${id}`

  const save = async (next: DistributionSettings) => {
    setBusy(true)
    try {
      onSaved(await putDistribution(slug, next))
    } catch (e) {
      const code = e instanceof ApiError ? e.code : ''
      toast(
        code === 'VALIDATION'
          ? t('Avval «Main» foydalanuvchini va kamida bitta operatorni tanlang')
          : code === 'NOT_PUBLISHED'
            ? t('Avval dashbordni nashr qiling — taqsimot uning serverida ishlaydi')
            : code === 'NOT_SYNCED'
              ? t("Dashbord serveriga yetib bo'lmadi — qayta urinib ko'ring")
              : t("Saqlab bo'lmadi — qayta urinib ko'ring"),
        'error',
      )
      onReload() // what was really kept
    } finally {
      setBusy(false)
    }
  }
  const setMode = (mode: DistributionMode) =>
    !published && mode !== 'off' ? toast(t('Avval dashbordni nashr qiling — taqsimot uning serverida ishlaydi'), 'error') : void save({ ...settings, mode })
  const toggleOp = (id: string) =>
    void save({
      ...settings,
      operatorIds: settings.operatorIds.includes(id) ? settings.operatorIds.filter((x) => x !== id) : [...settings.operatorIds, id],
    })
  const toggleMain = (id: string) =>
    void save({
      ...settings,
      mainUserIds: settings.mainUserIds.includes(id) ? settings.mainUserIds.filter((x) => x !== id) : [...settings.mainUserIds, id],
      operatorIds: settings.operatorIds.filter((x) => x !== id),
    })
  const setHours = (startHour: number, endHour: number) => startHour < endHour && void save({ ...settings, startHour, endHour })

  const on = settings.mode !== 'off'
  const today = new Date().toDateString()
  const todays = log.filter((e) => new Date(e.at).toDateString() === today)
  const failed = (e: DistributionEntry) => e.why === 'failed'
  const handed = todays.filter((e) => !failed(e)).length
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  // the server passes every minute: no pass for 3 minutes since the last one (or since switching on) = it has stopped
  const now = Date.now()
  const lastRun = settings.lastRunAt ? Date.parse(settings.lastRunAt) : null
  const since = settings.onSince ? Date.parse(settings.onSince) : null
  const ref = Math.max(lastRun ?? 0, since ?? 0)
  const stalled = on && published && reached && ref > 0 && now - ref > STALL_MS
  // Tashkent (UTC+5): outside the hours the leads wait on Main until they start
  const tkHour = (new Date(now).getUTCHours() + 5) % 24
  const closed = on && (tkHour < settings.startHour || tkHour >= settings.endHour)

  return (
    <Card className="mb-4 overflow-hidden" flush>
      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center">
        {/* the picture: a lead arrives on Main and is handed to the operators */}
        <div aria-hidden className="flex shrink-0 items-center gap-2 self-center rounded-[22px] bg-surface-2 px-4 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
            <Inbox size={20} />
          </span>
          <ArrowRight size={16} className={cx('text-ink-3', on && 'text-primary-strong')} />
          <span
            className={cx(
              'grid h-11 w-11 place-items-center rounded-2xl transition-colors',
              on ? 'bg-primary-fill text-white shadow-[0_8px_18px_-10px_var(--primary)]' : 'bg-surface text-ink-3',
            )}
          >
            <Shuffle size={20} />
          </span>
          <ArrowRight size={16} className={cx('text-ink-3', on && 'text-primary-strong')} />
          <span className="flex -space-x-2">
            {(settings.operatorIds.length ? settings.operatorIds : ['?', '?', '?']).slice(0, 4).map((id, i) =>
              nameOf.get(id) ? (
                <span key={id} className="rounded-full ring-2 ring-[var(--surface)]">
                  <Avatar name={label(id)} hue={nameOf.get(id)!.hue} size={30} />
                </span>
              ) : (
                <span key={i} className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface text-ink-3 ring-2 ring-[var(--surface)]">
                  <UserRound size={14} />
                </span>
              ),
            )}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.0625rem] font-bold text-ink">{t('Avtomatik taqsimot')}</h3>
            {settings.mode === 'on' ? (
              <Badge tone="good">{t('Yoqilgan')}</Badge>
            ) : settings.mode === 'test' ? (
              <Badge tone="warn">{t('Sinov rejimi')}</Badge>
            ) : (
              <Badge>{t("O'chiq")}</Badge>
            )}
          </div>
          <p className="text-[0.875rem] text-ink-2">
            {settings.mode === 'on'
              ? t("{main} ga tushgan yangi lidlar {n} ta operatorga foiz bo'yicha beriladi", {
                  main: settings.mainUserIds.map(label).join(', ') || '—',
                  n: settings.operatorIds.length,
                })
              : settings.mode === 'test'
                ? t("Bitrix24 ga hech narsa yozilmaydi — har bir lid kimga tushishi pastda ko'rinadi")
                : t('Lidlar Bitrix24 dagidek qoladi')}
          </p>
          {on && lastRun !== null && (
            <p className="num text-[0.75rem] text-ink-3">{t('Oxirgi ishlagan {time}', { time: new Date(lastRun).toTimeString().slice(0, 5) })}</p>
          )}
        </div>

        <div className={cx(!published && 'opacity-50')} aria-disabled={!published || undefined}>
          <Segmented<DistributionMode>
            size="sm"
            label={t('Avtomatik taqsimot')}
            value={settings.mode}
            onChange={setMode}
            options={[
              { value: 'off', label: t("O'chiq"), icon: Power },
              { value: 'test', label: t('Sinov'), icon: FlaskConical },
              { value: 'on', label: t('Yoqilgan'), icon: Shuffle },
            ]}
          />
        </div>
      </div>

      {!published ? (
        <p role="status" className="mx-4 mb-4 flex items-start gap-2 rounded-[14px] bg-warn-soft px-3 py-2 text-[0.8125rem] text-warn sm:mx-5">
          <CloudOff aria-hidden size={16} className="mt-0.5 shrink-0" /> {t('Avval dashbordni nashr qiling — taqsimot uning serverida ishlaydi')}
        </p>
      ) : (
        !reached && (
          <p role="status" className="mx-4 mb-4 flex items-start gap-2 rounded-[14px] bg-warn-soft px-3 py-2 text-[0.8125rem] text-warn sm:mx-5">
            <CloudOff aria-hidden size={16} className="mt-0.5 shrink-0" /> {t('Dashbord serveri hozir javob bermayapti')}
          </p>
        )
      )}

      {pending && (
        <p role="alert" className="mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-[14px] bg-warn-soft px-3 py-2 text-[0.8125rem] text-warn sm:mx-5">
          <CloudOff aria-hidden size={16} className="shrink-0" /> <span className="min-w-0 flex-1">{t("Serverga yetkazilmadi — qayta urinib ko'ring")}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(settings)}
            className="pressable inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold hover:bg-[rgb(var(--card-rgb)/0.6)] disabled:opacity-50"
          >
            <RefreshCw aria-hidden size={13} /> {t('Qayta yuborish')}
          </button>
        </p>
      )}

      {stalled && (
        <p role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-[14px] bg-warn-soft px-3 py-2 text-[0.8125rem] text-warn sm:mx-5">
          <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />{' '}
          {lastRun !== null
            ? t("Taqsimot to'xtab qolgan — oxirgi marta {time} da ishlagan", { time: new Date(lastRun).toTimeString().slice(0, 5) })
            : t('Taqsimot hali bir marta ham ishlamadi')}
        </p>
      )}

      {closed && !settings.lastError && (
        <p role="status" className="mx-4 mb-4 flex items-start gap-2 rounded-[14px] bg-surface-2 px-3 py-2 text-[0.8125rem] text-ink-2 sm:mx-5">
          <Clock aria-hidden size={16} className="mt-0.5 shrink-0" /> {t('Ish vaqti emas — lidlar {h} da beriladi', { h: hh(settings.startHour) })}
        </p>
      )}

      {settings.lastError && (
        <p role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-[14px] bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger sm:mx-5">
          <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" /> {t(settings.lastError)}
        </p>
      )}

      <div className="grid gap-4 border-t border-line p-4 sm:p-5 lg:grid-cols-[1fr_1.4fr_auto]">
        {/* Main */}
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="text-[0.75rem] font-semibold tracking-wide text-ink-3 uppercase">{t('Yangi lidlar tushadigan foydalanuvchi')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {settings.mainUserIds.map((id) => (
              <PersonChip key={id} name={label(id)} hue={nameOf.get(id)?.hue} onRemove={busy ? undefined : () => toggleMain(id)} />
            ))}
            <AddButton busy={busy} onClick={() => setAdding(adding === 'main' ? null : 'main')} label={settings.mainUserIds.length ? t("O'zgartirish") : t('Tanlash')} />
          </div>
          {adding === 'main' && <Picker staff={db.staff} exclude={settings.mainUserIds} onPick={(id) => (toggleMain(id), setAdding(null))} />}
        </section>

        {/* operators */}
        <section className="flex min-w-0 flex-col gap-2">
          <h4 className="text-[0.75rem] font-semibold tracking-wide text-ink-3 uppercase">
            {t('Operatorlar')} · {settings.operatorIds.length}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {settings.operatorIds.map((id) => (
              <PersonChip key={id} name={label(id)} hue={nameOf.get(id)?.hue} onRemove={busy ? undefined : () => toggleOp(id)} />
            ))}
            <AddButton busy={busy} onClick={() => setAdding(adding === 'op' ? null : 'op')} label={t("Operator qo'shish")} />
          </div>
          {adding === 'op' && <Picker staff={db.staff} exclude={[...settings.operatorIds, ...settings.mainUserIds]} onPick={(id) => (toggleOp(id), setAdding(null))} />}
        </section>

        {/* hours */}
        <section className="flex flex-col gap-2">
          <h4 className="text-[0.75rem] font-semibold tracking-wide text-ink-3 uppercase">{t('Ish vaqti')}</h4>
          <div className="flex items-center gap-1.5">
            <HourSelect value={settings.startHour} max={settings.endHour - 1} min={0} disabled={busy} onChange={(h) => setHours(h, settings.endHour)} />
            <span className="text-ink-3">–</span>
            <HourSelect value={settings.endHour} min={settings.startHour + 1} max={24} disabled={busy} onChange={(h) => setHours(settings.startHour, h)} />
          </div>
          <p className="text-[0.75rem] text-ink-3">
            {t('{h} dan keyingi lidlar — ertangi jamoaga', {
              h: hh(settings.endHour),
            })}
          </p>
        </section>
      </div>

      {on && (
        <div className="border-t border-line">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 sm:px-5">
            <h4 className="text-[0.875rem] font-semibold text-ink">{settings.mode === 'test' ? t('Bugun kimga tushardi') : t('Bugun taqsimlangan lidlar')}</h4>
            <span className="num text-[0.8125rem] text-ink-3">{handed}</span>
          </div>
          {todays.length === 0 ? (
            <p className="px-4 pb-4 text-[0.8125rem] text-ink-3 sm:px-5">{t('Hali yangi lid kelmadi')}</p>
          ) : (
            <ul className="scroll-thin flex max-h-[260px] flex-col divide-y divide-line overflow-y-auto">
              {todays.map((e) => (
                <li key={`${e.leadId}:${e.at}`} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                  <span className="num w-12 shrink-0 text-[0.8125rem] text-ink-3">{new Date(e.at).toTimeString().slice(0, 5)}</span>
                  <CrmLink kind="lead" id={e.leadId} className="shrink-0" />
                  <ArrowRight aria-hidden size={14} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">{e.operatorId ? label(e.operatorId) : '—'}</span>
                  {failed(e) ? (
                    <Badge tone="bad">{t('Bitrix qabul qilmadi')}</Badge>
                  ) : e.why === 'returning' ? (
                    <Badge tone="accent">{t('Eski mijozi')}</Badge>
                  ) : (
                    <Badge>{t("Foiz bo'yicha")}</Badge>
                  )}
                  {e.test && <Badge tone="warn">{t('Sinov')}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

const STALL_MS = 3 * 60_000

/** the people to pick from, searchable: never someone who left, nor «Mas'ul yo'q» (id 0, nobody) */
function Picker({ staff, exclude, onPick }: { staff: Staff[]; exclude: string[]; onPick: (id: string) => void }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const people = staff.filter((s) => !s.fired && s.id !== '0' && !exclude.includes(s.id) && s.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="glass flex flex-col gap-1 rounded-[16px] p-2">
      <label className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-1.5">
        <Search aria-hidden size={14} className="text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Qidirish')}
          className="min-w-0 flex-1 bg-transparent text-[0.875rem] text-ink outline-none"
        />
      </label>
      <ul className="scroll-thin flex max-h-[200px] flex-col overflow-y-auto">
        {people.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s.id)} className="pressable flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-start hover:bg-surface-2">
              <Avatar name={s.name} hue={s.hue} size={24} />
              <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">{s.name}</span>
              {s.sales && <Badge>{t('Menejer')}</Badge>}
            </button>
          </li>
        ))}
        {people.length === 0 && <li className="px-2 py-2 text-[0.8125rem] text-ink-3">{t('Hech kim topilmadi')}</li>}
      </ul>
    </div>
  )
}

function PersonChip({ name, hue, onRemove }: { name: string; hue?: number; onRemove?: () => void }) {
  const { t } = useT()
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 py-1 ps-1 pe-1.5 text-[0.8125rem] font-medium text-ink">
      <Avatar name={name} hue={hue} size={22} />
      <span className="max-w-[160px] truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={t('Olib tashlash')}
          onClick={onRemove}
          className="pressable grid h-5 w-5 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}

function AddButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="pressable inline-flex items-center gap-1 rounded-full border border-dashed border-[rgb(var(--accent-rgb)/0.45)] px-3 py-1 text-[0.8125rem] font-semibold text-primary-strong hover:bg-primary-soft disabled:opacity-50"
    >
      <Plus size={13} /> {label}
    </button>
  )
}

function HourSelect({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange: (h: number) => void; disabled: boolean }) {
  const { t } = useT()
  return (
    <select
      aria-label={t('Soat')}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="num rounded-[10px] border border-[var(--border)] bg-surface px-2 py-1.5 text-[0.875rem] font-semibold text-ink"
    >
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  )
}
