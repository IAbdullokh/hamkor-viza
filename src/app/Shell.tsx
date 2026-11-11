import type { ReactNode } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { updateSettings, useSettings, type Lang } from '@/lib/settings'
import { IconTile, Segmented, type TileColor } from '@/ui/glass'
import { PAGES } from '@/web/registry'
import { useIndustryWords } from '@/features/projects/industry/context'
import { StudioLookButton } from '@/shell/StudioLook'
import { config } from '@/config'

/**
 * The viewer's shell (Studio's shell/AppShell as a published dashboard's viewer sees it): the floating glass sidebar
 * with the dashboard's pages, the top bar with «Ko'rinish» and the language switch. No Studio links, no projects trail.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { t } = useT()
  const s = useSettings()
  const collapsed = s.sidebarCollapsed
  const { page } = useParams({ strict: false }) as { page?: string }
  const words = useIndustryWords(config.project.industry)
  const pages = PAGES.filter((p) => config.project.pages.includes(p.id))

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-surface-solid focus:px-4 focus:py-2"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        {t("Asosiy qismga o'tish")}
      </a>

      <aside
        aria-label={t('Asosiy menyu')}
        className={cx(
          'glass-rail fixed inset-y-3 start-3 z-30 hidden flex-col rounded-[28px] p-3 transition-[width] duration-300 lg:flex',
          collapsed ? 'w-[84px]' : 'w-[264px]',
        )}
      >
        <div className={cx('flex items-center gap-2 px-1 pt-1 pb-3', collapsed && 'flex-col')}>
          <span className="flex min-w-0 items-center gap-2.5 rounded-2xl" aria-label="Data365">
            <Logo />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[1.0625rem] leading-tight font-bold tracking-tight">Data365</span>
                <span className="block truncate text-[0.75rem] font-medium text-ink-3">Studio</span>
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
            aria-label={collapsed ? t('Kengaytirish') : t("Yig'ish")}
            className={cx('pressable ms-auto grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink', collapsed && 'ms-0')}
          >
            {collapsed ? <ChevronRight aria-hidden size={17} /> : <ChevronLeft aria-hidden size={17} />}
          </button>
        </div>

        <nav className="-mx-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-1 [scrollbar-width:none]">
          <div className="mx-3 my-2 border-t border-line" />
          {pages.map((p) => (
            <SideLink key={p.id} page={p.id} icon={p.icon} tile={p.tile} label={words(t(p.title))} on={page === p.id} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      <div className={cx('transition-[padding] duration-300', collapsed ? 'lg:ps-[100px]' : 'lg:ps-[280px]')}>
        <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),8px)] sm:px-4 lg:px-6 lg:pt-3">
          <div className="glass mx-auto flex h-14 max-w-[1440px] items-center gap-2 rounded-[22px] px-2 sm:px-3">
            <span className="flex items-center rounded-2xl px-1 lg:hidden" aria-hidden>
              <Logo size={36} />
            </span>
            <div className="ms-auto flex shrink-0 items-center gap-1">
              <StudioLookButton />
              <div className="hidden sm:block">
                <Segmented<Lang>
                  size="xs"
                  label={t('Til')}
                  value={s.lang}
                  onChange={(lang) => updateSettings({ lang })}
                  options={[
                    { value: 'uz', label: 'UZ' },
                    { value: 'ru', label: 'RU' },
                    { value: 'en', label: 'EN' },
                  ]}
                />
              </div>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-16 outline-none sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>
    </div>
  )
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center font-extrabold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_6px_14px_-6px_rgb(10_132_255/0.8)]"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #5e5ce6 0%, #0a84ff 55%, #40c8e0 100%)', borderRadius: size * 0.32, fontSize: size * 0.34, letterSpacing: '-0.05em' }}
      aria-hidden
    >
      365
    </span>
  )
}

function SideLink({ page, icon, tile, label, on, collapsed }: { page: string; icon: LucideIcon; tile: TileColor; label: string; on: boolean; collapsed: boolean }) {
  return (
    <Link
      to="/l/$slug/$page"
      params={{ slug: config.project.slug, page }}
      aria-current={on ? 'page' : undefined}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cx(
        'group pressable relative flex min-h-[40px] items-center gap-3 rounded-[15px] px-2.5 text-[0.9375rem] font-medium',
        collapsed && 'justify-center px-0',
        on ? 'rail-lens text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <IconTile icon={icon} color={tile} size="sm" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Link>
  )
}
