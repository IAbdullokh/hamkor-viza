import { useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from '@/lib/storage'
import type { Sizing } from './layout'

/** "O'lcham: Avtomatik | Qo'lda" (layout.ts Sizing): how this editor's drags size a card — kept in this browser */
const KEY = 'd365.block-sizing'
let mode: Sizing = readLocal<string>(KEY, 'auto') === 'manual' ? 'manual' : 'auto'
const listeners = new Set<() => void>()

export function setSizing(next: Sizing): void {
  mode = next
  writeLocal(KEY, next)
  listeners.forEach((l) => l())
}

export const getSizing = (): Sizing => mode

export function useSizing(): Sizing {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSizing,
    getSizing,
  )
}
