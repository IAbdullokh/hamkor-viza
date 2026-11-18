import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ErrorInfo, type ReactNode } from 'react'
import { Navigate, useParams } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { useT } from '@/i18n'
import { setDesign } from '@/lib/design'
import { onProjectStateError, onProjectStateReloaded } from '@/lib/projectState'
import { DataSourceProvider, invalidateSnapshot, loadSnapshot, type SourceSpec } from '@/data/source'
import { BlockEditProvider } from '@/features/blockedit/context'
import { DashFrame } from '@/features/blockedit/DashFrame'
import { AddedCharts } from '@/features/addchart/AddedCharts'
import { IconTile } from '@/ui/glass'
import { ViewLookButton } from '@/features/viewlook/ViewLook'
import { useShownUi } from '@/features/viewlook/DesignTiles'
import { MyViewTools } from '@/features/blockedit/HistoryTools'
import { Card, EmptyState, Skeleton } from '@/ui/controls'
import { useToast } from '@/ui/overlay'
import { ProgressBar } from '@/ui/progress'
import { ErrorPanel } from '@/ui/status'
import { getPage, PAGES } from '@/web/registry'
import { PageBody, PageTabs } from '@/web/DashboardPage'
import { isJobActive, toApiError, useLive } from '@/features/projects/api'
import { errorText } from '@/features/projects/labels'
import type { LiveInfo, PageId, UiId } from '@/features/projects/types'
import { lookDesign } from '@/features/projects/look/uis'
import { useLookLayer } from '@/features/projects/look/apply'
import { SkippedGate } from '@/features/projects/live/SkippedGate'
import { IndustryProvider } from '@/features/projects/industry/context'
import { useLiveEvents } from '@/features/instant/api'
import { KioskRefresh } from '@/features/publish/KioskRefresh'
import { applyNow, ASKED_WINDOW_MS, rememberPage, useNaturalMoments, useRealtime, versionOf } from '@/features/projects/live/refresh'
import { NewDataPill } from '@/features/projects/live/NewDataPill'
import { config } from '@/config'
import { DATA_MODE } from './mode'

/**
 * /l/<slug>/<page> — the dashboard (Studio's features/projects/live/LivePage as a published dashboard's viewer sees it:
 * no editing, no Nova, no publishing). Live mode renders the server's snapshot (GET /api/live/<slug>/dataset); demo mode
 * renders Studio's seeded demo generator through the same page components.
 * New data: the server keeps building it; the page shows it in place — at once on a dashboard with prefs.realtime, else at
 * a natural moment (another page, back to the tab, idle with nothing open), on «Yangi ma'lumot bor · Yangilash» or a reload.
 */
export function DashboardRoute() {
  const { t } = useT()
  const { page: pageParam } = useParams({ strict: false }) as { page: string }
  const slug = config.project.slug
  const { live, error, status, refresh } = useLive(slug)
  // a new build on the server is known without a reload (the live stream); demo mode has no server
  useLiveEvents(DATA_MODE === 'live' ? slug : null, () => void refresh())
  // a viewer whose access was switched off or whose password was reset: back to the login card (once per 30 s)
  useEffect(() => {
    if ((error?.code as string | undefined) !== 'VIEWER_LOGIN' && error?.status !== 401) return
    try {
      const last = Number(sessionStorage.getItem('d365.viewerReload') ?? 0)
      if (Date.now() - last < 30_000) return
      sessionStorage.setItem('d365.viewerReload', String(Date.now()))
    } catch {
      // storage blocked: reload anyway
    }
    window.location.reload()
  }, [error?.code, error?.status])

  if (!live) {
    if (error?.code === 'NOT_FOUND') return <NotFound />
    if (error) return <ErrorPanel {...errorText(t, error)} code={error.code} detail={error.detail} onRetry={() => void refresh()} className="page-in" />
    return status === 'idle' ? null : <LiveSkeleton />
  }

  const pages = PAGES.map((p) => p.id).filter((id) => live.pages.includes(id) && config.project.pages.includes(id))
  const page = getPage(pageParam)
  if (!pages.length) return <NotFound />
  if (!page || !pages.includes(page.id)) return <Navigate to="/l/$slug/$page" params={{ slug, page: pages[0]! }} replace />

  return (
    <IndustryProvider industry={live.industry ?? config.project.industry}>
      <LiveDashboard live={live} pages={pages} pageId={page.id} onRefreshed={() => void refresh()} />
    </IndustryProvider>
  )
}

const DEMO: SourceSpec = { kind: 'demo' }

