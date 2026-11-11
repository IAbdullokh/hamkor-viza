import type { Lang } from '@/lib/settings'

/**
 * The dashboard's words, swapped for an industry's own (Lid → Ariza, Sdelka → Shartnoma, Tashrif → Qabul). Runs on the
 * translated template before the {vars} go in, so a client's own stage / source names are never touched.
 *
 *   uz: a stem + the Uzbek suffix chain (lidlarni → arizalarni, sdelkasi → abonementi)
 *   ru: the 12 case forms of the noun (лидов → заявок); when the gender changes, the adjective before it and a short
 *       participle after it agree (Качественный лид → Качественная заявка, Встреча назначена → Показ назначен)
 *   en: singular / plural
 */

/** the generic concepts the dashboard names */
export type Concept = 'lead' | 'deal' | 'visit' | 'meeting' | 'client'
type Gender = 'm' | 'f'

/** nom, gen, dat, acc, ins, prep — singular then plural */
type Ru12 = readonly [string, string, string, string, string, string, string, string, string, string, string, string]

export interface Term {
  /** Uzbek stem (lower case): the suffixes of the source word are kept */
  uz: string
  /** `animate`: a person (пациент, клиент) — its accusative is the genitive: «увидеть пациентов», not «увидеть пациенты» */
  ru: { forms: Ru12; gender: Gender; animate?: boolean }
  /** singular, plural */
  en: readonly [string, string]
}

const SOURCE: Record<Concept, Term> = {
  lead: { uz: 'lid', ru: { gender: 'm', forms: ['лид', 'лида', 'лиду', 'лид', 'лидом', 'лиде', 'лиды', 'лидов', 'лидам', 'лиды', 'лидами', 'лидах'] }, en: ['lead', 'leads'] },
  deal: { uz: 'sdelka', ru: { gender: 'f', forms: ['сделка', 'сделки', 'сделке', 'сделку', 'сделкой', 'сделке', 'сделки', 'сделок', 'сделкам', 'сделки', 'сделками', 'сделках'] }, en: ['deal', 'deals'] },
  visit: { uz: 'tashrif', ru: { gender: 'm', forms: ['визит', 'визита', 'визиту', 'визит', 'визитом', 'визите', 'визиты', 'визитов', 'визитам', 'визиты', 'визитами', 'визитах'] }, en: ['visit', 'visits'] },
  meeting: { uz: 'uchrashuv', ru: { gender: 'f', forms: ['встреча', 'встречи', 'встрече', 'встречу', 'встречей', 'встрече', 'встречи', 'встреч', 'встречам', 'встречи', 'встречами', 'встречах'] }, en: ['meeting', 'meetings'] },
  client: { uz: 'mijoz', ru: { gender: 'm', animate: true, forms: ['клиент', 'клиента', 'клиенту', 'клиента', 'клиентом', 'клиенте', 'клиенты', 'клиентов', 'клиентам', 'клиентов', 'клиентами', 'клиентах'] }, en: ['client', 'clients'] },
}

/** other English spellings of a concept the dictionaries use ("Cost per customer" names the client too) */
const EN_ALSO: Partial<Record<Concept, readonly (readonly [string, string])[]>> = { client: [['customer', 'customers']] }

/** exact phrases replaced before the words (a verb phrase a word swap would break: "Tashrif buyurdi" → "Qabulga keldi") */
export type Phrases = Partial<Record<Lang, readonly (readonly [from: string, to: string])[]>>

export interface TermSet {
  terms: Partial<Record<Concept, Term>>
  phrases?: Phrases
}

// ── matching helpers ────────────────────────────────────────────────────────────────────────────────────────────────

const LETTER = "\\p{L}\\p{N}'ʻ’ʼ`"
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase()
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** the target in the source word's case (only the first letter matters on a dashboard) */
const likeCase = (src: string, out: string) => (isUpper(src.charAt(0)) ? capital(out) : out)
const endsVowel = (s: string) => /[aeiou]$/i.test(s)

/** Uzbek: stem + (lar)(possessive)(case) */
const UZ_SUFFIX = '(lar)?(imiz|ingiz|im|ing|i|si)?(ning|niki|ni|ga|da|dan|dagi|gacha|day)?'

function uzRule(from: string, to: string): [RegExp, (m: string, ...g: string[]) => string] {
  const rx = new RegExp(`(?<![${LETTER}])(${esc(from.charAt(0))}|${esc(from.charAt(0).toUpperCase())})${esc(from.slice(1))}${UZ_SUFFIX}(?![${LETTER}])`, 'gu')
  return [
    rx,
    (m, _first, lar = '', poss = '', kase = '') => {
      let p = poss
      // the possessive follows the new stem's last sound: lidi → arizasi, sdelkasi → abonementi
      if (p && !lar) {
        const bare = p.startsWith('s') ? p.slice(1) : p
        p = endsVowel(to) ? (bare === 'i' ? 'si' : bare.slice(1)) : bare
      }
      return likeCase(m, to + lar + p + kase)
    },
  ]
}

