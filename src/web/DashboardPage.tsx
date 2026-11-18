import { useNavigate, type LinkProps } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useT } from '@/i18n'
import { PAGES, type PageId } from './registry'
import { PAGE_COMPONENTS } from '@/app/pages.gen'

/**
 * Standalone app (export-app): Studio's web/DashboardPage without the demo catalog page — the page switch for phones and
 * one page's body. Only the project's pages are bundled (src/app/pages.gen.ts).
 */

/** The page switch below `lg` (on a computer the pages are in the sidebar, src/app/Shell.tsx). */
export function PageTabs({ pages, current, link }: { pages: PageId[]; current: PageId; link: (id: PageId) => Pick<LinkProps, 'to' | 'params'> }) {
  const { t } = useT()
  const navigate = useNavigate()
  const list = PAGES.filter((p) => pages.includes(p.id))
  const cur = list.find((p) => p.id === current)
  if (list.length < 2) return null
  return (
    <nav aria-label={t('Sahifalar')} className="mb-4 lg:hidden">
      <label className="glass relative flex items-center gap-2 rounded-[16px] ps-3 pe-2">
        {cur && <cur.icon aria-hidden size={16} className="shrink-0 text-ink-2" />}
        <span className="sr-only">{t('Sahifani tanlash')}</span>
        <select
          value={current}
          onChange={(e) => void navigate(link(e.target.value as PageId) as Parameters<typeof navigate>[0])}
          className="min-h-[42px] min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pe-7 text-[0.9375rem] font-semibold text-ink outline-none"
        >
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {t(p.title)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden size={16} className="pointer-events-none absolute end-3 text-ink-3" />
      </label>
    </nav>
  )
}

/** One dashboard page (lazy). Mount it inside a DataSourceProvider and a Suspense boundary. */
export function PageBody({ id }: { id: PageId }) {
  const C = PAGE_COMPONENTS[id]
  return C ? <C /> : null
}
