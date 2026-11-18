import { RefreshCw } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { versionTime } from './refresh'

const LOCALE = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' } as const

/** "14:32" — the newer data's build time (with the day when it is not today) */
export function newDataTime(version: string, lang: keyof typeof LOCALE, now = Date.now()): string | null {
  const d = versionTime(version)
  if (!d) return null
  const sameDay = new Date(now).toDateString() === d.toDateString()
  return new Intl.DateTimeFormat(LOCALE[lang] ?? 'uz-UZ', sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
}

/**
 * «Yangi ma'lumot bor · 14:32 · Yangilash»: the server built newer numbers than the ones on screen. They show by
 * themselves at the next natural moment (live/refresh.ts), so this is only the "now" option: a small quiet pill at the top;
 * pressing it shows them in place (nothing closes, the filters stay). A real-time dashboard never shows it.
 */
export function NewDataPill({ version, busy, onApply }: { version: string; busy: boolean; onApply: () => void }) {
  const { t, lang } = useT()
  const at = newDataTime(version, lang as keyof typeof LOCALE)
  return (
    // a zero-height sticky row: it takes no room (nothing on the page moves when it appears) and stays at the top while
    // the page scrolls (just under the shell's sticky top bar, 68 px); it sits in the free middle of the filter row below the title
    <div className="pointer-events-none sticky top-[76px] z-30 flex h-0 justify-center overflow-visible px-4" role="status" aria-live="polite">
      <button
        type="button"
        onClick={onApply}
        disabled={busy}
        aria-busy={busy}
        data-new-data
        className="glass pressable pointer-events-auto inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full px-3 text-[0.8125rem] text-ink-3 opacity-90 shadow-[0_2px_10px_rgb(0_0_0/0.06)] hover:opacity-100"
      >
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <span className="truncate">
          {t("Yangi ma'lumot bor")}
          {at && <span> · {at}</span>}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary-strong">
          <RefreshCw aria-hidden size={12} className={cx(busy && 'animate-spin')} />
          {t('Yangilash')}
        </span>
      </button>
    </div>
  )
}
