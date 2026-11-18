import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { ChartView, useChartData } from '@/charts/ChartView'
import { rankVisuals, shapeFromSpec, VISUAL_LABELS } from '@/charts/switcher'
import { useDb } from '@/data/db'
import { datasetsFor } from '@/data/datasets'
import { getDataset, type DatasetRuntime } from '@/data/query'
import { getWorkspace } from '@/data/workspaces'
import { Sheet } from '@/ui/overlay'
import { Button, Skeleton, Switch, TextField } from '@/ui/controls'
import { Segmented } from '@/ui/glass'
import type { VisualType } from '@/spec'
import { usePageSelectors } from './selectors'
import { BUILDER_VISUALS, fieldIdOk, MAX_NOTE, MAX_TITLE, newChartId, QUEUE_DATASETS, quickPicks, toSpec, type AddedChart, type Preset } from './model'
import { Undo2 } from 'lucide-react'
import { AiRecommend } from './AiRecommend'
import { AiTuneBox } from './AiTune'
import { useBlockEdit } from '@/features/blockedit/context'

/**
 * The "Grafik qo'shish" sheet: ready charts for this page's data with live previews, or "O'zim tuzaman" — Ma'lumot →
 * O'lchov → Kesim → Grafik turi → Nomi, with the chart drawn live on the dashboard's own data (its Davr and filters).
 * Opened again with ✎ on an added chart it starts in the builder with that chart's settings.
 */
export type BuilderTab = 'picks' | 'own' | 'ai'
type Tab = BuilderTab

/** the datasets this snapshot has rows in (a project without telephony has no calls) */
export function useDatasets(): DatasetRuntime[] {
  const db = useDb()
  return useMemo(() => {
    const out: DatasetRuntime[] = []
    for (const spec of datasetsFor(getWorkspace(db.wsId))) {
      try {
        const ds = getDataset(db.wsId, spec.id)
        if (ds.table.rows(db).length > 0) out.push(ds)
      } catch {
        // a dataset whose table this source lacks
      }
    }
    return out
  }, [db])
}

const measuresOf = (ds: DatasetRuntime) => ds.fields.filter((f) => f.compiled && f.field.kind === 'measure' && fieldIdOk(f.field.id))
/** cuts worth charting: names, stages, dates, flags — not ids, phone numbers or raw seconds */
const dimsOf = (ds: DatasetRuntime) =>
  ds.fields.filter((f) => {
    if (!f.compiled || f.field.kind !== 'dimension' || !fieldIdOk(f.field.id)) return false
    if (f.field.id === 'id' || f.field.id === 'vaqt') return false
    return f.compiled.type !== 'number' || f.field.format === 'hour' || f.field.format === 'weekday' || f.field.id === 'soat'
  })