function LiveDashboard({ live, pages, pageId, onRefreshed }: { live: LiveInfo; pages: PageId[]; pageId: PageId; onRefreshed: () => void }) {
  const { t } = useT()
  const toast = useToast()
  const page = getPage(pageId)!
  // the look is this copy's (src/config/project.gen.ts → ui); the viewer's own «Ko'rinish» goes over it
  const storedUi: UiId = config.project.ui
  const baseUi: UiId = lookDesign(storedUi) === null ? 'glass' : storedUi

  const reread = useRef(onRefreshed)
  reread.current = onRefreshed

  // a failed save of Reja / Taqsimot / Hisobot values was rolled back: say so
  useEffect(
    () =>
      onProjectStateError((_key, error) =>
        toast(
          ['UNAUTHORIZED', 'FORBIDDEN'].includes(toApiError(error).code)
            ? t("O'zgartirish uchun ruxsat kerak — Studio'ga kiring")
            : t("O'zgarish saqlanmadi. Internetni tekshirib, qayta urinib ko'ring."),
          'error',
        ),
      ),
    [toast, t],
  )
  useEffect(() => onProjectStateReloaded(() => toast(t("Boshqa odam o'zgartirdi — yangilandi"), 'info')), [toast, t])

  // ── which snapshot version is on screen ──
  const latest = versionOf(live)
  const realtime = useRealtime(live.slug)
  const [shown, setShown] = useState({ slug: live.slug, v: latest })
  const applied = shown.slug === live.slug ? shown.v : latest
  const askedUntil = useRef(0)
  const ask = useCallback(() => {
    askedUntil.current = Date.now() + ASKED_WINDOW_MS
  }, [])
  const [applying, setApplying] = useState(false)
  const [, startApply] = useTransition()
  const target = useRef<string | null>(null)
  const specOf = useCallback(
    (v: string): Extract<SourceSpec, { kind: 'project' }> => ({ kind: 'project', slug: live.slug, projectId: live.projectId, version: v }),
    [live.slug, live.projectId],
  )
  // the new snapshot is loaded first and swapped in place: drill-downs, filters, sort, the scroll position stay
  const apply = useCallback(
    (v: string) => {
      if (DATA_MODE === 'demo') return
      target.current = v
      setApplying(true)
      loadSnapshot(specOf(v)).then(
        () => {
          if (target.current !== v) return
          startApply(() => setShown({ slug: live.slug, v }))
          setApplying(false)
        },
        () => {
          if (target.current !== v) return
          setApplying(false)
          toast(t("Yangi ma'lumotni olib bo'lmadi — birozdan keyin urinib ko'ring"), 'error')
        },
      )
    },
    [specOf, live.slug, toast, t],
  )
  const pending = latest !== applied
  const showLatest = useCallback(() => {
    if (pending) apply(latest)
  }, [pending, apply, latest])
  useEffect(() => {
    if (pending && applyNow({ realtime, askedUntil: askedUntil.current })) apply(latest)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new version or the switch turned on decides
  }, [latest, realtime])
  useNaturalMoments({ active: pending && !realtime && !applying, page: pageId, onMoment: showLatest })
  useEffect(() => invalidateSnapshot(live.slug, applied), [live.slug, applied])
  useEffect(() => rememberPage(live.slug, pageId), [live.slug, pageId])

  const spec = useMemo(() => (DATA_MODE === 'demo' ? DEMO : specOf(applied)), [specOf, applied])

  return (
    <BlockEditProvider scope={{ kind: 'live', slug: live.slug }} page={pageId} canEdit={false}>
      <LiveLook ui={baseUi} />
      <div className="page-in">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="max-w-full min-w-fit flex-1">
            <h1 className="flex items-center gap-2.5 text-[1.625rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[1.875rem]">
              <IconTile icon={page.icon} color={page.tile} size="md" /> {t(page.title)}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {DATA_MODE === 'live' && <KioskRefresh slug={live.slug} pending={pending} onApply={showLatest} onAsk={ask} />}
            <MyViewTools where="header" />
            <ViewLookButton where="header" />
          </div>
        </div>

        {pending && !realtime && <NewDataPill version={latest} busy={applying} onApply={showLatest} />}

        {isJobActive(live.job) && live.job && (
          <Card className="mb-4">
            <ProgressBar value={live.job.progress} etaSec={live.job.etaSec} label={t("Ma'lumotlar yangilanmoqda")} />
          </Card>
        )}

        <PageTabs pages={pages} current={pageId} link={(id) => ({ to: '/l/$slug/$page', params: { slug: live.slug, page: id } })} />
        <SnapshotBoundary version={applied} slug={live.slug}>
          <Suspense fallback={<Skeleton className="h-[420px] rounded-[26px]" />}>
            <DataSourceProvider source={spec}>
              <DashFrame>
                <SkippedGate page={pageId}>
                  <PageBody id={pageId} key={pageId} />
                </SkippedGate>
                <AddedCharts />
              </DashFrame>
            </DataSourceProvider>
          </Suspense>
        </SnapshotBoundary>
      </div>
    </BlockEditProvider>
  )
}

/** puts the look on screen: the viewer's own Dizayn over the project's (lib/design, an Aralash mix's layer) */
function LiveLook({ ui }: { ui: UiId }) {
  const shown = useShownUi(ui)
  const design = lookDesign(shown)
  useEffect(() => {
    if (!design) return
    setDesign(design)
    return () => setDesign(null)
  }, [design])
  useLookLayer(shown)
  return null
}

/** Catches a failed snapshot load (or a page crash on unexpected data) and offers «Qayta urinish». */
class SnapshotBoundary extends Component<{ slug: string; version: string; children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidUpdate(prev: { version: string }) {
    if (prev.version !== this.props.version && this.state.error != null) this.setState({ error: null })
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[dashboard] failed', error, info.componentStack)
  }

  retry = () => {
    invalidateSnapshot(this.props.slug)
    this.setState({ error: null })
  }

  render() {
    if (this.state.error == null) return this.props.children
    return <SnapshotError error={this.state.error} onRetry={this.retry} />
  }
}

function SnapshotError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useT()
  const e = toApiError(error)
  return <ErrorPanel {...errorText(t, e)} code={e.code} detail={e.detail} onRetry={onRetry} />
}

function NotFound() {
  const { t } = useT()
  return (
    <Card className="page-in">
      <EmptyState icon={SearchX} title={t('Dashboard topilmadi')} text={t("Havola eskirgan yoki loyiha o'chirilgan bo'lishi mumkin.")} />
    </Card>
  )
}

function LiveSkeleton() {
  return (
    <div className="page-in" aria-busy="true">
      <Skeleton className="mb-4 h-14 w-72 rounded-[18px]" />
      <Skeleton className="mb-5 h-12 rounded-[20px]" />
      <Skeleton className="h-[420px] rounded-[26px]" />
    </div>
  )
}
