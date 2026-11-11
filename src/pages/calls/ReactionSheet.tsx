import { useMemo, useState } from 'react'
import { Hourglass, PhoneIncoming, PhoneMissed, UserPlus } from 'lucide-react'
import { useT } from '@/i18n'
import { fmtNum } from '@/lib/format'
import { useMeta } from '@/data/source'
import type { Call, Lead } from '@/data/types'
import { Segmented } from '@/ui/glass'
import { Sheet } from '@/ui/overlay'
import { CALLBACK_BANDS, PICKUP_BANDS, fmtDT, speedOf, type Speed, type UncalledLead, type Wait } from './calc'

type Kind = 'pickup' | 'callback' | 'lead'

/**
 * «Reaksiya vaqti», opened from its card only (owner, 2026-11-03: "three kinds of reaction time, shown when I press it"):
 *  - Javob berish — the client called and waited until someone picked up (answered incoming calls)
 *  - Qayta qo'ng'iroq — a missed call until we called that client back
 *  - Yangi lid — a new lead (not from a call) until our first call to it
 * Each shows the median (half of the cases were faster), how the waits spread over speed bands, and each operator.
 */
export function ReactionSheet({
  open,
  onClose,
  pickup,
  callback,
  lead,
  onCalls,
  onUncalled,
}: {
  open: boolean
  onClose: () => void
  pickup: Wait[]
  callback: Wait[]
  lead: { waits: Wait[]; notCalled: number; leads: number; uncalled: UncalledLead<Lead>[] }
  onCalls: (title: string, calls: Call[]) => void
  /** the leads nobody called yet, each with the calls found for it anyway */
  onUncalled: (rows: UncalledLead<Lead>[]) => void
}) {
  const { t } = useT()
  const { sources } = useMeta()
  const [kind, setKind] = useState<Kind>('callback')
  const speeds = useMemo(
    () => ({
      pickup: speedOf(pickup, PICKUP_BANDS),
      callback: speedOf(callback, CALLBACK_BANDS),
      lead: speedOf(lead.waits, CALLBACK_BANDS),
    }),
    [pickup, callback, lead],
  )
  const s = speeds[kind]
  const what = {
    pickup: {
      icon: PhoneIncoming,
      title: 'Javob berish tezligi',
      // only Bitrix24's own telephony lacks the ringing time; a PBX gives it, so an empty list there just means no such call
      empty:
        sources.telephony === 'bitrix'
          ? 'Bu telefoniya mijoz qancha kutganini bermaydi (Bitrix24 faqat suhbat vaqtini beradi)'
          : "Davrda kutish vaqti ma'lum javob berilgan kiruvchi qo'ng'iroq yo'q",
    },
    callback: {
      icon: PhoneMissed,
      title: "O'tkazib yuborilganga qaytish",
      empty: "Davrda qaytib qo'ng'iroq qilingan o'tkazib yuborilgan qo'ng'iroq yo'q",
    },
    lead: {
      icon: UserPlus,
      title: "Yangi lidga birinchi qo'ng'iroq",
      empty: "Davrda qo'ng'iroq qilingan yangi lid yo'q",
    },
  }[kind]

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()} title={t('Reaksiya vaqti')} width={560}>
      <div className="flex flex-col gap-5 px-5 py-5">
        <Segmented<Kind>
          size="sm"
          block
          label={t('Reaksiya vaqti')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'pickup', label: t('Javob berish'), icon: PhoneIncoming },
            {
              value: 'callback',
              label: t("Qayta qo'ng'iroq"),
              icon: PhoneMissed,
            },
            { value: 'lead', label: t('Yangi lid'), icon: UserPlus },
          ]}
        />

        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
            <what.icon size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{t(what.title)}</p>
            <p className="num mt-1 text-[2rem] leading-none font-bold tracking-[-0.02em] text-ink">{s.median == null ? '—' : human(t, s.median)}</p>
            <p className="mt-1 text-[0.8125rem] text-ink-3">
              {s.median == null
                ? t(what.empty)
                : // the median only: a few very late cases pull an average far off (owner, 2026-11-09: "we have outliers")
                  t('Yarmi shundan tezroq · {n} ta holat', { n: fmtNum(s.waits.length, 0) })}
            </p>
            {kind === 'lead' && lead.notCalled > 0 && (
              <button
                type="button"
                onClick={() => onUncalled(lead.uncalled)}
                className="pressable mt-2 inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-[0.75rem] font-semibold text-danger hover:underline"
                data-testid="reaction-uncalled"
              >
                {t("{n} ta lidga hali qo'ng'iroq qilinmagan", {
                  n: fmtNum(lead.notCalled, 0),
                })}
              </button>
            )}
          </div>
        </div>

        {s.waits.length > 0 && (
          <>
            <Bands s={s} onPick={(key, calls) => onCalls(`${t(what.title)} — ${t(key)}`, calls)} kind={kind} />
            <section className="flex flex-col gap-1">
              <h4 className="text-[0.75rem] font-semibold tracking-wide text-ink-3 uppercase">{t('Operatorlar')}</h4>
              <ul className="flex flex-col divide-y divide-line">
                {s.byOperator.map((o) => (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() =>
                        onCalls(
                          `${o.name} — ${t(what.title)}`,
                          s.waits.filter((w) => w.who === o.name).map((w) => w.call),
                        )
                      }
                      className="pressable flex w-full items-center gap-3 px-1 py-2 text-start hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">{o.name}</span>
                      <span className="num text-[0.75rem] text-ink-3">{t('{n} ta', { n: o.count })}</span>
                      <span className="num w-36 text-end text-[0.875rem] font-semibold whitespace-nowrap text-ink">{o.median == null ? '—' : human(t, o.median)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <p className="flex items-center gap-1.5 text-[0.75rem] text-ink-3">
              <Hourglass size={13} aria-hidden /> {t('Oxirgisi')}: <span className="num">{fmtDT(Math.max(...s.waits.map((w) => w.call.ts)))}</span>
            </p>
          </>
        )}
      </div>
    </Sheet>
  )
}

/** the waits over the speed bands: the faster bands green, the slow ones warm */
function Bands({ s, onPick, kind }: { s: Speed; onPick: (key: string, calls: Call[]) => void; kind: Kind }) {
  const { t } = useT()
  const max = Math.max(1, ...s.bands.map((b) => b.count))
  const edges = kind === 'pickup' ? PICKUP_BANDS : CALLBACK_BANDS
  // fastest → slowest: green, light green, yellow, orange, red
  const tone = ['#22c55e', '#86d99a', '#eab308', '#f97316', '#ef4444']
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-[0.75rem] font-semibold tracking-wide text-ink-3 uppercase">{t('Tezlik')}</h4>
      {s.bands.map((b, i) => (
        <button
          key={b.key}
          type="button"
          disabled={b.count === 0}
          onClick={() =>
            onPick(
              b.key,
              s.waits.filter((w) => w.sec >= (i ? edges[i - 1]!.max : 0) && w.sec < edges[i]!.max).map((w) => w.call),
            )
          }
          className="pressable group flex items-center gap-3 rounded-[10px] px-1 py-1 text-start enabled:hover:bg-surface-2 disabled:opacity-60"
        >
          <span className="w-32 shrink-0 text-[0.8125rem] text-ink-2">{t(b.key)}</span>
          <span className="relative h-5 flex-1 overflow-hidden rounded-[6px] bg-surface-2">
            <span className="absolute inset-y-0 start-0 rounded-[6px] transition-[width]" style={{ width: `${(b.count / max) * 100}%`, background: tone[i] }} />
          </span>
          <span className="num w-10 text-end text-[0.8125rem] font-semibold text-ink">{fmtNum(b.count, 0)}</span>
        </button>
      ))}
    </section>
  )
}

/** "45 soniya" / "7 daqiqa" / "2 soat 10 daqiqa" / "3 kun" */
function human(t: (uz: string, v?: Record<string, string | number>) => string, sec: number): string {
  const s = Math.round(sec)
  if (s < 60) return t('{n} soniya', { n: s })
  const m = Math.round(s / 60)
  if (m < 60) return t('{n} daqiqa', { n: m })
  const h = Math.floor(m / 60)
  if (h < 48) return m % 60 ? t('{h} soat {m} daqiqa', { h, m: m % 60 }) : t('{n} soat', { n: h })
  return t('{n} kun', { n: Math.round(h / 24) })
}
