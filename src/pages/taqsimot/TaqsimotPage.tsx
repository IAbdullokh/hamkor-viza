import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import type { Lead } from '@/data/types'
import { useProjectSlug } from '@/data/source'
import { Eye } from 'lucide-react'
import { Segmented } from '@/ui/glass'
import { FilterBar, usePageFilters } from '@/kit/filters'
import { DrillSheet, type Drill } from '@/kit/blocks'
import { getDistribution, type DistributionEntry, type DistributionSettings } from '@/features/projects/api'
import { useTaqsimot } from './store'
import { DistributionPanel } from './DistributionPanel'
import { KunlikTab } from './Kunlik'
import { HaftalikTab } from './Haftalik'
import { OylikTab } from './Oylik'
import { FoizlarTab } from './Foizlar'
import { StatistikaTab } from './Statistika'

/**
 * Taqsimot — lead distribution (Hilol-dashboard, lead parts only; see docs/default-dashboard/taqsimot.json).
 * Tabs: Kunlik jadval · Haftalik jadval (+ Otpuska rejasi) · Oylik jadval · Foizlar (Taqsimot sozlamalari + Bugungi taqsimot) · Statistika.
 * Schedule and share edits persist in the 'taqsimot' page state (localStorage `d365.taqsimot` in the demo). In a live
 * project the owner / a manager also gets «Avtomatik taqsimot» on top (DistributionPanel): with it on, the server hands the
 * leads on Main to these operators by these shares and days off. Someone who may not change it (a viewer) sees the old
 * "view only" note instead.
 * The Davr presets only drive Statistika (as in Hilol), so they are shown on that tab only.
 */
type Tab = 'kunlik' | 'haftalik' | 'oylik' | 'foizlar' | 'stat'

/** the editors of someone who only looks: nothing they press changes the plan (it decides who gets the leads) */
const VIEW_ONLY = { readOnly: true, setShare: () => {}, setShares: () => {}, setWeekly: () => {}, addOff: () => {}, removeOff: () => {} }

export default function TaqsimotPage() {
  const { t } = useT()
  const f = usePageFilters([] as const)
  const slug = useProjectSlug()
  const live = slug !== null
  // the automatic distribution (owners and managers; null = not allowed here or not loaded yet)
  const [dist, setDist] = useState<{
    settings: DistributionSettings
    log: DistributionEntry[]
    published: boolean
    reached: boolean
    pending: boolean
  } | null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!slug) return
    let alive = true
    const load = () =>
      getDistribution(slug).then(
        // pending: the server still runs with other settings (apps/api Bitrix24Module GET …/distribution)
        (d) => alive && setDist({ ...d, pending: d.pending === true }),
        () => undefined,
      )
    void load()
    const timer = setInterval(load, 30_000) // the log fills while the page is open
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [slug, reload])
  const edit = useTaqsimot(dist?.settings.operatorIds.length ? dist.settings.operatorIds : null, dist?.settings.endHour, dist?.settings.startHour)
  // without «Avtomatik taqsimot» (a published dashboard's viewer, a member, a visitor) the plan is view only — the server refuses their saves too
  const tq = useMemo(() => (live && !dist ? { ...edit, ...VIEW_ONLY } : { ...edit, readOnly: false }), [edit, live, dist])
  const [tab, setTab] = useState<Tab>('kunlik')
  const [drill, setDrill] = useState<Drill<Lead> | null>(null)

  return (
    // the Davr presets only count on "Statistika" (on a dashboard they sit in the owner's order: data-bar-key, livefilters/BarRow)
    <div className={cx('page-in', tab !== 'stat' && '[&>div:first-child>:first-child:not([data-bar-key])]:hidden [&>div:first-child_[data-bar-key=range]]:hidden')}>
      <FilterBar preset={f.preset} onPreset={f.setPreset}>
        {/* on a phone the tabs scroll inside this row: with longer words (ru) they must not widen the whole page */}
        <div className={cx('max-w-[calc(100vw-2rem)] sm:max-w-full', tab === 'stat' && 'sm:ms-auto')}>
          <Segmented<Tab>
            size="sm"
            label={t('Taqsimot')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'kunlik', label: t('Kunlik jadval') },
              { value: 'haftalik', label: t('Haftalik jadval') },
              { value: 'oylik', label: t('Oylik jadval') },
              { value: 'foizlar', label: t('Foizlar') },
              { value: 'stat', label: t('Statistika') },
            ]}
          />
        </div>
      </FilterBar>

      {slug && dist && (
        <DistributionPanel
          slug={slug}
          settings={dist.settings}
          log={dist.log}
          published={dist.published}
          reached={dist.reached}
          pending={dist.pending}
          onSaved={(settings) => setDist((d) => (d ? { ...d, settings, pending: false } : d))}
          onReload={() => setReload((n) => n + 1)}
        />
      )}

      {live && !dist && (
        <p role="note" className="glass mb-4 flex items-start gap-2.5 rounded-[18px] px-4 py-3 text-[0.875rem] text-ink-2">
          <Eye size={18} aria-hidden className="mt-0.5 shrink-0 text-primary-strong" />
          <span>
            <b className="font-semibold text-ink">{t("Ko'rish rejimi.")}</b>{' '}
            {t("Foizlar va dam olish kunlarini Data365 Studio'dan o'zgartirish mumkin.")}
          </span>
        </p>
      )}

      {tab === 'kunlik' && <KunlikTab tq={tq} now={f.now} />}
      {tab === 'haftalik' && <HaftalikTab tq={tq} now={f.now} />}
      {tab === 'oylik' && <OylikTab tq={tq} now={f.now} />}
      {tab === 'foizlar' && <FoizlarTab tq={tq} now={f.now} onDrill={setDrill} />}
      {tab === 'stat' && <StatistikaTab tq={tq} range={f.range} now={f.now} onDrill={setDrill} />}

      <DrillSheet drill={drill} onClose={() => setDrill(null)} />
    </div>
  )
}