/** Russian: the order a form is looked up in when it is ambiguous (сделки: nominative plural before genitive singular) */
const RU_PRIORITY = [0, 6, 7, 8, 10, 11, 1, 2, 4, 5, 3, 9]

/**
 * Adjective endings per case (nom, gen, dat, acc, ins, prep): [hard, soft]. The accusative of a masculine adjective is
 * the nominative or, before an animate noun, the genitive ("в целевой лид" → "в целевого пациента").
 */
const ADJ: Record<Gender, readonly (readonly [string, string])[]> = {
  m: [['ый', 'ий'], ['ого', 'его'], ['ому', 'ему'], ['ый', 'ий'], ['ым', 'им'], ['ом', 'ем']],
  f: [['ая', 'яя'], ['ой', 'ей'], ['ой', 'ей'], ['ую', 'юю'], ['ой', 'ей'], ['ой', 'ей']],
}
/** words that put the noun right after them in the accusative: verbs of the dashboard's sentences, and prepositions */
const RU_ACC_VERBS = new Set(['увидеть', 'видеть', 'посмотреть', 'смотреть', 'открыть', 'считает', 'считают', 'считать', 'брать', 'берём', 'берем', 'выбрать', 'выберите'])
/** prepositions take the accusative only in the singular here ("в лиды" is the idiom "into leads", kept as it is) */
const RU_ACC_PREPS = new Set(['в', 'на', 'за', 'через', 'про'])
const ADJ_LIKE = /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ых|их|ую|юю|ого|его|ому|ему|ым|им|ыми|ими|ом|ем)$/u

/** one adjective, re-declined for the new noun: case `c` (0-5) of a singular noun, gender `from` → `to` */
function declineSingular(adj: string, c: number, from: Gender, to: Gender, accAnimate: boolean): string {
  const lower = adj.toLowerCase()
  // the masculine nominative also ends in a stressed -ой (целевой); the masculine accusative is read as the nominative
  const src = from === 'm' && (c === 0 || c === 3) ? [...ADJ.m[c]!, 'ой'] : [...ADJ[from][c]!]
  const end = src.sort((a, b) => b.length - a.length).find((e) => lower.endsWith(e))
  if (!end) return adj
  const stem = adj.slice(0, adj.length - end.length)
  const last = stem.slice(-1).toLowerCase()
  // a soft ending (синий, синей) unless the stem ends in г/к/х, whose -ий is only spelling (русский, русской)
  const soft = end === ADJ[from][c]![1] && !'гкх'.includes(last)
  const tc = c === 3 && to === 'm' && accAnimate ? 1 : c
  let out = ADJ[to][tc]![soft ? 1 : 0]!
  if (to === 'm' && tc === 0) out = soft || 'гкхжшчщ'.includes(last) ? 'ий' : end === 'ой' ? 'ой' : 'ый'
  else if (to === 'f' && (tc === 0 || tc === 3) && 'жшчщ'.includes(last)) out = ADJ.f[tc]![0]!
  return stem + out
}

/** a plural adjective (or все) before an animate noun in the accusative: качественные → качественных, все → всех */
const pluralAccAnimate = (adj: string) => (/^все$/iu.test(adj) ? adj + 'х' : adj.replace(/([ыи])е$/u, '$1х'))

/** short participles / past verbs that follow a noun in a dashboard label, masculine ↔ feminine */
const RU_AFTER: [m: string, f: string][] = [
  ['назначен', 'назначена'],
  ['запланирован', 'запланирована'],
  ['прошёл', 'прошла'],
  ['проведён', 'проведена'],
  ['проведен', 'проведена'],
  ['состоялся', 'состоялась'],
  ['создан', 'создана'],
  ['отменён', 'отменена'],
  ['закрыт', 'закрыта'],
  ['оплачен', 'оплачена'],
  ['пришёл', 'пришла'],
]

