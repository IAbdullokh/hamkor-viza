import { createContext, useCallback, useContext } from 'react'
import { applyPlurals } from '@/lib/plural'
import { useSettings, type Lang } from '@/lib/settings'

/**
 * Uzbek-first i18n. The KEY is the Uzbek (Latin) source text, exactly like Applekor:
 *
 *   t("Bugungi sotuv")            → "Bugungi sotuv" | "Продажи сегодня" | "Today's sales"
 *   t("{n} ta lid", { n: 12 })    → "12 ta lid" | "12 лидов" | "12 leads"
 *
 * Russian and English live in src/i18n/dict/*.ts (one file per feature, auto-loaded), each exporting
 *   export default { "Bugungi sotuv": ["Продажи сегодня", "Today's sales"] } satisfies Dict
 * A missing translation falls back to the Uzbek text, so screens never break. Russian and English pick plural forms with
 * `{n|one|few|many}` / `{n|one|other}` next to the number (src/lib/plural.ts): '{n} {n|файл|файла|файлов}'.
 */
export type Dict = Record<string, readonly [ru: string, en: string]>

const modules = import.meta.glob<{ default: Dict }>('./dict/*.ts', { eager: true })
const DICT: Dict = Object.assign({}, ...Object.values(modules).map((m) => m.default))

type Vars = Record<string, string | number>

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/** Rewords a translated template (before its {vars} go in): an industry's own words on a built dashboard. */
export type TermFn = (lang: Lang, text: string) => string

/** Set around a built dashboard (features/projects/industry): every t() inside speaks the project's industry. */
export const TermsContext = createContext<TermFn | null>(null)

export function translate(lang: Lang, uz: string, vars?: Vars, terms?: TermFn | null): string {
  const own = interpolate(terms ? terms('uz', uz) : uz, vars)
  if (lang === 'uz') return own
  const entry = DICT[uz]
  const text = entry ? entry[lang === 'ru' ? 0 : 1] : uz
  if (!entry && import.meta.env.DEV) missing.add(uz)
  const out = interpolate(applyPlurals(lang, terms ? terms(lang, text) : text, vars), vars)
  if (out !== own && UZ_OF.size < 20_000) UZ_OF.set(out, own)
  return out
}

/** what each ru / en text shown was in Uzbek (the same industry words and values): block ids stay one per block */
const UZ_OF = new Map<string, string>()

/**
 * The Uzbek text a shown ru / en text came from (itself when it is Uzbek or unknown). A dashboard block's settings are
 * kept under its title (blockedit/context blockId): without this, switching the language showed every block with no
 * settings (owner, 2026-10-27: "why did it change its tables and colours?").
 */
export const uzbekOf = (text: string): string => UZ_OF.get(text) ?? text

/** Strings that have no ru/en yet (dev only). Run `window.__nazarMissing()` in the console. */
const missing = new Set<string>()
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __nazarMissing: () => string[] }).__nazarMissing = () => [...missing].sort()
}

/**
 * An Uzbek text as the Uzbek page shows it (with the dashboard's industry words — Lid → Xaridor): a dashboard block's
 * id in every language (blockedit/EditableBlock `idTitle`; owner, 2026-11-05: one chat per card, not one per language).
 */
export function useUzbek(): (uz: string) => string {
  const terms = useContext(TermsContext)
  return useCallback((uz: string) => translate('uz', uz, undefined, terms), [terms])
}

export function useT() {
  const { lang } = useSettings()
  const terms = useContext(TermsContext)
  const t = useCallback((uz: string, vars?: Vars) => translate(lang, uz, vars, terms), [lang, terms])
  return { t, lang }
}
