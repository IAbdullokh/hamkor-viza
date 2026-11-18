import { Fragment, useRef, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n'
import { useDashBusy } from './busy'
import { useBlockEdit } from './context'
import { useKpiFit } from './kpifit'
import { FilterScope } from '@/features/livefilters/FilterScope'
import { PageBgScope } from '@/features/pagebg/PageBg'

/** the dashboard body: blurs softly with a small "Yangilanmoqda…" badge while filters apply or an edit is saved */
export function DashFrame({ children }: { children: ReactNode }) {
  const { t } = useT()
  const filtering = useDashBusy()
  const be = useBlockEdit()
  const saving = be?.busy ?? false
  const busy = filtering || saving
  // the KPI rows fill the width whatever count of cards is shown (kpifit.ts)
  const root = useRef<HTMLDivElement>(null)
  useKpiFit(root)
  return (
    // data-block-root: a block that sits alone on the page moves among what is here at most (order.ts unitOf)
    <div ref={root} className="relative" data-block-root="" data-dash-busy={busy || undefined} aria-busy={busy || undefined}>
      {busy && (
        <span role="status" className="dash-busy-pill">
          <Loader2 aria-hidden size={14} className="animate-spin" />
          {t('Yangilanmoqda…')}
        </span>
      )}
      {/* the dashboard's background ("Fon": Liquid / Oq / Kulrang / Qorong'i, features/pagebg) */}
      <PageBgScope />
      {/* the filters added with "+ Filtr" narrow the page's data before it computes (features/livefilters) */}
      <FilterScope>
        {/* "Tartibni tiklash" draws the page again, so the moved cards come back in the page's own order */}
        <Fragment key={be?.epoch ?? 0}>{children}</Fragment>
      </FilterScope>
    </div>
  )
}
