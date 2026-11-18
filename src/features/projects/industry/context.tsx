import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { TermsContext, useT, type TermFn } from '@/i18n'
import type { IndustryId, PageId } from '@/features/projects/types'
import { kpiOrder, profileOf, type IndustryProfile } from './profiles'
import { compileTerms } from './terms'

const ProfileContext = createContext<IndustryProfile | null>(null)

/** a cached (lang, text) → text for an industry: the same templates are asked for on every render */
function termFn(profile: IndustryProfile): TermFn | null {
  const run = compileTerms(profile.words)
  if (!run) return null
  const cache = new Map<string, string>()
  return (lang, text) => {
    const key = `${lang}\u0000${text}`
    let out = cache.get(key)
    if (out === undefined) cache.set(key, (out = run(lang, text)))
    return out
  }
}

/**
 * Wraps a built dashboard: every t() inside uses the industry's words (Lidlar → Bemorlar) and the pages put the
 * industry's KPI tiles first. "other" (and a project from before the industry was required) changes nothing.
 */
export function IndustryProvider({ industry, children }: { industry: IndustryId | null | undefined; children: ReactNode }) {
  const profile = profileOf(industry)
  const terms = useMemo(() => termFn(profile), [profile])
  return (
    <ProfileContext.Provider value={profile}>
      <TermsContext.Provider value={terms}>{children}</TermsContext.Provider>
    </ProfileContext.Provider>
  )
}

/** an industry's words for text already translated outside the dashboard (the shell's page links of a live project) */
export function useIndustryWords(industry: IndustryId | null | undefined): (text: string) => string {
  const { lang } = useT()
  const profile = profileOf(industry)
  const terms = useMemo(() => termFn(profile), [profile])
  return useCallback((text: string) => (terms ? terms(lang, text) : text), [terms, lang])
}

/** the industry profile of the dashboard being shown (null outside a built dashboard, e.g. the demo) */
export const useIndustryProfile = () => useContext(ProfileContext)

/** kpiOrder with the current dashboard's profile for <paramref name="page"/> */
export function useKpiOrder<T>(page: PageId, items: readonly T[], label: (item: T) => string): T[] {
  const profile = useIndustryProfile()
  return kpiOrder(items, label, profile?.kpiFirst[page])
}
