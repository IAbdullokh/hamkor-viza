/**
 * "← Ortga" / "Oldinga →" for a dashboard page (owner, 2026-10-26: "there should be a button to cancel — on every chart;
 * after I change something there should be a way back. Or like in Chrome: a button to go BACK and to go FORWARD").
 * One history per page, for the page session (not stored: a reload starts it empty), at most 50 steps. A step keeps,
 * for each key it touched (a block id; "#filters" / "#bg" for the page's own settings, below), the value before and
 * after — so a step undoes on its own, even when it is not the last one (each block's "↶ Bekor qilish" undoes the last
 * step that touched that block, whatever came after on other blocks). Pure functions (history.test.ts).
 */

/** which layer a step changed: the dashboard's defaults for everyone (edit mode) or this viewer's own view */
export type Layer = 'defaults' | 'mine'

export interface Step<T = unknown> {
  /** the step's name in the tooltip: «Treemap» ko'rinishi, Tartib, Yashirish… */
  label: string
  layer: Layer
  /** key → its value before (undefined = it was not set) */
  before: Record<string, T | undefined>
  /** key → its value after */
  after: Record<string, T | undefined>
}

export interface History<T = unknown> {
  /** oldest first; the last one is what "Ortga" undoes */
  past: Step<T>[]
  /** the next first; what "Oldinga" redoes */
  future: Step<T>[]
}

export const HISTORY_CAP = 50

export const emptyHistory = <T,>(): History<T> => ({ past: [], future: [] })

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** the keys a step really changed (a value set to what it was is no change) */
export const stepKeys = <T,>(s: Step<T>): string[] =>
  [...new Set([...Object.keys(s.before), ...Object.keys(s.after)])].filter((k) => !same(s.before[k], s.after[k]))

/**
 * The step from one state of a layer to the next: only the keys that differ. null when nothing changed (nothing to
 * remember — a save of the same thing again).
 */
export function diffStep<T>(label: string, layer: Layer, prev: Record<string, T>, next: Record<string, T>): Step<T> | null {
  const before: Record<string, T | undefined> = {}
  const after: Record<string, T | undefined> = {}
  for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (same(prev[k], next[k])) continue
    before[k] = prev[k]
    after[k] = next[k]
  }
  return Object.keys(after).length ? { label, layer, before, after } : null
}

/** a new step: on top of the past; what could be redone is dropped (a new branch, like a browser's forward) */
export function push<T>(h: History<T>, step: Step<T> | null, cap = HISTORY_CAP): History<T> {
  if (!step || !stepKeys(step).length) return h
  const past = [...h.past, step]
  return { past: past.length > cap ? past.slice(past.length - cap) : past, future: [] }
}

export const canUndo = (h: History<unknown>) => h.past.length > 0
export const canRedo = (h: History<unknown>) => h.future.length > 0
/** the step "Ortga" / "Oldinga" would take (its label is the tooltip) */
export const nextUndo = <T,>(h: History<T>): Step<T> | undefined => h.past[h.past.length - 1]
export const nextRedo = <T,>(h: History<T>): Step<T> | undefined => h.future[0]

/** "Ortga": the last step leaves the past for the future; null when there is none */
export function undo<T>(h: History<T>): { history: History<T>; step: Step<T> } | null {
  const step = nextUndo(h)
  if (!step) return null
  return { history: { past: h.past.slice(0, -1), future: [step, ...h.future] }, step }
}

/** "Oldinga": the next step goes back to the past; null when there is none */
export function redo<T>(h: History<T>): { history: History<T>; step: Step<T> } | null {
  const step = nextRedo(h)
  if (!step) return null
  return { history: { past: [...h.past, step], future: h.future.slice(1) }, step }
}

/**
 * A block's "↶ Bekor qilish": the last step (of `layer`, when given) that touched `key` is undone on its own — it
 * leaves the past (what came after on other keys stays) and becomes the first to redo. null when nothing touched it.
 */
export function undoKey<T>(h: History<T>, key: string, layer?: Layer): { history: History<T>; step: Step<T> } | null {
  for (let i = h.past.length - 1; i >= 0; i--) {
    const s = h.past[i]!
    if (layer && s.layer !== layer) continue
    if (!stepKeys(s).includes(key)) continue
    return { history: { past: [...h.past.slice(0, i), ...h.past.slice(i + 1)], future: [s, ...h.future] }, step: s }
  }
  return null
}

/** some step (of `layer`) touched `key` — the block's "↶ Bekor qilish" shows */
export const touched = (h: History<unknown>, key: string, layer?: Layer): boolean =>
  h.past.some((s) => (!layer || s.layer === layer) && stepKeys(s).includes(key))

/**
 * A layer's state with a step taken back ('before') or again ('after'): only the step's keys change, so the steps
 * after it on other keys are kept. An undefined value removes the key.
 */
