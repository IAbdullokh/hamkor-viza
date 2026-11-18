import type { PortalField } from './portal'
import { portalKey } from './portal'

/**
 * Fields ticked in «Filtr maydonlari» whose data is still being read (portal.ts): they become filters once the reloaded
 * data has them, and until then show as a small chip with the read's state. Kept in this browser per dashboard page, so a
 * reload or a closed tab does not lose them (the read itself runs on the server).
 */
export interface WaitingField {
  key: string
  field: PortalField
  /** added as a hidden filter («Yashirin») once in the data */
  hidden: boolean
}

export const waitingKey = (scope: string, page: string) => `d365.waitfields.${scope}|${page}`

const safe = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

const isField = (f: unknown): f is PortalField => {
  const x = f as PortalField | null
  return !!x && (x.entity === 'lead' || x.entity === 'deal') && typeof x.code === 'string' && typeof x.title === 'string' && typeof x.kind === 'string'
}

export function readWaiting(key: string, store: Pick<Storage, 'getItem'> | undefined = safe()): WaitingField[] {
  try {
    const raw = JSON.parse(store?.getItem(key) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter((w) => isField((w as WaitingField)?.field)).map((w: WaitingField) => ({ key: portalKey(w.field), field: w.field, hidden: w.hidden === true }))
  } catch {
    return []
  }
}

export function writeWaiting(key: string, list: WaitingField[], store: Pick<Storage, 'setItem' | 'removeItem'> | undefined = safe()): boolean {
  try {
    if (!store) return false
    if (list.length) store.setItem(key, JSON.stringify(list))
    else store.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** the waiting list with `more` added (a field already waiting keeps its place, its hidden flag the newest) */
export function addWaiting(list: WaitingField[], more: PortalField[], hidden: boolean): WaitingField[] {
  const out = [...list]
  for (const field of more) {
    const key = portalKey(field)
    const at = out.findIndex((w) => w.key === key)
    if (at >= 0) out[at] = { ...out[at]!, hidden }
    else out.push({ key, field, hidden })
  }
  return out
}

/**
 * The waiting fields the data now has (`have`), split by how they are added — hidden ones only when the person may add
 * hidden filters now (`hideable`), else they keep waiting: a hidden filter is never added as one everybody sees.
 */
export function arrived(list: WaitingField[], have: { has: (key: string) => boolean }, hideable: boolean): { shown: string[]; hidden: string[]; rest: WaitingField[] } {
  const shown: string[] = []
  const hidden: string[] = []
  const rest: WaitingField[] = []
  for (const w of list) {
    if (!have.has(w.key) || (w.hidden && !hideable)) rest.push(w)
    else (w.hidden ? hidden : shown).push(w.key)
  }
  return { shown, hidden, rest }
}
