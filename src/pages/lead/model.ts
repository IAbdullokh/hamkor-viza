import { STAGE_KEYS, type StageKey } from '@/data/domain'
import { useMeta } from '@/data/source'
import type { Lead } from '@/data/types'
import type { SnapshotMeta } from '@/features/projects/types'

/**
 * Lead-page metrics (docs/default-dashboard/lead.json), mapped onto the demo lead fields:
 * - Sifatli lid       = lead.qualified (reached "Sifatli lid" or later; like the AIST set it keeps leads later lost — Bekor bo'ldi)
 * - Tashrif belgilandi = lead.booked   (sticky flag ≈ the Bitrix UF "Tashrif belgilandi" date being filled, not the current stage)
 * - Tashrif buyurdi   = lead.visited  (reached "Uchrashuv bo'ldi" = CONVERTED / success)
 * - Jarayonda         = Bitrix semantic P: stage new / contact / qualified / booked. "Uchrashuv bo'ldi" (visited) is treated
 *                       as Bitrix 'S' (CONVERTED), so Jarayonda and Tashrif buyurdi never count the same lead twice
 * - Sifatsiz lid      = stage junk, Bekor bo'ldi = stage lost, except an archived lead ("Sandiq" / "Arxiv": stage lost on
 *                       the wire, lead.archived) — lead.json: Sandiq is excluded (review 2026-11-04)
 * - Qo'ng'iroq        = source in meta.callSources (the Звонок card; "Qo'ng'iroq" in the demo)
 *
 * Stage labels and the call sources come from the data source's vocabulary (useMeta), so `leadModel(meta)` builds them.
 */
export type MetricKey = 'umumiy' | 'jarayonda' | 'sifatli' | 'belg' | 'buy' | 'sifatsiz' | 'bekor' | 'zvonok'

export type Counts = Record<MetricKey, number>
export type Tests = Record<MetricKey, (l: Lead) => boolean>

export interface GRow {
  key: string
  label: string
  leads: Lead[]
  c: Counts
}

export interface LeadModel {
  TEST: Tests
  count(leads: Lead[]): Counts
  /** Group leads by a key; empty / null keys become "Belgilanmagan". */
  groupBy(leads: Lead[], keyOf: (l: Lead) => string | null | undefined): GRow[]
  stageLabel(s: StageKey): string
  /** the lead's real stage (a live project: its Bitrix stage), else its group's label — the stage table / filter / column */
  leadStage(l: Lead): string
  /** the stage buckets in order: a live project's real Bitrix stages (SORT order), else the groups' labels */
  STAGE_LABELS: string[]
  /** `labels` in the stage order (STAGE_LABELS first, then any stage the list does not know, e.g. an archived one) */
  stageOrder(labels: Iterable<string>): string[]
}

const models = new WeakMap<SnapshotMeta, LeadModel>()

/** Metric predicates + stage labels of one data source (cached per meta object). */
export function leadModel(meta: Pick<SnapshotMeta, 'leadStageLabels' | 'callSources' | 'leadStages'>): LeadModel {
  const cached = models.get(meta as SnapshotMeta)
  if (cached) return cached
  const calls = new Set(meta.callSources)
  const TEST: Tests = {
    umumiy: () => true,
    jarayonda: (l) => l.stage === 'new' || l.stage === 'contact' || l.stage === 'qualified' || l.stage === 'booked',
    sifatli: (l) => l.qualified,
    belg: (l) => l.booked,
    buy: (l) => l.visited,
    sifatsiz: (l) => l.stage === 'junk',
    bekor: (l) => l.stage === 'lost' && !l.archived,
    zvonok: (l) => calls.has(l.source),
  }
  const keys = Object.keys(TEST) as MetricKey[]
  const count = (leads: Lead[]): Counts => {
    const c: Counts = { umumiy: 0, jarayonda: 0, sifatli: 0, belg: 0, buy: 0, sifatsiz: 0, bekor: 0, zvonok: 0 }
    for (const l of leads) for (const k of keys) if (TEST[k](l)) c[k]++
    return c
  }
  const groupBy = (leads: Lead[], keyOf: (l: Lead) => string | null | undefined): GRow[] => {
    const m = new Map<string, Lead[]>()
    for (const l of leads) {
      const k = keyOf(l) || 'Belgilanmagan'
      let arr = m.get(k)
      if (!arr) m.set(k, (arr = []))
      arr.push(l)
    }
    return [...m].map(([key, ls]) => ({ key, label: key, leads: ls, c: count(ls) })).sort((a, b) => b.c.umumiy - a.c.umumiy)
  }
  const stageLabel = (s: StageKey) => meta.leadStageLabels[s]
  // the real stages (owner, 2026-10-24: a group named after its fullest stage showed 303 "Kelmadi" leads where Bitrix had 81)
  const leadStage = (l: Lead) => l.stage_name || stageLabel(l.stage)
  const STAGE_LABELS = meta.leadStages?.length ? meta.leadStages.map((s) => s.label) : STAGE_KEYS.map(stageLabel)
  const stageOrder = (labels: Iterable<string>) => {
    const set = new Set(labels)
    return [...STAGE_LABELS.filter((s) => set.has(s)), ...[...set].filter((s) => !STAGE_LABELS.includes(s))]
  }
  const model: LeadModel = { TEST, count, groupBy, stageLabel, leadStage, STAGE_LABELS, stageOrder }
  models.set(meta as SnapshotMeta, model)
  return model
}

/** The lead model of the current data source. */
export function useLeadModel(): LeadModel {
  return leadModel(useMeta())
}

export const pad = (n: number) => String(n).padStart(2, '0')
export const fmtDay = (day: string) => day.split('-').reverse().join('.')
export const fmtTime = (ts: number) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
