import { readLocal, writeLocal } from '@/lib/storage'
import type { RangeKey } from '@/data/range'
import type { DayRange } from '@/ui/dateRange'

/**
 * Each viewer's last filters per dashboard page, in this browser (2026-11-11, a client's analyst: "every refresh clears
 * the filters — remembering the last filter is a good idea too"): the page's Davr and its own selects (kit/filters.tsx)
 * come back after a reload; «Tozalash» clears them here too. Only well-formed values are read back (a stored value from
 * an older build, or a hand-edited one, is ignored); storage that throws is ignored (lib/storage).
 */
export interface StoredMulti {
  values: string[]
  exclude: boolean
}

export interface PageMemory<K extends string = string> {
  preset: RangeKey | DayRange
  multi: Partial<Record<K, StoredMulti>>
}

const RANGE_KEYS: readonly RangeKey[] = ['today', 'yesterday', '7d', 'week', 'month', 'prevMonth', '30d', '90d', 'all']
const DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_VALUES = 200

/** where a page's filters live: scope = "live:<slug>" / "demo:<id>" */
export const memoryKey = (scope: string, page: string) => `d365.pagefilters.${scope}|${page}`

function preset(v: unknown): RangeKey | DayRange | null {
  if (typeof v === 'string') return (RANGE_KEYS as readonly string[]).includes(v) ? (v as RangeKey) : null
  if (v && typeof v === 'object') {
    const { from, to } = v as { from?: unknown; to?: unknown }
    if (typeof from === 'string' && typeof to === 'string' && DAY.test(from) && DAY.test(to) && from <= to) return { from, to }
  }
  return null
}

function multi(v: unknown): StoredMulti | null {
  if (!v || typeof v !== 'object') return null
  const { values, exclude } = v as { values?: unknown; exclude?: unknown }
  if (!Array.isArray(values) || typeof exclude !== 'boolean') return null
  return { values: values.filter((x): x is string => typeof x === 'string').slice(0, MAX_VALUES), exclude }
}

/** a stored value → the page's filters (only the page's own keys), or null when nothing usable is stored */
export function parseMemory<K extends string>(raw: unknown, keys: readonly K[]): PageMemory<K> | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { preset?: unknown; multi?: unknown }
  const p = preset(r.preset)
  if (!p) return null
  const m: Partial<Record<K, StoredMulti>> = {}
  if (r.multi && typeof r.multi === 'object')
    for (const k of keys) {
      const x = multi((r.multi as Record<string, unknown>)[k])
      if (x) m[k] = x
    }
  return { preset: p, multi: m }
}

export const readMemory = <K extends string>(key: string, keys: readonly K[]): PageMemory<K> | null => parseMemory(readLocal<unknown>(key, null), keys)

export function writeMemory<K extends string>(key: string, mem: PageMemory<K>): void {
  writeLocal(key, mem)
}

// ───────────────────────────── the added filters' values ("+ Filtr", livefilters/FilterScope) ─────────────────────────────

/** what the viewer picked in a dashboard's added filters: "page|field" → a value, or null = cleared */
export type PickedValues = Record<string, PickedValue | null>
export interface PickedValue {
  values?: string[]
  exclude?: boolean
  from?: string
  to?: string
  min?: number
  max?: number
  q?: string
  is?: boolean
}

export const pickedKey = (scope: string) => `d365.picked.${scope}`
const PICK_KEY = /^[a-z]{2,20}\|(?:[a-z][a-z0-9_]{0,39}|uf:(?:lead|deal):[A-Za-z0-9_]{1,100})$/
const MAX_PICKED = 200

function pickedValue(v: unknown): PickedValue | null | undefined {
  if (v === null) return null
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
  const r = v as Record<string, unknown>
  const out: PickedValue = {}
  if (Array.isArray(r.values)) out.values = r.values.filter((x): x is string => typeof x === 'string').slice(0, MAX_VALUES)
  for (const k of ['exclude', 'is'] as const) if (typeof r[k] === 'boolean') out[k] = r[k] as boolean
  for (const k of ['from', 'to', 'q'] as const) if (typeof r[k] === 'string') out[k] = (r[k] as string).slice(0, 200)
  for (const k of ['min', 'max'] as const) if (typeof r[k] === 'number' && Number.isFinite(r[k])) out[k] = r[k] as number
  return out
}

/** a stored value → the picked values (well-formed entries only) */
export function parsePicked(raw: unknown): PickedValues {
  const out: PickedValues = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  let n = 0
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= MAX_PICKED || !PICK_KEY.test(k)) continue
    const x = pickedValue(v)
    if (x === undefined) continue
    out[k] = x
    n++
  }
  return out
}

export const readPicked = (scope: string): PickedValues => parsePicked(readLocal<unknown>(pickedKey(scope), null))
export const writePicked = (scope: string, picked: PickedValues): void => writeLocal(pickedKey(scope), picked)
