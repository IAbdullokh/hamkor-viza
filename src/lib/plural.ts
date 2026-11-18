/**
 * Plural forms inside a translated template (Russian and English need them; Uzbek says "3 ta fayl" for any number).
 * A dict entry writes the forms in braces after the number's variable name:
 *
 *   "{n} ta fayl o'zgardi": ['{n} {n|файл изменён|файла изменено|файлов изменено}', '{n} {n|file|files} changed']
 *
 *   ru: one | few | many   (1 файл · 2 файла · 5 файлов · 21 файл · 11 файлов)
 *   en: one | other        (1 file · 2 files)
 *
 * A form list with fewer entries than the language needs repeats its last one; a variable that is not a number keeps the
 * last form; a formatted one ("1 234") counts as its number. Pure (tested in plural.test.ts); i18n's translate() runs it before the {vars} go in.
 */

const RULES = new Map<string, Intl.PluralRules>()

function rules(lang: string): Intl.PluralRules {
  let r = RULES.get(lang)
  if (!r) {
    r = new Intl.PluralRules(lang)
    RULES.set(lang, r)
  }
  return r
}

/** which of `forms` fits `n` in `lang` (ru: one / few / many, everything else: one / other) */
export function pluralForm(lang: string, n: number, forms: readonly string[]): string {
  if (forms.length === 0) return ''
  const last = forms[forms.length - 1]!
  if (!Number.isFinite(n)) return last
  const cat = rules(lang).select(n)
  const at = lang === 'ru' ? (cat === 'one' ? 0 : cat === 'few' ? 1 : 2) : cat === 'one' ? 0 : 1
  return forms[Math.min(at, forms.length - 1)] ?? last
}

const TOKEN = /\{(\w+)\|([^{}]*)\}/g

/** replaces every `{var|form|form…}` in `text` with the form that fits the number `vars[var]` */
export function applyPlurals(lang: string, text: string, vars?: Record<string, string | number>): string {
  if (!vars || !text.includes('|')) return text
  return text.replace(TOKEN, (whole, k: string, list: string) => {
    if (!(k in vars)) return whole
    const v = vars[k]
    // a formatted number ("1 234", with the thin spaces Intl puts in) still counts
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[\s\u00a0\u202f]/g, ''))
    return pluralForm(lang, Number.isFinite(n) ? Math.abs(n) : NaN, list.split('|'))
  })
}