export function ChartBuilder({
  open,
  onOpenChange,
  page,
  initial,
  taken,
  onSave,
  onDelete,
  startTab,
  existing = [],
  onSaveMany,
  layered,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  page: string
  initial?: AddedChart
  /** names already on the page (lower case): a new chart gets its own */
  taken: Set<string>
  onSave: (c: AddedChart) => Promise<void>
  onDelete?: () => void
  /** the tab it opens on (the edit bar's "✨ AI tavsiyasi" opens 'ai') */
  startTab?: BuilderTab
  /** the page's added charts (the AI tab sends them so nothing is suggested twice) */
  existing?: AddedChart[]
  /** adds several charts and keeps the sheet open ("AI tavsiyasi": Qo'shish / Hammasini qo'shish) */
  onSaveMany?: (cs: AddedChart[]) => Promise<void>
  /** opened from the zoomed block editor (a block's own data): drawn above it */
  layered?: boolean
}) {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>(initial ? 'own' : (startTab ?? 'picks'))
  const [saving, setSaving] = useState(false)
  const datasets = useDatasets()
  const [draft, setDraft] = useState<Preset>(() => initial ?? starter(datasets[0]))
  const [named, setNamed] = useState(!!initial)

  const unique = (title: string) => {
    if (initial && initial.title.trim().toLowerCase() === title.trim().toLowerCase()) return title
    let out = title
    for (let n = 2; taken.has(out.trim().toLowerCase()); n++) out = `${title} (${n})`
    return out.slice(0, MAX_TITLE)
  }

  const save = async (p: Preset) => {
    setSaving(true)
    try {
      await onSave({ ...p, id: initial?.id ?? newChartId(), title: unique(p.title.trim() || t('Yangi grafik')) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      top={layered}
      width={880}
      title={initial ? t('Grafikni sozlash') : t("Grafik qo'shish")}
      footer={
        tab === 'own' ? (
          <>
            {onDelete && (
              <Button variant="ghost" icon={Trash2} className="me-auto text-danger" onClick={onDelete} disabled={saving}>
                {layered ? t('Asl holiga') : t("Grafikni o'chirish")}
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('Bekor qilish')}
            </Button>
            <Button variant="primary" icon={initial ? Check : Plus} onClick={() => void save(draft)} disabled={saving || !draft.measure}>
              {initial ? t('Saqlash') : t("Qo'shish")}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* nearly opaque and blurred: cards and the question field never show through behind the tabs */}
      <div className="sticky top-0 z-20 bg-[rgb(var(--glass-rgb)/0.94)] px-5 pt-4 pb-3 backdrop-blur-md">
        <Segmented<Tab>
          size="sm"
          block
          label={t("Grafik qo'shish")}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'picks', label: t('Tayyor grafiklar') },
            ...(onSaveMany && !initial ? [{ value: 'ai' as const, label: `✨ ${t('AI tavsiyasi')}` }] : []),
            { value: 'own', label: t("O'zim tuzaman") },
          ]}
        />
      </div>
      {tab === 'ai' && onSaveMany ? (
        <AiRecommend
          page={page}
          datasets={datasets}
          existing={existing}
          disabled={saving}
          onTune={(p) => {
            setDraft(p)
            setNamed(true)
            setTab('own')
          }}
          onAdd={async (ps) => {
            setSaving(true)
            try {
              // each gets a name of its own, also against the others added in the same click
              const names = new Set(taken)
              const out = ps.map((p) => {
                let title = p.title.trim() || t('Yangi grafik')
                for (let n = 2; names.has(title.toLowerCase()); n++) title = `${p.title.trim()} (${n})`.slice(0, MAX_TITLE)
                names.add(title.toLowerCase())
                return { ...p, id: newChartId(), title }
              })
              await onSaveMany(out)
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : tab === 'picks' ? (
        <Picks page={page} datasets={datasets} disabled={saving} onPick={(p) => void save(p)} onTune={(p) => {
          setDraft(p)
          setNamed(true)
          setTab('own')
        }} />
      ) : (
        <Builder datasets={datasets} draft={draft} setDraft={setDraft} named={named} setNamed={setNamed} />
      )}
    </Sheet>
  )
}

function starter(ds: DatasetRuntime | undefined): Preset {
  const m = ds ? measuresOf(ds)[0] : undefined
  const d = ds ? dimsOf(ds).find((f) => f.field.id === 'sana') ?? dimsOf(ds)[0] : undefined
  return { title: '', dataset: ds?.spec.id ?? 'leads', measure: m?.field.id ?? '', dim: d?.field.id, visual: 'line' }
}

/* ---------------- quick picks ---------------- */

function Picks({ page, datasets, disabled, onPick, onTune }: { page: string; datasets: DatasetRuntime[]; disabled: boolean; onPick: (p: Preset) => void; onTune: (p: Preset) => void }) {
  const { t } = useT()
  const picks = useMemo(() => {
    const byId = new Map(datasets.map((d) => [d.spec.id, d]))
    return quickPicks(page).filter((p) => {
      const ds = byId.get(p.dataset)
      return !!ds && !!ds.byId.get(p.measure)?.compiled && (!p.dim || !!ds.byId.get(p.dim)?.compiled)
    })
  }, [page, datasets])
  if (!picks.length) return <p className="px-5 py-10 text-center text-[0.875rem] text-ink-3">{t("Bu loyihada grafik uchun ma'lumot hali yo'q")}</p>
  return (
    <div className="grid gap-3 px-5 pt-1 pb-5 sm:grid-cols-2">
      {picks.map((p) => (
        <article key={`${p.dataset}:${p.title}`} className="flex min-w-0 flex-col rounded-[20px] border border-line bg-surface-2/50 p-3">
          <h3 className="truncate text-[0.875rem] font-semibold text-ink">{t(p.title)}</h3>
          <p className="truncate text-[0.75rem] text-ink-3">{t(VISUAL_LABELS[p.visual])}</p>
          <LazyPreview preset={p} />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="primary" icon={Plus} disabled={disabled} onClick={() => onPick({ ...p, title: t(p.title) })}>
              {t("Qo'shish")}
            </Button>
            <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onTune({ ...p, title: t(p.title) })}>
              {t('Sozlash')}
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

/** a pick's live preview, drawn once it scrolls into view */
function LazyPreview({ preset }: { preset: Preset }) {
  const el = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!el.current) return
    const io = new IntersectionObserver(([e]) => e!.isIntersecting && setShow(true), { rootMargin: '120px' })
    io.observe(el.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={el} className="pointer-events-none mt-2 h-[130px] overflow-hidden">
      {show ? <Preview preset={preset} height={130} /> : <Skeleton className="h-[130px] rounded-[14px]" />}
    </div>
  )
}

function Preview({ preset, height }: { preset: Preset; height: number }) {
  const { range, selectors } = usePageSelectors()
  const spec = useMemo(() => toSpec({ ...preset, id: 'preview' }), [preset])
  return <ChartView spec={spec} range={range} selectors={selectors} height={height} />
}

/* ---------------- "O'zim tuzaman" ---------------- */

function Builder({
  datasets,
  draft,
  setDraft,
  named,
  setNamed,
}: {
  datasets: DatasetRuntime[]
  draft: Preset
  setDraft: (f: (d: Preset) => Preset) => void
  named: boolean
  setNamed: (v: boolean) => void
}) {
  const { t } = useT()
  const be = useBlockEdit()
  const slug = be?.scope.kind === 'live' ? be.scope.slug : null
  // every change by hand or by AI can be undone ("Oldingi holat"); typing a name or a goal is not a step
  const [history, setHistory] = useState<Preset[]>([])
  const remember = () => setHistory((h) => [...h.slice(-19), draft])
  const undo = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(history.slice(0, -1))
    setDraft(() => prev)
  }
  const ds = datasets.find((d) => d.spec.id === draft.dataset) ?? datasets[0]
  const measures = ds ? measuresOf(ds) : []
  const dims = ds ? dimsOf(ds) : []
  const measure = ds?.byId.get(draft.measure)
  const dim = draft.dim ? ds?.byId.get(draft.dim) : undefined
  const { range, selectors } = usePageSelectors()
  const spec = useMemo(() => toSpec({ ...draft, id: 'draft', title: draft.title || 'draft' }), [draft])
  // the forms this data can be drawn as (the chart pencil's rules, on the cut even while KPI is chosen); KPI alone without a cut
  const probe = useMemo(() => (spec.visual === 'kpi' && draft.dim ? toSpec({ ...draft, id: 'probe', visual: 'column' }) : spec), [spec, draft])
  const { res } = useChartData(probe, range, selectors)
  const allowed = useMemo(() => {
    // Bento blocks: the goal tracker and the diagnostic card need no cut, the queue a table of records
    const bento: VisualType[] = ['pacing', 'diagnostic', ...(QUEUE_DATASETS.has(draft.dataset) ? (['queue'] as const) : [])]
    if (!draft.dim) return new Set<VisualType>(['kpi', ...bento])
    const s = res ? rankVisuals(shapeFromSpec(probe, res)).map((r) => r.visual) : BUILDER_VISUALS
    // a second cut / a line measure is picked right below when one of these is chosen
    return new Set<VisualType>([...s, 'table', 'kpi', 'stacked', 'heatmap', 'combo', 'scorecard', 'matrix', ...bento])
  }, [draft.dim, draft.dataset, res, probe])

  // the name follows the choice until it is typed
  const autoTitle = measure ? (dim ? `${t(measure.field.name)} — ${t(dim.field.name)}` : t(measure.field.name)) : ''
  useEffect(() => {
    if (!named && autoTitle && draft.title !== autoTitle) setDraft((d) => ({ ...d, title: autoTitle }))
  }, [named, autoTitle, draft.title, setDraft])

  const set = (p: Partial<Preset>) => {
    remember()
    setDraft((d) => ({ ...d, ...p }))
  }
  const pickDataset = (id: string) => {
    const next = datasets.find((d) => d.spec.id === id)
    if (!next) return
    remember()
    const s = starter(next)
    setDraft((d) => ({ ...s, visual: d.visual === 'kpi' ? 'kpi' : 'line', wide: d.wide }))
  }
  const pickDim = (id: string | undefined) => {
    const f = id ? ds?.byId.get(id) : undefined
    const time = !!f && (f.compiled?.type === 'date' || f.field.format === 'hour' || f.field.format === 'weekday')
    const stages = !!f && /bosqich|holat/i.test(f.field.name)
    // a sensible form for the new cut; the user can change it below (current stages are shares of a whole: a donut)
    const visual: VisualType = !id ? 'kpi' : time ? 'line' : stages ? 'donut' : draft.visual === 'kpi' || draft.visual === 'line' || draft.visual === 'area' ? 'bar' : draft.visual
    set({ dim: id, visual })
  }
  // a stacked / heatmap needs a second cut, a combo a line measure: a fitting one is picked, changeable below
  const otherDims = dims.filter((d) => d.field.id !== draft.dim)
  const otherMeasures = measures.filter((m) => m.field.id !== draft.measure)
  const pickVisual = (v: VisualType) => {
    const p: Partial<Preset> = { visual: v }
    if ((v === 'stacked' || v === 'heatmap' || v === 'matrix') && (!draft.color || draft.color === draft.dim)) {
      const prefer = v === 'heatmap' ? ['hafta_kuni', 'soat'] : ['bosqich', 'holat', 'manba']
      p.color = (prefer.map((id) => otherDims.find((d) => d.field.id === id)).find(Boolean) ?? otherDims[0])?.field.id
    }
    if (v === 'combo' && (!draft.secondMeasure || draft.secondMeasure === draft.measure))
      p.secondMeasure = (otherMeasures.find((m) => m.field.format === 'percent') ?? otherMeasures[0])?.field.id
    set(p)
  }
  const goalFits = ['line', 'area', 'column', 'bar', 'combo', 'pacing'].includes(spec.visual)

  return (
    <div className="grid gap-5 px-5 pt-1 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {slug ? (
          <AiTuneBox
            slug={slug}
            draft={draft}
            datasets={datasets}
            canUndo={history.length > 0}
            onUndo={undo}
            onApply={(p, renamed) => {
              remember()
              setDraft(() => p)
              if (renamed) setNamed(true)
            }}
          />
        ) : (
          history.length > 0 && (
            <button type="button" onClick={undo} className="inline-flex items-center gap-1 self-end text-[0.75rem] font-semibold text-primary-strong">
              <Undo2 aria-hidden size={13} /> {t('Oldingi holat')}
            </button>
          )
        )}
        <Step n={1} title={t("Ma'lumot")}>
          {datasets.map((d) => (
            <Chip key={d.spec.id} on={d.spec.id === ds?.spec.id} onClick={() => pickDataset(d.spec.id)}>
              {t(d.spec.name)}
            </Chip>
          ))}
        </Step>
        <Step n={2} title={t("O'lchov")} hint={t('soni, summa, o‘rtacha yoki ulush %')}>
          {measures.map((m) => (
            <Chip key={m.field.id} on={m.field.id === draft.measure} onClick={() => set({ measure: m.field.id })}>
              {t(m.field.name)}
            </Chip>
          ))}
        </Step>
        <Step n={3} title={t('Kesim')} hint={t("Bitrix24 maydonlari: manba, mas'ul, bosqich, sana, UTM …")}>
          <Chip on={!draft.dim} onClick={() => pickDim(undefined)}>
            {t('Kesimsiz — bitta raqam')}
          </Chip>
          {dims.map((d) => (
            <Chip key={d.field.id} on={d.field.id === draft.dim} onClick={() => pickDim(d.field.id)}>
              {t(d.field.name)}
            </Chip>
          ))}
        </Step>
        <Step n={4} title={t('Grafik turi')}>
          {BUILDER_VISUALS.map((v) => (
            <Chip key={v} on={v === spec.visual} disabled={!allowed.has(v)} onClick={() => pickVisual(v)}>
              {t(VISUAL_LABELS[v])}
            </Chip>
          ))}
        </Step>
        {(spec.visual === 'stacked' || spec.visual === 'heatmap' || spec.visual === 'matrix') && (
          <Step n="+" title={t('Ikkinchi kesim (rang / qator)')}>
            {otherDims.map((d) => (
              <Chip key={d.field.id} on={d.field.id === draft.color} onClick={() => set({ color: d.field.id })}>
                {t(d.field.name)}
              </Chip>
            ))}
          </Step>
        )}
        {(spec.visual === 'combo' || spec.visual === 'diagnostic') && (
          <Step n="+" title={t(spec.visual === 'combo' ? "Ikkinchi o'lchov (chiziq)" : "Ikkinchi o'lchov")}>
            {otherMeasures.map((m) => (
              <Chip key={m.field.id} on={m.field.id === draft.secondMeasure} onClick={() => set({ secondMeasure: m.field.id })}>
                {t(m.field.name)}
              </Chip>
            ))}
          </Step>
        )}
        {(spec.visual === 'diagnostic' || spec.visual === 'pacing') && (
          <Step n="+" title={t('Izoh')}>
            <TextField
              aria-label={t('Izoh')}
              value={draft.note ?? ''}
              maxLength={MAX_NOTE}
              className="w-full"
              onChange={(e) => {
                const note = e.target.value.replace(/[<>]/g, '')
                setDraft((d) => ({ ...d, note: note || undefined }))
              }}
            />
          </Step>
        )}
        {goalFits && (
          <Step n="+" title={t("Maqsad chizig'i")} hint={measure ? t(measure.field.name) : undefined}>
            <TextField
              aria-label={t("Maqsad chizig'i")}
              type="number"
              inputMode="decimal"
              placeholder={t("Masalan: 15 (ulush uchun 0,25 = 25%)")}
              value={draft.goal ?? ''}
              className="min-w-0 flex-1"
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace(',', '.'))
                setDraft((d) => ({ ...d, goal: Number.isFinite(v) ? v : undefined }))
              }}
            />
            {draft.goal != null && (
              <Button size="sm" variant="ghost" onClick={() => set({ goal: undefined })}>
                {t('Olib tashlash')}
              </Button>
            )}
          </Step>
        )}
        <Step n={5} title={t('Nomi')}>
          <TextField
            aria-label={t('Grafik nomi')}
            value={draft.title}
            maxLength={MAX_TITLE}
            className="w-full"
            onChange={(e) => {
              setNamed(true)
              const title = e.target.value.replace(/[<>]/g, '')
              setDraft((d) => ({ ...d, title }))
            }}
          />
          <div className="mt-2 flex w-full items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-ink-2">{t('Butun qator kengligida')}</span>
            <Switch checked={!!draft.wide} label={t('Butun qator kengligida')} onChange={(v) => set({ wide: v })} />
          </div>
          {draft.filter && (
            <p className="mt-2 w-full text-[0.75rem] text-ink-3">
              {t('Faqat')}: {draft.filter.values.map((v) => t(v)).join(', ')}{' '}
              <button type="button" className="font-semibold text-primary-strong" onClick={() => set({ filter: undefined })}>
                {t('Olib tashlash')}
              </button>
            </p>
          )}
          {draft.exclude && (
            <p className="mt-1 w-full text-[0.75rem] text-ink-3">
              {t('Chiqarib tashlandi')}: {draft.exclude.values.map((v) => t(v)).join(', ')}{' '}
              <button type="button" className="font-semibold text-primary-strong" onClick={() => set({ exclude: undefined })}>
                {t('Olib tashlash')}
              </button>
            </p>
          )}
        </Step>
      </div>
      {/* on a phone the preview comes first, above the long lists of choices */}
      <div className="order-first min-w-0 lg:sticky lg:top-[72px] lg:order-none lg:self-start">
        <div className="rounded-[22px] border border-line bg-surface-2/40 p-3">
          <p className="mb-2 truncate text-[0.9375rem] font-semibold text-ink">{draft.title || t('Yangi grafik')}</p>
          <ChartView spec={spec} range={range} selectors={selectors} height={spec.visual === 'kpi' ? 140 : 300} />
        </div>
        <p className="mt-2 text-[0.75rem] text-ink-3">{t("Ko'rinish jonli: sahifadagi davr va filtrlar qo'llangan")}</p>
      </div>
    </div>
  )
}

function Step({ n, title, hint, children }: { n: number | string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 flex items-baseline gap-2 text-[0.8125rem] font-semibold text-ink">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-[0.6875rem] text-primary-strong">{n}</span>
        {title}
        {hint && <span className="truncate font-normal text-ink-3">{hint}</span>}
      </h4>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  )
}

function Chip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'chip pressable min-h-[32px] cursor-pointer',
        on ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-primary-soft font-semibold text-primary-strong' : 'hover:bg-[var(--surface-hover)]',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  )
}
