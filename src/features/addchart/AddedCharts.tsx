import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { PencilLine, Plus } from 'lucide-react'
import { useT } from '@/i18n'
import { ChartView, useChartData } from '@/charts/ChartView'
import { rankVisuals, shapeFromSpec, withVisual } from '@/charts/switcher'
import { BlockChartCtx, BlockDeleteCtx, blockId, loadDraft, storeDraftPart, useBlockEdit, useEditAction } from '@/features/blockedit/context'
import { Card } from '@/ui/controls'
import { useToast } from '@/ui/overlay'
import type { ChartSpec } from '@/spec'
import { ChartBuilder, type BuilderTab } from './ChartBuilder'
import { cleanCharts, loadCharts, onChartsChanged, storeCharts, toSpec, type AddedChart, type PageCharts } from './model'
import { usePageSelectors } from './selectors'
import { datasetTile } from './tile'

/**
 * The charts added to this dashboard page with "Grafik qo'shish", drawn after the page's own blocks as normal cards — so
 * edit mode gives them everything the other blocks have (zoom, rename, chart form, ⠿ move within their grid) plus ✎ to
 * open the builder again; their ✕ deletes them for good (undo in the toast), where a page's own block is only hidden. They follow the page's Davr and filters. Mount inside the dashboard's
 * BlockEditProvider and DataSourceProvider (LivePage, web/DashboardPage).
 */