function ruRule(from: Term['ru'], to: Term['ru']): [RegExp, (m: string, ...g: unknown[]) => string] {
  const index = new Map<string, number>()
  for (const i of RU_PRIORITY) if (!index.has(from.forms[i]!)) index.set(from.forms[i]!, i)
  const alts = [...index.keys()].sort((a, b) => b.length - a.length).map(esc).join('|')
  const after = RU_AFTER.map(([m, f]) => `${esc(m)}|${esc(f)}`).join('|')
  // optional word before (an adjective, or the verb / preposition that governs the noun), the noun, then either a short
  // participle ("Встреча назначена") or a comma and a full participle ("лиды, дошедшие до …")
  const rx = new RegExp(
    `(?<![${LETTER}])(?:(?!(?:${alts})(?![${LETTER}]))(?<adj>[\\p{L}]+)(?<sp1>\\s+))?(?<noun>${alts})(?![${LETTER}])(?:(?<sp2>\\s+)(?<part>${after})(?![${LETTER}])|(?<comma>,\\s+)(?<full>[\\p{L}]+(?:ш|щ|нн|м)(?:ие|ые))(?![${LETTER}]))?`,
    'giu',
  )
  const swap = from.gender !== to.gender
  return [
    rx,
    (_whole: string, ...rest: unknown[]) => {
      const g = rest[rest.length - 1] as Record<string, string | undefined>
      const offset = rest[rest.length - 3] as number
      const text = rest[rest.length - 2] as string
      const noun = g.noun!
      const adj = g.adj
      let i = index.get(noun.toLowerCase()) ?? 0
      // the governing word: the captured one when it is not an adjective, else the word before the match
      let gov: string | undefined
      if (adj !== undefined && (RU_ACC_VERBS.has(adj.toLowerCase()) || RU_ACC_PREPS.has(adj.toLowerCase()) || !ADJ_LIKE.test(adj.toLowerCase()) && !/^все$/iu.test(adj))) gov = adj.toLowerCase()
      else gov = /([\p{L}]+)\s+$/u.exec(text.slice(0, offset))?.[1]?.toLowerCase()
      const isAdj = adj !== undefined && gov !== adj.toLowerCase()
      // a source form that is both nominative and accusative (лид, лиды) is read as the accusative after a verb / preposition
      const acc = i === 0 || i === 6 ? i + 3 : -1
      const accusative =
        acc > 0 && from.forms[i] === from.forms[acc] && !!gov && (RU_ACC_VERBS.has(gov) || (i === 0 && RU_ACC_PREPS.has(gov)))
      if (accusative) i = acc
      let out = likeCase(noun, to.forms[i]!)
      if (adj !== undefined) {
        let a = adj
        if (isAdj) {
          if (i < 6 && (swap || (accusative && to.animate))) a = declineSingular(adj, i, from.gender, to.gender, accusative && !!to.animate)
          else if (i === 9 && to.animate) a = pluralAccAnimate(adj)
        }
        out = a + g.sp1 + out
      }
      if (g.part !== undefined) {
        let p = g.part
        if (swap && i === 0) {
          const pair = RU_AFTER.find(([m, f]) => m === p.toLowerCase() || f === p.toLowerCase())
          if (pair) p = likeCase(p, to.gender === 'm' ? pair[0] : pair[1])
        }
        out += g.sp2 + p
      } else if (g.full !== undefined) out += g.comma + (i === 9 && to.animate ? g.full.replace(/([ыи])е$/u, '$1х') : g.full)
      return out
    },
  ]
}

function enRule(from: Term['en'], to: Term['en']): [RegExp, (m: string, ...g: string[]) => string] {
  const rx = new RegExp(`(?<![${LETTER}])(${esc(from[1])}|${esc(from[0])})(?![${LETTER}])`, 'giu')
  return [rx, (m) => likeCase(m, m.toLowerCase() === from[1] ? to[1] : to[0])]
}

type Rule = [RegExp, (m: string, ...g: never[]) => string]

/** Compiles an industry's word set into a (lang, text) → text function; null when nothing changes. */
export function compileTerms(set: TermSet): ((lang: Lang, text: string) => string) | null {
  const concepts = Object.keys(set.terms) as Concept[]
  if (!concepts.length && !set.phrases) return null
  const rules: Record<Lang, Rule[]> = { uz: [], ru: [], en: [] }
  for (const lang of ['uz', 'ru', 'en'] as const)
    for (const [from, to] of set.phrases?.[lang] ?? [])
      rules[lang].push([new RegExp(`(?<![${LETTER}])${esc(from)}(?![${LETTER}])`, 'gu'), () => to])
  for (const c of concepts) {
    const to = set.terms[c]!
    rules.uz.push(uzRule(SOURCE[c].uz, to.uz))
    rules.ru.push(ruRule(SOURCE[c].ru, to.ru))
    rules.en.push(enRule(SOURCE[c].en, to.en))
    for (const also of EN_ALSO[c] ?? []) rules.en.push(enRule(also, to.en))
  }
  // a phrase's output is final: words inside it are not swapped again
  return (lang, text) => {
    const list = rules[lang]
    if (!list.length) return text
    const parts: { text: string; fixed: boolean }[] = [{ text, fixed: false }]
    const phraseCount = set.phrases?.[lang]?.length ?? 0
    list.forEach(([rx, fn], n) => {
      const isPhrase = n < phraseCount
      for (let k = parts.length - 1; k >= 0; k--) {
        const part = parts[k]!
        if (part.fixed) continue
        if (!isPhrase) {
          part.text = part.text.replace(rx, fn as (m: string, ...g: string[]) => string)
          continue
        }
        const pieces: { text: string; fixed: boolean }[] = []
        let last = 0
        for (const m of part.text.matchAll(rx)) {
          pieces.push({ text: part.text.slice(last, m.index), fixed: false }, { text: fn(m[0]), fixed: true })
          last = m.index + m[0].length
        }
        if (!pieces.length) continue
        pieces.push({ text: part.text.slice(last), fixed: false })
        parts.splice(k, 1, ...pieces)
      }
    })
    return parts.map((p) => p.text).join('')
  }
}

/** the word a term shows as (a preview chip): «Bemor» | «Пациент» | «Patient» */
export const termWord = (term: Term, lang: Lang) => capital(lang === 'uz' ? term.uz : lang === 'ru' ? term.ru.forms[0] : term.en[0])
