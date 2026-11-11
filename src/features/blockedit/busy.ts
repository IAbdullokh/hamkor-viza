import { useSyncExternalStore } from 'react'

/**
 * "The dashboard is updating" for a short, visible moment (DataLens style): a filter or date change marks it, the
 * dashboard frame softly blurs its blocks with a small badge, then the new numbers fade in — the old ones stay readable,
 * nothing jumps or goes blank.
 */
let busyUntil = 0
let timer = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function markDashBusy(ms = 380): void {
  busyUntil = Math.max(busyUntil, Date.now() + ms)
  emit()
  window.clearTimeout(timer)
  timer = window.setTimeout(emit, Math.max(0, busyUntil - Date.now()) + 10)
}

export function useDashBusy(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => Date.now() < busyUntil,
    () => false,
  )
}
