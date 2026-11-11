import { VISUAL_LABELS } from '@/charts/switcher'
import type { VisualType } from '@/spec'
import type { BlockPatch } from './context'
import type { Step } from './history'

type T = (uz: string, vars?: Record<string, string | number>) => string

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** what of a block a step changed, in the order a name is picked */
const FIELDS = ['visual', 'hidden', 'order', 'span', 'h', 'color', 'title', 'table', 'viewTables', 'views', 'visualMeasure'] as const

function changed(b: BlockPatch | undefined, a: BlockPatch | undefined): string[] {
  const out: string[] = FIELDS.filter((f) => !same(b?.[f], a?.[f]))
  // a key that is not a known field (an added chart's entry): a change all the same
  if (!out.length && !same(b, a)) out.push('other')
  return out
}

/**
 * A step's name for the arrows' tooltip ("Ortga: «Treemap» ko'rinishi"): what changed, on which block. `name` gives a
 * block's title. The words go through `t` (i18n/dict/undo.ts has their ru / en).
 */
export function stepLabel(step: Pick<Step<BlockPatch>, 'before' | 'after'>, name: (id: string) => string, t: T): string {
  const ids = [...new Set([...Object.keys(step.before), ...Object.keys(step.after)])].filter((id) => !same(step.before[id], step.after[id]))
  const per = ids.map((id) => ({ id, f: changed(step.before[id], step.after[id]) }))
  const all = new Set(per.flatMap((p) => p.f))
  if (!ids.length) return t("O'zgarish")
  if (all.size === 1 && all.has('order')) return t('Bloklar tartibi')
  if (ids.length > 1) {
    if (all.size === 1 && all.has('hidden')) return t('{n} ta blok: yashirish / qaytarish', { n: ids.length })
    if ([...all].every((f) => f === 'span' || f === 'h')) return t("Bloklar o'lchami")
    return t("{n} ta blokdagi o'zgarish", { n: ids.length })
  }
  const id = ids[0]!
  const b = step.before[id]
  const a = step.after[id]
  const n = name(id)
  const f = per[0]!.f[0]
  switch (f) {
    case 'visual': {
      const v = a?.visual as VisualType | undefined
      return v ? t("«{v}» ko'rinishi", { v: t(VISUAL_LABELS[v] ?? v) }) : t("«{name}» — asl ko'rinish", { name: n })
    }
    case 'hidden':
      return a?.hidden ? t('«{name}» yashirildi', { name: n }) : t('«{name}» qaytarildi', { name: n })
    case 'span':
    case 'h':
      return t("«{name}» o'lchami", { name: n })
    case 'color':
      return t('«{name}» rangi', { name: n })
    case 'title':
      return t('«{name}» nomi', { name: b?.title ?? n })
    case 'table':
    case 'viewTables':
      return t('«{name}» jadvali', { name: n })
    case 'views':
      return t("«{name}» ko'rinishlari", { name: n })
    case 'visualMeasure':
      return t("«{name}» ko'rsatkichi", { name: n })
    default:
      return a === undefined ? t("«{name}» o'chirildi", { name: n }) : b === undefined ? t("«{name}» qo'shildi", { name: n }) : t("«{name}» o'zgarishi", { name: n })
  }
}
