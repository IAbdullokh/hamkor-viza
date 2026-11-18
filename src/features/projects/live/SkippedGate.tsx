import type { ReactNode } from 'react'
import { CircleSlash } from 'lucide-react'
import { useT } from '@/i18n'
import { useMeta } from '@/data/source'
import { Card, EmptyState } from '@/ui/controls'
import { phaseLabel } from '../labels'
import type { LoadSectionId, PageId } from '../types'

/** the load sections each page reads (AccessService.PageSections): all of them skipped = the page has nothing to show */
export const PAGE_SECTIONS: Partial<Record<PageId, LoadSectionId[]>> = {
  lead: ['leads'],
  deal: ['deals'],
  calls: ['calls'],
  kampaniyalar: ['ads'],
  reja: ['deals'],
  taqsimot: ['deals'],
}

/** the sections of `page` the owner skipped, when they are all it reads; [] otherwise */
export function skippedFor(page: PageId, skipped: LoadSectionId[] | undefined): LoadSectionId[] {
  const needs = PAGE_SECTIONS[page]
  if (!needs || !skipped?.length) return []
  return needs.every((s) => skipped.includes(s)) ? needs : []
}

/**
 * A page whose section was skipped in the load (owner, 2026-10-24): "Bu bo'lim yuklanmagan" instead of a page of zeros that would
 * read as "no calls at all".
 */
export function SkippedGate({ page, children }: { page: PageId; children: ReactNode }) {
  const { t } = useT()
  const meta = useMeta()
  const missing = skippedFor(page, meta.skipped)
  if (missing.length === 0) return <>{children}</>
  return (
    <Card>
      <EmptyState
        icon={CircleSlash}
        title={t("Bu bo'lim yuklanmagan")}
        text={t("«{section}» yuklash paytida o'tkazib yuborilgan. Uni loyihaning yuklash qadamida «Qaytarish» bilan qaytarib, qayta yuklash mumkin.", {
          section: missing.map((s) => phaseLabel(t, 'pull', s)).join(', '),
        })}
      />
    </Card>
  )
}
