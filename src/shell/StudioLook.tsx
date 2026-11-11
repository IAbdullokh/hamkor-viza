import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fxOn, updateSettings, useSettings, type StudioBg, type ThemePref } from '@/lib/settings'
import { useResolvedTheme } from './ThemeController'
import { Switch } from '@/ui/controls'
import { Segmented } from '@/ui/glass'
import { Pop, Tooltip } from '@/ui/overlay'
import { useViewLook } from '@/lib/viewLook'
import { useBgControl } from '@/features/pagebg/PageBg'
import { ViewLookPopBody } from '@/features/viewlook/ViewLook'

/**
 * "Ko'rinish" in the Studio's top bar: how the Studio itself looks in this browser — Mavzu (Avto / Yorug' / Qorong'i),
 * Fon (the Liquid orbs, a plain white page, or a calm workspace: Yumshoq / Kulrang / Iliq light, Yumshoq tun / Tumanli
 * dark) and Effektlar (glass, light, motion). Nothing else changes: a dashboard
 * on screen keeps its own look (and its viewers' own "Ko'rinish"), the pages and their contents stay as they are — so
 * while a dashboard is on screen this button opens that dashboard's own "Ko'rinish" (features/viewlook): the Studio's
 * Fon / Effektlar would change nothing visible there.
 */
export function StudioLookButton() {
  const { t } = useT()
  const s = useSettings()
  const theme = useResolvedTheme()
  const Icon = s.theme === 'dark' ? Moon : s.theme === 'light' ? Sun : Monitor
  // a dashboard on screen: its own look, the same panel as its "Ko'rinish" button
  const view = useViewLook()
  const dash = useBgControl()
  const onDashboard = !!view && !!dash
  const bgs: { value: StudioBg; label: string; swatch: string }[] = [
    { value: 'liquid', label: t('Liquid'), swatch: 'bg-[linear-gradient(135deg,#c9d6ff,#e2c8f0_55%,#c7f0e4)]' },
    { value: 'graphite', label: t('Grafit'), swatch: 'bg-[radial-gradient(circle_at_20%_20%,#3a5a9a,#1c1c1e_60%)]' },
    { value: 'white', label: t('Oq'), swatch: 'bg-white' },
    { value: 'soft', label: t('Yumshoq'), swatch: 'bg-[#eef3f9]' },
    { value: 'night', label: t('Yumshoq tun'), swatch: 'bg-[#1b1d21]' },
    { value: 'ash', label: t('Kulrang'), swatch: 'bg-[#eceef1]' },
    { value: 'paper', label: t('Iliq'), swatch: 'bg-[#f4f2ee]' },
    { value: 'dim', label: t('Tumanli'), swatch: 'bg-[#2a2e35]' },
  ]
  return (
    <Pop
      width={onDashboard ? 336 : 300}
      trigger={
        <span>
          <Tooltip content={t("Ko'rinish")}>
            <button
              type="button"
              aria-label={t("Ko'rinish")}
              className="pressable grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <Icon aria-hidden size={19} />
            </button>
          </Tooltip>
        </span>
      }
    >
      {onDashboard && dash ? (
        <ViewLookPopBody c={dash} />
      ) : (
      <div className="flex flex-col gap-4 p-2">
        <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
          <Palette aria-hidden size={16} /> {t("Ko'rinish")}
        </p>

        <div className="flex flex-col gap-2">
          <p className="eyebrow">{t('Mavzu')}</p>
          <Segmented<ThemePref>
            size="xs"
            block
            label={t('Mavzu')}
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'auto', label: t('Avto') },
              { value: 'light', label: t("Yorug'") },
              { value: 'dark', label: t("Qorong'i") },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="eyebrow">{t('Fon')}</p>
          <div className="grid grid-cols-3 gap-2">
            {bgs.map((b) => (
              <button
                key={b.value}
                type="button"
                aria-pressed={s.studioBg === b.value}
                onClick={() => updateSettings({ studioBg: b.value })}
                className={cx(
                  'pressable flex flex-col items-center gap-1.5 rounded-[14px] border p-2 text-[0.8125rem] font-medium',
                  s.studioBg === b.value ? 'border-primary bg-primary-soft text-primary-strong' : 'border-line text-ink-2 hover:bg-surface-2',
                )}
              >
                <span className={cx('h-9 w-full rounded-[10px] border border-line', b.swatch)} />
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.875rem] font-semibold text-ink">{t('Effektlar')}</p>
          <Switch checked={fxOn(s.fxMode, theme)} onChange={(on) => updateSettings({ fxMode: on ? 'on' : 'off' })} label={t('Effektlar')} />
        </div>
      </div>
      )}
    </Pop>
  )
}
