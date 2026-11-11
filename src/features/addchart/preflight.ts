import { chartQuery, type SelectorFilter } from '@/charts/ChartView'
import type { Db } from '@/data/db'
import { VOCAB } from '@/data/domain'
import { getDataset, noValues, runQuery, type DatasetRuntime } from '@/data/query'
import type { DateRange } from '@/data/range'
import { isPlaceholder } from '@/data/customFields'
import { queueRecords } from '@/charts/BentoViews'
import { BENTO_VISUALS, isBotAccount, PERSON_DIMS, QUEUE_DATASETS, toSpec, type Preset } from './model'

/**
 * "✨ AI tavsiyasi" checks every chart on the page's own data before it is shown (owner, 2026-11-03: an AI card must
 * never say "Tanlangan davrda ma'lumot yo'q"): integration / bot accounts are left out of a manager or operator cut, a
 * filter that matches nothing is dropped, and a chart that is still empty is not offered at all.
 */

/** a portal's own stage names in a Bosqich filter → the names the dataset queries (selectors.ts does the same for the page) */
export function standardStages(values: string[], labels: Record<string, string> | undefined): string[] {
  const std = VOCAB.sales.stages as Record<string, string>
  const known = new Set(Object.values(std))
  return values.map((v) => {
    if (known.has(v)) return v
    const key = Object.keys(std).find((k) => labels?.[k] === v)
    return key ? std[key]! : v
  })
}

function empty(db: Db, ds: DatasetRuntime, p: Preset, range: DateRange | null, selectors: SelectorFilter[]): boolean {
  const res = runQuery(db, ds, chartQuery(ds, toSpec({ ...p, id: 'ai-check' }), range, selectors))
  return res.rows.length === 0 || noValues(ds, res) !== false
}

/** the bot / integration accounts among a person cut's values in this period (all of them, not only the top rows) */
function botsOf(db: Db, ds: DatasetRuntime, dim: string, measure: string, range: DateRange | null): string[] {
  const res = runQuery(db, ds, { dims: [dim], measures: [measure], filters: [], range })
  return [...new Set(res.rows.map((r) => r[0]).filter(isBotAccount).map(String))].slice(0, 20)
}

/** the placeholder texts ("N", "—") among a cut's values, when it also has real ones (an empty value no filter can name) */
function placeholdersOf(db: Db, ds: DatasetRuntime, dim: string, measure: string, range: DateRange | null): string[] {
  const values = runQuery(db, ds, { dims: [dim], measures: [measure], filters: [], range }).rows.map((r) => r[0])
  if (!values.some((v) => !isPlaceholder(v))) return []
  return [...new Set(values.filter((v): v is string => typeof v === 'string' && isPlaceholder(v)))].slice(0, 20)
}

/** forms that are one bar / one slice when the cut has a single value */
const SPARSE_FORMS = new Set(['bar', 'column', 'stacked', 'donut', 'pie', 'funnel', 'combo'])

/**
 * The card a too-thin chart becomes (owner, 2026-11-03: "never a 1-bar chart, never a 1-cell heatmap — on a portal with
 * 1 lead and 7 calls the card must still look like a rich executive widget"): the records to act on when there are any
 * (Jonli navbat), the goal tracker when it has a goal, else the diagnostic card.
 */
function richer(db: Db, ds: DatasetRuntime, p: Preset, range: DateRange | null, selectors: SelectorFilter[]): Preset {
  const base = { ...p, color: undefined }
  if (QUEUE_DATASETS.has(p.dataset) && queueRecords(db, ds, toSpec({ ...base, id: 'ai-check', visual: 'queue' }), range, selectors).length > 0)
    return { ...base, visual: 'queue' }
  if (typeof p.goal === 'number') return { ...base, visual: 'pacing' }
  return { ...base, visual: 'diagnostic' }
}

/** the chart, or the Bento block it becomes when its data is too thin to draw it (1 bar, a 1-cell heatmap) */
export function densityGate(db: Db, ds: DatasetRuntime, p: Preset, range: DateRange | null, selectors: SelectorFilter[]): Preset {
  if (BENTO_VISUALS.has(p.visual) || !p.dim || (p.visual !== 'heatmap' && !SPARSE_FORMS.has(p.visual))) return p
  const res = runQuery(db, ds, chartQuery(ds, toSpec({ ...p, id: 'ai-check' }), range, selectors))
  const vi = res.columns.filter((c) => c.kind === 'dimension').length
  const filled = res.rows.filter((r) => r.slice(vi).some((v) => typeof v === 'number' && v !== 0))
  if (p.visual === 'heatmap') {
    const xs = new Set(filled.map((r) => String(r[0])))
    const ys = new Set(filled.map((r) => String(r[1])))
    if (xs.size >= 2 && ys.size >= 2 && filled.length >= 4) return p
    return xs.size >= 2 && ys.size >= 2 ? { ...p, visual: 'matrix' } : richer(db, ds, p, range, selectors)
  }
  return new Set(filled.map((r) => String(r[0]))).size < 2 ? richer(db, ds, p, range, selectors) : p
}

/** the chart as it may be offered (bots left out, a dead filter dropped), or null when it has nothing to draw */
export function preflight(db: Db, preset: Preset, range: DateRange | null, selectors: SelectorFilter[]): Preset | null {
  let ds: DatasetRuntime
  try {
    ds = getDataset(db.wsId, preset.dataset)
  } catch {
    return null
  }
  try {
    let p = preset
    const person = [preset.dim, preset.color].find((d) => d && PERSON_DIMS.has(d))
    if (person) {
      const bots = botsOf(db, ds, person, preset.measure, range)
      if (bots.length) p = { ...p, exclude: { field: person, values: bots } }
    }
    // Bitrix's "N" / "—" on unfilled leads (a custom field, a reason) is not a category: left out of the main cut
    if (preset.dim && (!p.exclude || p.exclude.field === preset.dim)) {
      const empty = placeholdersOf(db, ds, preset.dim, preset.measure, range)
      if (empty.length) p = { ...p, exclude: { field: preset.dim, values: [...new Set([...(p.exclude?.values ?? []), ...empty])].slice(0, 20) } }
    }
    if (!empty(db, ds, p, range, selectors)) return densityGate(db, ds, p, range, selectors)
    if (p.filter) {
      const open = { ...p, filter: undefined }
      if (!empty(db, ds, open, range, selectors)) return densityGate(db, ds, open, range, selectors)
    }
    return null
  } catch {
    // a field this dashboard cannot compute: not offered
    return null
  }
}
