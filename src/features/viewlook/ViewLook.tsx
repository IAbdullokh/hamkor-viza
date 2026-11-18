import { useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, Monitor, Moon, Palette, RotateCcw, Sun, type LucideIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { PAGE_BGS, type PageBg } from '@/lib/pageBg'
import { useSettings } from '@/lib/settings'
import {
  bgForTheme,
  cardPatch,
  CARD_STYLES,
  effectsOn,
  fxPatch,
  isEmptyLook,
  resetViewLook,
  updateViewLook,
  useDeviceReducedMotion,
  useViewLook,
  type CardStyle,
  type ViewTheme,
} from '@/lib/viewLook'
import { useResolvedTheme } from '@/shell/ThemeController'
import { SWATCH, useBgControl, type BgControl } from '@/features/pagebg/PageBg'
import { AccentPicker } from '@/ui/glass'
import { Switch } from '@/ui/controls'
import { useDesign } from '@/lib/design'
import { Pop, Sheet } from '@/ui/overlay'
import { DesignTiles, LookDesignCtx } from './DesignTiles'
import './viewlook.css'

/**
 * "Ko'rinish" (owner 2026-10-26: "not every person likes white, not every person likes dark — there should be a button on
 * the dashboard itself, at the right edge of the filter section, and they should be able to change it"): every viewer of
 * a dashboard — the public-link ones too — picks their own Fon (Liquid / Oq / Kulrang / Qorong'i), Mavzu (Yorug' /
 * Qorong'i / Tizim), Rang, Kartalar (Shisha / Oddiy / Chiziqli), Effektlar (blur, orbs and motion on / off — calmer
 * and faster on a weak laptop or phone; off by default where the device asks for less motion — it takes the orbs / sky
 * behind the page too, so there is no separate "Fon effektlari", owner 2026-11-03) and Dizayn (the dashboard's look, DesignTiles). It is kept only in their browser (lib/viewLook) and sits over the owner's defaults;
 * "Asl holiga" goes back to them. The owner's default for everyone stays "Fon ▾" in the edit bar (features/pagebg).
 *
 * It sits at the right end of the filter section (livefilters/FilterSection, where="bar"); a page with no filter section
 * (Hisobot, Reja) shows it in the page header instead (where="header").
 */

let barCount = 0
const barListeners = new Set<() => void>()
const subscribeBar = (l: () => void) => {
  barListeners.add(l)
  return () => barListeners.delete(l)
}
const getBarCount = () => barCount

const PHONE = '(max-width: 639px)'
function subscribePhone(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(PHONE)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
const isPhone = () => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE).matches

export function ViewLookButton({ where }: { where: 'bar' | 'header' }) {
  const c = useBgControl()
  const inBar = useSyncExternalStore(subscribeBar, getBarCount, () => 0) > 0
  // the filter section's button counts itself, so the header one steps aside while a filter section is on the page
  useEffect(() => {
    if (where !== 'bar') return
    barCount++
    barListeners.forEach((l) => l())
    return () => {
      barCount--
      barListeners.forEach((l) => l())
    }
  }, [where])
  if (!c || (where === 'header' && inBar)) return null
  return <LookControl c={c} />
}

function LookControl({ c }: { c: BgControl }) {
  const { t } = useT()
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const [open, setOpen] = useState(false)
  const view = useViewLook()
  const own = !!view && !isEmptyLook(view)

  const trigger = (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={phone ? () => setOpen(true) : undefined}
      data-view-look=""
      className={cx(
        'pressable inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3.5 text-[0.875rem] font-semibold',
        own ? 'border-[rgb(var(--accent-rgb)/0.35)] bg-primary-soft text-primary-strong' : 'glass border-transparent text-ink',
      )}
    >
      <Palette size={16} aria-hidden />
      {t("Ko'rinish")}
    </button>
  )

  if (phone)
    return (
      <>
        {trigger}
        <Sheet
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          title={t("Ko'rinish")}
          footer={
            <>
              <ResetButton className="me-auto" />
              <button type="button" onClick={() => setOpen(false)} className="pressable min-h-[40px] rounded-full bg-primary-fill px-5 text-[0.9375rem] font-semibold text-white">
                {t('Tayyor')}
              </button>
            </>
          }
        >
          <div className="px-4 py-4">
            <LookPanel c={c} />
          </div>
        </Sheet>
      </>
    )

  return (
    <Pop trigger={trigger} width={336} open={open} onOpenChange={setOpen}>
      <ViewLookPopBody c={c} />
    </Pop>
  )
}

/**
 * The dashboard's "Ko'rinish" as a popover body. The Studio's top-bar "Ko'rinish" (shell/StudioLook) shows this one too
 * while a dashboard is on screen: the Studio's own Fon / Effektlar never reach a dashboard, so its switch would flip with
 * nothing changing (owner, 2026-11-11: "effects button doesn't work").
 */
export function ViewLookPopBody({ c }: { c: BgControl }) {
  const { t } = useT()
  return (
    /* a short window (a 13" laptop) scrolls the panel instead of cutting its end off */
    <div className="max-h-[calc(var(--radix-popover-content-available-height,100vh)-24px)] overflow-y-auto overscroll-contain p-2">
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold text-ink">{t("Ko'rinish")}</p>
        </div>
        <ResetButton />
      </div>
      <LookPanel c={c} />
    </div>
  )
}

function ResetButton({ className }: { className?: string }) {
  const { t } = useT()
  const view = useViewLook()
  const own = !!view && !isEmptyLook(view)
  return (
    <button
      type="button"
      onClick={resetViewLook}
      disabled={!own}
      className={cx(
        'pressable inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-primary-strong hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <RotateCcw size={14} aria-hidden />
      {t('Asl holiga')}
    </button>
  )
}

const BG_LABEL: Record<PageBg, string> = { liquid: 'Liquid', graphite: 'Grafit', soft: "Yumshoq", white: 'Oq', gray: 'Kulrang', ash: 'Sokin kulrang', paper: 'Iliq', night: 'Yumshoq tun', dim: 'Tumanli', slate: 'Shifer', navy: "Ko'k tun", dark: "Qorong'i" }
const THEME_OPTS: { id: ViewTheme; label: string; icon: LucideIcon }[] = [
  { id: 'light', label: "Yorug'", icon: Sun },
  { id: 'dark', label: "Qorong'i", icon: Moon },
  { id: 'system', label: 'Tizim', icon: Monitor },
]
/** own words, not t(): "Oddiy" and "Chiziqli" already mean "Standard" and "Line (chart)" in the shared dictionary */
const CARD_LABEL: Record<CardStyle, readonly [uz: string, ru: string, en: string]> = {
  glass: ['Shisha', 'Стекло', 'Glass'],
  solid: ['Oddiy', 'Сплошные', 'Solid'],
  line: ['Chiziqli', 'Контурные', 'Outline'],
}

function LookPanel({ c }: { c: BgControl }) {
  const { t, lang } = useT()
  const view = useViewLook()
  const settings = useSettings()
  const resolved = useResolvedTheme()
  const reduce = useDeviceReducedMotion()
  // the look on screen (Klassik starts with its effects off)
  const shownDesign = useDesign()
  const fx = effectsOn(view, reduce, shownDesign)
  const card = view?.card ?? 'glass'
  const design = useContext(LookDesignCtx)
  const li = lang === 'ru' ? 1 : lang === 'en' ? 2 : 0
  // a look that is always dark (or always light) has no theme to choose
  const themeFree = c.options.length === PAGE_BGS.length
  const themeNow: ViewTheme = view?.theme === 'system' ? 'system' : resolved
  const accent = view?.accent ?? settings.accent ?? 'blue'

  const pickTheme = (th: ViewTheme) => {
    const bg = bgForTheme(th, c.value, c.options)
    updateViewLook(bg === c.value ? { theme: th } : { theme: th, bg })
  }

  return (
    <div className="flex flex-col gap-4">
      {design && (
        <Group label={t('Dizayn')}>
          <DesignTiles />
        </Group>
      )}

      <Group label={t('Fon')}>
        <div role="radiogroup" aria-label={t('Fon')} className="grid grid-cols-4 gap-2">
          {c.options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={o === c.value} onClick={() => updateViewLook({ bg: o })} className="vl-bg pressable" data-on={o === c.value || undefined}>
              <span aria-hidden className="vl-thumb" data-bg={o} style={{ background: SWATCH[o] }}>
                <i />
                <i />
                {o === c.value && (
                  <b>
                    <Check size={11} strokeWidth={3.5} />
                  </b>
                )}
              </span>
              <span className="vl-name">{t(BG_LABEL[o])}</span>
            </button>
          ))}
        </div>
      </Group>

      {themeFree && (
        <Group label={t('Mavzu')}>
          <div role="radiogroup" aria-label={t('Mavzu')} className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
            {THEME_OPTS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={themeNow === o.id}
                onClick={() => pickTheme(o.id)}
                className={cx(
                  'pressable inline-flex min-h-[34px] min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[0.8125rem] font-semibold',
                  themeNow === o.id ? 'bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:text-ink',
                )}
              >
                <o.icon size={15} aria-hidden className="shrink-0" />
                <span className="truncate">{t(o.label)}</span>
              </button>
            ))}
          </div>
        </Group>
      )}

      <Group label={t('Rang')}>
        <AccentPicker value={accent} onChange={(a) => updateViewLook({ accent: a })} />
      </Group>

      <Group label={t('Kartalar')}>
        <div role="radiogroup" aria-label={t('Kartalar')} className="grid grid-cols-3 gap-2">
          {CARD_STYLES.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={o === card} onClick={() => updateViewLook(cardPatch(o))} className="vl-bg pressable" data-on={o === card || undefined}>
              <span aria-hidden className="vl-thumb vl-cards" data-card={o}>
                <i />
                <i />
                {o === card && (
                  <b>
                    <Check size={11} strokeWidth={3.5} />
                  </b>
                )}
              </span>
              <span className="vl-name">{CARD_LABEL[o][li]}</span>
            </button>
          ))}
        </div>
      </Group>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold text-ink">{t('Effektlar')}</p>
        </div>
        <Switch checked={fx} onChange={(on) => updateViewLook(fxPatch(on, reduce, shownDesign))} label={t('Effektlar')} />
      </div>

    </div>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[0.75rem] font-semibold tracking-[0.02em] text-ink-3 uppercase">{label}</p>
      {children}
    </div>
  )
}
