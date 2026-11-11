import type { BlockEdits, BlockPatch } from './context'
import { isEmptyPatch } from './order'

/**
 * The editor's draft of the block edits, saved without ever putting back an older state (owner, 2026-11-09: "I change the
 * places, I leave and come back — they are back where they were"). The draft keeps the whole block map, so a save is the
 * whole map: a save that lands after a newer one (a retry after a network blip), or one from a tab opened earlier, used to
 * wipe the newer change. Now:
 * - the saves of one page go one after another (a queue), each on the version the one before it left;
 * - each says the version it was made on; the server refuses a stale one (409 STATE_CONFLICT) with what is there now, and
 *   the change is merged onto that (mergeEdits: block by block, field by field — what this page changed wins, the rest is
 *   theirs) and saved again.
 * Pure and testable: the server call is given (`put`).
 */

export type PutResult = { ok: true; version?: string } | { ok: false; conflict: { version: string; value: BlockEdits } }
export type Put = (value: BlockEdits, version: string | undefined) => Promise<PutResult>

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * `mine` made from `base`, merged onto `theirs` (another save made from the same base): for every block and every field
 * of it, the value this page changed (differs from base) wins, any other is theirs. A block this page removed (back to the
 * original) stays removed unless they changed it; patches left empty are dropped.
 */
export function mergeEdits(base: BlockEdits, mine: BlockEdits, theirs: BlockEdits): BlockEdits {
  const out: BlockEdits = {}
  const ids = new Set([...Object.keys(theirs), ...Object.keys(mine), ...Object.keys(base)])
  for (const id of ids) {
    const b = base[id]
    const m = mine[id]
    const t = theirs[id]
    if (same(m, b)) {
      if (t) out[id] = t
      continue
    }
    if (!m) {
      // removed here: gone, unless they changed it since
      if (t && !same(t, b)) out[id] = t
      continue
    }
    const p: Record<string, unknown> = { ...(t ?? {}) }
    const fields = new Set([...Object.keys(m), ...Object.keys(b ?? {})])
    for (const f of fields) {
      const mv = (m as Record<string, unknown>)[f]
      const bv = (b as Record<string, unknown> | undefined)?.[f]
      if (same(mv, bv)) continue
      if (mv === undefined) delete p[f]
      else p[f] = mv
    }
    if (!isEmptyPatch(p as BlockPatch)) out[id] = p as BlockPatch
  }
  return out
}

export interface DraftSync {
  /** the server's version of the draft's blocks and the value it stands for (after a load, a publish, a discard) */
  reset: (version: string | undefined, value: BlockEdits | undefined) => void
  /** saves `value` after the saves before it; resolves with what was stored (merged when a newer save was there) */
  store: (value: BlockEdits) => Promise<BlockEdits>
  /** resolves when every save asked so far has ended (stored or failed) */
  idle: () => Promise<void>
  readonly version: string | undefined
}

/** at most this many merges in a row before a save gives up (someone else saving all the time) */
const MAX_MERGES = 4

export function draftSync(put: Put): DraftSync {
  let version: string | undefined
  // what the server holds for `version` (the base of the next merge)
  let synced: BlockEdits | undefined
  // the value the last store() was given and what the last finished save stored: a queued save made from the one before
  // it is merged onto what that one really stored when the two differ (it was merged with a newer save)
  let lastGiven: BlockEdits | undefined
  let lastStored: BlockEdits | undefined
  let tail: Promise<unknown> = Promise.resolve()
  return {
    reset(v, value) {
      version = v
      synced = value
      lastGiven = value
      lastStored = value
    },
    store(value) {
      const from = lastGiven
      lastGiven = value
      const run = tail.then(async () => {
        let next = from !== undefined && lastStored !== undefined && lastStored !== from ? mergeEdits(from, value, lastStored) : value
        for (let i = 0; ; i++) {
          let r: PutResult
          try {
            r = await put(next, version)
          } catch (e) {
            // not stored: the page goes back to what the server has; the next change starts from it
            lastGiven = lastStored
            throw e
          }
          if (r.ok) {
            if (r.version !== undefined) version = r.version
            synced = next
            lastStored = next
            return next
          }
          if (i >= MAX_MERGES) {
            lastGiven = lastStored
            throw new Error('draft conflict')
          }
          next = mergeEdits(synced ?? {}, next, r.conflict.value)
          version = r.conflict.version
          synced = r.conflict.value
        }
      })
      tail = run.catch(() => undefined)
      return run
    },
    idle: () => tail.then(() => undefined),
    get version() {
      return version
    },
  }
}