export function AddedCharts() {
  const { t } = useT()
  const toast = useToast()
  const be = useBlockEdit()
  const scope = be?.scope
  const page = be?.page ?? ''
  const scopeKey = scope ? (scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`) : ''
  const [all, setAll] = useState<PageCharts>({})
  const [builder, setBuilder] = useState<{ chart?: AddedChart; tab?: BuilderTab } | null>(null)
  // the latest stored charts: an undo after other changes puts one chart back into the list as it is now
  const latest = useRef(all)
  latest.current = all

  // edit mode works on the editor's draft (kept on the server until "Saqlash" / "Bekor qilish"); viewers see the published
  const drafting = !!be?.editing && scope?.kind === 'live'
  useEffect(() => {
    if (!scope) return
    const ac = new AbortController()
    const read = async (): Promise<PageCharts> => {
      if (drafting) {
        const d = await loadDraft(scope, ac.signal)
        if (d?.charts) return cleanCharts(d.charts)
      }
      return loadCharts(scope, ac.signal)
    }
    read()
      .then((charts) => {
        latest.current = charts
        setAll(charts)
      })
      .catch(() => undefined)
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeKey is the scope
  }, [scopeKey, drafting, be?.draftVersion])

  // the project chat stored new charts: shown at once
  useEffect(
    () =>
      onChartsChanged((charts) => {
        latest.current = charts
        setAll(charts)
      }),
    [],
  )

  const openNew = useCallback(() => setBuilder({}), [])
  // the edit bar's "Grafik qo'shish" button opens the builder (shown while this is mounted, for signed-in editors)
  useEditAction('addChart', be?.canEdit ? openNew : undefined)
  // "✨ AI tavsiyasi" in the edit bar: the same sheet on its AI tab (Opus 5.5 suggests charts from this page's data)
  const openAi = useCallback(() => setBuilder({ tab: 'ai' }), [])
  useEditAction('aiRecommend', be?.canEdit && be.scope.kind === 'live' ? openAi : undefined)

  const list = all[page] ?? []

  const store = async (nextList: AddedChart[]) => {
    if (!scope || !be) return
    const next = { ...latest.current, [page]: nextList }
    if (!nextList.length) delete next[page]
    be.setBusy(true)
    try {
      // in edit mode the draft (published with "Saqlash"); a demo's at once
      if (drafting) await storeDraftPart(scope, 'charts', next)
      else await storeCharts(scope, next)
      latest.current = next
      setAll(next)
    } finally {
      window.setTimeout(() => be.setBusy(false), 280)
    }
  }

  const onSave = async (chart: AddedChart) => {
    const old = list.find((c) => c.id === chart.id)
    try {
      await store(old ? list.map((c) => (c.id === chart.id ? chart : c)) : [...list, chart])
      // a renamed chart keeps its place and form: its block settings move to the new name (the name dropped, it is new)
      if (be && old && old.title !== chart.title) {
        const from = blockId(page, 'card', old.title)
        const to = blockId(page, 'card', chart.title)
        if (be.edits[from]) {
          await be.apply((prev) => {
            const { title: _t, ...rest } = prev[from] ?? {}
            const next = { ...prev, [to]: rest }
            delete next[from]
            return next
          })
        }
      }
      toast(old ? t('Grafik saqlandi') : t("Grafik qo'shildi"), 'ok')
      setBuilder(null)
    } catch {
      toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
    }
  }

  /** several charts at once ("AI tavsiyasi"): appended to the page, the sheet stays open */
  const onSaveMany = async (charts: AddedChart[]) => {
    try {
      await store([...(latest.current[page] ?? []), ...charts])
      toast(charts.length > 1 ? t("Grafiklar qo'shildi") : t("Grafik qo'shildi"), 'ok')
    } catch (e) {
      toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
      throw e
    }
  }

  /** deletes the chart from the page's charts; resolves with the undo that puts it back at its place */
  const deleteChart = async (chart: AddedChart): Promise<() => Promise<void>> => {
    const before = latest.current[page] ?? []
    const at = before.findIndex((c) => c.id === chart.id)
    await store(before.filter((c) => c.id !== chart.id))
    return async () => {
      const now = latest.current[page] ?? []
      if (now.some((c) => c.id === chart.id)) return
      const back = [...now]
      back.splice(at < 0 ? back.length : Math.min(at, back.length), 0, chart)
      await store(back)
    }
  }

  const onDelete = async (chart: AddedChart) => {
    try {
      const undo = await deleteChart(chart)
      toast(t("«{name}» o'chirildi", { name: chart.title }), 'info', {
        action: { label: t('Qaytarish'), onClick: () => void undo().catch(() => toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')) },
      })
      setBuilder(null)
    } catch {
      toast(t("Saqlab bo'lmadi — qayta urinib ko'ring"), 'error')
    }
  }

  if (!be || !scope) return null
  const editing = be.editing
  // the titles already on the page: a new chart gets a name of its own (a block is known by its name)
  const taken = new Set([...Object.values(be.known), ...list.map((c) => c.title)].map((x) => x.trim().toLowerCase()))

  return (
    <>
      {list.length > 0 && (
        <section aria-label={t("Qo'shilgan grafiklar")} className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
          {list.map((c) => (
            // ✕ in edit mode deletes the chart (EditableBlock), not just hides it
            <BlockDeleteCtx.Provider key={c.id} value={() => deleteChart(c)}>
              <AddedChartCard chart={c} editing={editing} onEdit={() => setBuilder({ chart: c })} />
            </BlockDeleteCtx.Provider>
          ))}
        </section>
      )}
      {editing && (
        <button
          type="button"
          onClick={openNew}
          className="pressable mt-4 flex min-h-[88px] w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line-strong text-[0.9375rem] font-semibold text-ink-2 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-primary-soft hover:text-primary-strong"
        >
          <Plus aria-hidden size={18} /> {t('Grafik')}
        </button>
      )}
      {builder && (
        <ChartBuilder
          open
          onOpenChange={(v) => !v && setBuilder(null)}
          page={page}
          initial={builder.chart}
          taken={taken}
          onSave={onSave}
          startTab={builder.tab}
          existing={list}
          onSaveMany={onSaveMany}
          onDelete={builder.chart ? () => onDelete(builder.chart!) : undefined}
        />
      )}
    </>
  )
}

function AddedChartCard({ chart, editing, onEdit }: { chart: AddedChart; editing: boolean; onEdit: () => void }) {
  const { t } = useT()
  const spec = useMemo(() => toSpec(chart), [chart])
  const tile = datasetTile(chart.dataset)
  return (
    <Card
      title={chart.title}
      icon={tile.icon}
      tile={tile.color}
      className={chart.wide ? 'lg:col-span-2' : undefined}
      actions={
        editing ? (
          // inside an edited block only .block-edit-tools takes clicks; kept clear of the block's own ⠿ ✕ corner
          <span className="block-edit-tools pointer-events-auto me-[64px] [@media(pointer:coarse)]:me-[76px]">
            <button type="button" className="block-tool" aria-label={t("«{name}» — sozlamalarini o'zgartirish", { name: chart.title })} title={t("Sozlamalarini o'zgartirish")} onClick={onEdit}>
              <PencilLine aria-hidden size={15} />
            </button>
          </span>
        ) : undefined
      }
    >
      <AddedChartBody spec={spec} height={spec.visual === 'kpi' ? 120 : chart.wide ? 300 : 280} />
    </Card>
  )
}

/** the chart, in the form chosen for its block (edit mode chips / the overlay preview) when the data allows it */
export function AddedChartBody({ spec, height }: { spec: ChartSpec; height: number }) {
  const { range, selectors } = usePageSelectors()
  const block = useContext(BlockChartCtx)
  const { res } = useChartData(spec, range, selectors)
  const ranked = useMemo(() => (res ? rankVisuals(shapeFromSpec(spec, res)) : []), [res, spec])
  const report = block?.report
  const forms = ranked.map((r) => r.visual).join()
  useEffect(() => {
    if (report && forms) report(spec.visual, forms.split(',') as ChartSpec['visual'][])
  }, [report, spec.visual, forms])
  const wanted = block?.visual
  const shown = wanted && wanted !== spec.visual && ranked.some((r) => r.visual === wanted) ? withVisual(spec, wanted) : spec
  return <ChartView spec={shown} range={range} selectors={selectors} height={height} />
}
