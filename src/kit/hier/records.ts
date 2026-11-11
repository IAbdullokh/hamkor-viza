import { useMemo } from 'react'
import type { Lang } from '@/lib/settings'
import { fmtMonth } from '@/lib/format'
import type { SnapField, UfValue } from '@/features/projects/types'
import type { HierDim } from './tree'

/**
 * The breakdowns a lead / deal table can be nested by (table.levels keys, whitelisted in LiveBlocks.cs IsLevel):
 * Mas'ul, Manba, Bosqich, Sana (kun / hafta / oy), UTM (lead), Mahsulot / Filial (deal), and the portal's custom list
 * fields ("uf:UF_…"). Every record has `manager`, `source`, `day` (YYYY-MM-DD) and maybe `uf`.
 */
export interface HierRecord {
  manager: string
  source: string
  day: string
  uf?: Record<string, UfValue>
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtDay = (day: string) => day.split('-').reverse().join('.')
/** the Monday of the record's week, YYYY-MM-DD (so weeks sort as text) */
export function weekOf(day: string): string {
  const d = new Date(`${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const newestFirst = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0)

/** a custom field's value as a group key (a list → its first item; dates and numbers as text) */
const ufKey = (v: UfValue | undefined): string | null => (v === null || v === undefined || v === '' ? null : Array.isArray(v) ? (v[0] ?? null) : String(v))

export interface HierExtra<T> {
  key: string
  label: string
  keyOf: (r: T) => string | null | undefined
  order?: (a: string, b: string) => number
}

/**
 * The dims for `base` (always first) and the others: the common ones, the page's extras (stage, UTM, product …), and
 * the portal's custom list fields of `entity`.
 */
export function useRecordDims<T extends HierRecord>(base: string, extras: HierExtra<T>[], fields: SnapField[] | undefined, entity: 'lead' | 'deal', lang: Lang): HierDim<T>[] {
  return useMemo(() => {
    const all: HierDim<T>[] = [
      { key: 'source', label: 'Manba', keyOf: (r) => r.source },
      { key: 'manager', label: "Mas'ul", keyOf: (r) => r.manager },
      ...extras,
      { key: 'month', label: 'Sana (oy)', keyOf: (r) => r.day.slice(0, 7), order: newestFirst, title: (k) => (/^\d{4}-\d{2}$/.test(k) ? fmtMonth(new Date(`${k}-01T00:00:00`), lang) : k) },
      { key: 'week', label: 'Sana (hafta)', keyOf: (r) => weekOf(r.day), order: newestFirst, title: (k) => (/^\d{4}-\d{2}-\d{2}$/.test(k) ? `${fmtDay(k)} –` : k) },
      { key: 'day', label: 'Sana (kun)', keyOf: (r) => r.day, order: newestFirst, title: (k) => (/^\d{4}-\d{2}-\d{2}$/.test(k) ? fmtDay(k) : k) },
      ...(fields ?? [])
        .filter((f) => f.entity === entity && f.type === 'list' && /^UF_[A-Za-z0-9_]{1,60}$/.test(f.code))
        .slice(0, 20)
        .map<HierDim<T>>((f) => ({ key: `uf:${f.code}`, label: f.title, keyOf: (r) => ufKey(r.uf?.[f.code]) })),
    ]
    const first = all.find((d) => d.key === base)
    return first ? [first, ...all.filter((d) => d !== first)] : all
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extras are described by their keys
  }, [base, extras.map((e) => e.key).join(','), fields, entity, lang])
}