export function applyStep<T>(state: Record<string, T>, step: Step<T>, side: 'before' | 'after'): Record<string, T> {
  const vals = step[side]
  const out = { ...state }
  for (const k of stepKeys(step)) {
    const v = vals[k]
    if (v === undefined) delete out[k]
    else out[k] = v
  }
  return out
}

/** the steps of one layer only (switching edit mode on / off keeps both, the arrows show the layer in view) */
export function ofLayer<T>(h: History<T>, layer: Layer): History<T> {
  return { past: h.past.filter((s) => s.layer === layer), future: h.future.filter((s) => s.layer === layer) }
}

/** "Ortga" / "Oldinga" for one layer: the last step of that layer, the others stay where they are */
export function undoLayer<T>(h: History<T>, layer: Layer): { history: History<T>; step: Step<T> } | null {
  for (let i = h.past.length - 1; i >= 0; i--) {
    const s = h.past[i]!
    if (s.layer !== layer) continue
    return { history: { past: [...h.past.slice(0, i), ...h.past.slice(i + 1)], future: [s, ...h.future] }, step: s }
  }
  return null
}

export function redoLayer<T>(h: History<T>, layer: Layer): { history: History<T>; step: Step<T> } | null {
  const i = h.future.findIndex((s) => s.layer === layer)
  if (i < 0) return null
  const s = h.future[i]!
  return { history: { past: [...h.past, s], future: [...h.future.slice(0, i), ...h.future.slice(i + 1)] }, step: s }
}

/** a new step drops only the redo steps of its own layer (a branch in the owner's defaults keeps the viewer's) */
export function pushLayer<T>(h: History<T>, step: Step<T> | null, cap = HISTORY_CAP): History<T> {
  if (!step || !stepKeys(step).length) return h
  const past = [...h.past, step]
  return { past: past.length > cap ? past.slice(past.length - cap) : past, future: h.future.filter((s) => s.layer !== step.layer) }
}

/**
 * Beside its blocks a page has settings of its own that the arrows take back too (owner, 2026-10-26: the filter section
 * and the background "Fon"): each is one key of a step — "#filters", "#bg" — and its value the setting's whole state
 * (the page's filters and their bar; the background). A block id is "page:kind:title", so it never starts with "#". A
 * step of the blocks and a step of a setting are the same kind of step: only what takes it back differs (splitStep).
 */
export type Setting = 'filters' | 'bg'
export const SETTINGS: readonly Setting[] = ['filters', 'bg']
export const settingKey = (s: Setting) => `#${s}`
export const settingOf = (key: string): Setting | null => SETTINGS.find((s) => settingKey(s) === key) ?? null

/** a setting's change as a step (undefined = not set); null when it did not change */
export function settingStep<T>(label: string, layer: Layer, setting: Setting, before: T | undefined, after: T | undefined): Step<T> | null {
  const k = settingKey(setting)
  return diffStep<T>(label, layer, before === undefined ? {} : { [k]: before }, after === undefined ? {} : { [k]: after })
}

/** a setting's values in a step */
export interface SettingChange<T> {
  setting: Setting
  before: T | undefined
  after: T | undefined
}

/**
 * A step by what it changed: its blocks' part (a step of block ids only, null when it touched none — applyStep takes it
 * back) and each page setting it changed (its own restore takes it back, history in blockedit/context).
 */
export function splitStep<T>(step: Step<T>): { blocks: Step<T> | null; settings: SettingChange<T>[] } {
  const before: Record<string, T | undefined> = {}
  const after: Record<string, T | undefined> = {}
  const settings: SettingChange<T>[] = []
  for (const k of stepKeys(step)) {
    const s = settingOf(k)
    if (s) settings.push({ setting: s, before: step.before[k], after: step.after[k] })
    else {
      before[k] = step.before[k]
      after[k] = step.after[k]
    }
  }
  return { blocks: Object.keys(after).length || Object.keys(before).length ? { ...step, before, after } : null, settings }
}

/** Cmd/Ctrl+Z → undo, Cmd/Ctrl+Shift+Z (or Ctrl+Y) → redo; nothing while typing in a field */
export function historyKey(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>, target: EventTarget | null): 'undo' | 'redo' | null {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return null
  if (isTyping(target)) return null
  const k = e.key.toLowerCase()
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo'
  if (k === 'y' && e.ctrlKey && !e.metaKey) return 'redo'
  return null
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as { tagName?: string; isContentEditable?: boolean; type?: string } | null
  if (!el || typeof el.tagName !== 'string') return false
  if (el.isContentEditable) return true
  const tag = el.tagName.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  return !['checkbox', 'radio', 'button', 'submit', 'range', 'color'].includes((el.type ?? 'text').toLowerCase())
}
