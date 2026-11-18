import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from '@/lib/storage'
import type { DatasetField } from '@/spec'

/**
 * Calculated fields users add in the dataset editor. Stored per workspace + dataset; the query engine merges
 * them into the dataset, so a new field is immediately available in the chart Wizard, SQL and dashboards.
 */
type Store = Record<string, DatasetField[]>

const KEY = 'nazar.userFields'
let store: Store = readLocal<Store>(KEY, {})
let version = 0
const listeners = new Set<() => void>()

const k = (ws: string, ds: string) => `${ws}|${ds}`

export function userFields(ws: string, ds: string): DatasetField[] {
  return store[k(ws, ds)] ?? []
}

export function saveUserField(ws: string, ds: string, field: DatasetField): void {
  const list = userFields(ws, ds).filter((f) => f.id !== field.id)
  store = { ...store, [k(ws, ds)]: [...list, { ...field, calculated: true }] }
  commit()
}

export function removeUserField(ws: string, ds: string, id: string): void {
  store = { ...store, [k(ws, ds)]: userFields(ws, ds).filter((f) => f.id !== id) }
  commit()
}

function commit() {
  version++
  writeLocal(KEY, store)
  listeners.forEach((l) => l())
}

export function userFieldsVersion(): number {
  return version
}

/** Re-render when any user field changes. */
export function useUserFieldsVersion(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
    () => version,
  )
}
