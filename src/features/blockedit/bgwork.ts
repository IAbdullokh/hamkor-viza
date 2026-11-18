import { useSyncExternalStore } from 'react'
import type { BlockScope } from './context'

/**
 * Work on a block that goes on after its editor is closed (owner, 2026-11-03: "it should be free to leave — and after
 * leaving there should be a sign that something is working right now on that card"): Nova's answer in the block chat and
 * the block's "AI tavsiyasi". The work runs here, outside the editor; the editor shows it again when the block is opened
 * (still thinking, or its result), and the block on the page shows a small sign while it runs (EditableBlock).
 * On a live dashboard Nova's answer is also a job of the server's own (blockjob.ts), so a reload loses nothing: the
 * dashboard watches the server's jobs (watchBg) for the signs, and the block's chat takes the answer when it is opened.
 */
export type BgKind = 'chat' | 'tips'
export interface BgEntry {
  running: boolean
  /** the last finished work's result (the chat's messages, the suggestions' reply) */
  result?: unknown
  /** an answer is waiting on the server for the block's chat to take it (the sign says so) */
  ready?: boolean
  /** who runs it: the editor's own work, or the dashboard watching a server job begun before a reload */
  owner?: 'work' | 'watch'
}

const IDLE: BgEntry = { running: false }
const entries = new Map<string, BgEntry>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const scopeOf = (scope: BlockScope) => (scope.kind === 'live' ? `live:${scope.slug}` : `demo:${scope.id}`)
export const bgKey = (kind: BgKind, scope: BlockScope, blockId: string): string => `${kind}|${scopeOf(scope)}|${blockId}`

/** runs `work` for `key` (one at a time per key); its result is kept for an editor opened later */
export async function runBg<T>(key: string, work: () => Promise<T>): Promise<T> {
  entries.set(key, { running: true, result: entries.get(key)?.result, owner: 'work' })
  emit()
  let ok = false
  let result: T | undefined
  try {
    result = await work()
    ok = true
    return result
  } finally {
    entries.set(key, { running: false, result: ok ? result : entries.get(key)?.result })
    emit()
  }
}

/**
 * The dashboard watching a server job begun before a reload (blockjob.ts): the sign while `poll` says it runs, then "an
 * answer is waiting" when it ended untaken. The block's own chat taking over (runBg) wins.
 */
export async function watchBg(key: string, poll: () => Promise<'running' | 'ready' | 'gone'>): Promise<void> {
  if (entries.get(key)?.running) return
  entries.set(key, { ...entries.get(key), running: true, owner: 'watch' })
  emit()
  let end: 'running' | 'ready' | 'gone' = 'running'
  try {
    while (end === 'running' && entries.get(key)?.owner === 'watch') {
      await new Promise((r) => setTimeout(r, 3000))
      end = await poll().catch(() => 'running' as const)
    }
  } finally {
    if (entries.get(key)?.owner === 'watch') {
      entries.set(key, { result: entries.get(key)?.result, running: false, ready: end === 'ready' })
      emit()
    }
  }
}

/** marks an answer waiting on the server (the dashboard's list said so at load) */
export function markReady(key: string): void {
  if (entries.get(key)?.running) return
  entries.set(key, { ...entries.get(key), running: false, ready: true })
  emit()
}

export const bgEntry = (key: string): BgEntry => entries.get(key) ?? IDLE

/** a key's work: running or not, and its last result */
export function useBg(key: string): BgEntry {
  return useSyncExternalStore(subscribe, () => bgEntry(key), () => IDLE)
}

/** what is going on on this block now (its sign): work running, an answer waiting, or nothing */
export function useBlockWorking(scope: BlockScope | undefined, blockId: string): 'working' | 'ready' | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!scope || !blockId) return null
      const chat = bgEntry(bgKey('chat', scope, blockId))
      if (chat.running || bgEntry(bgKey('tips', scope, blockId)).running) return 'working'
      return chat.ready ? 'ready' : null
    },
    () => null,
  )
}
