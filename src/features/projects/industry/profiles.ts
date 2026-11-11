import type { IndustryId, PageId } from '@/features/projects/types'
import raw from './profiles.json?raw'
import type { Lang } from '@/lib/settings'
import { termWord, type Concept, type Term, type TermSet } from './terms'

/**
 * What an industry does to the dashboard, in one place:
 *   pages     the recommended pages (pre-ticked on the Pages step; the API seeds a new project with them)
 *   kpiFirst  the KPI tiles shown first, per page (their Uzbek label keys)
 *   focus     the KPI the preview names ("Qabullar")
 *   visits    clients come in (qabul, sinov darsi, ko'rsatuv, sinov mashg'uloti): only then the visit questions and cards
 *             exist (services / other: when the portal names visit stages, decided by the API)
 *   words     the dashboard's words (Lid → Bemor, Sdelka → Xizmat, Tashrif → Qabul) and whole phrases that a word swap
 *             would break
 *
 * pages / kpiFirst / focus / visits live in profiles.json, which the API mirrors (Data365.Core/Contracts/Industries.cs; a C#
 * test reads the JSON and checks the pages agree). The words are TypeScript: they carry the Russian case forms.
 */
export interface IndustryProfile {
  id: IndustryId
  pages: PageId[]
  kpiFirst: Partial<Record<PageId, string[]>>
  focus: string | null
  visits: boolean
  words: TermSet
}

type Shared = Record<IndustryId, { pages: PageId[]; kpiFirst: Partial<Record<PageId, string[]>>; focus: string | null; visits: boolean }>
const SHARED = JSON.parse(raw) as Shared

const t = (uz: string, ru: Term['ru'], en: Term['en']): Term => ({ uz, ru, en })
const m = (...forms: Term['ru']['forms']): Term['ru'] => ({ gender: 'm', forms })
const f = (...forms: Term['ru']['forms']): Term['ru'] => ({ gender: 'f', forms })
/** a person: the accusative is the genitive («увидеть пациентов») */
const person = (...forms: Term['ru']['forms']): Term['ru'] => ({ gender: 'm', animate: true, forms })

const ARIZA = t('ariza', f('заявка', 'заявки', 'заявке', 'заявку', 'заявкой', 'заявке', 'заявки', 'заявок', 'заявкам', 'заявки', 'заявками', 'заявках'), ['application', 'applications'])
const SHARTNOMA = t('shartnoma', m('договор', 'договора', 'договору', 'договор', 'договором', 'договоре', 'договоры', 'договоров', 'договорам', 'договоры', 'договорами', 'договорах'), ['contract', 'contracts'])
const OQUVCHI = t("o'quvchi", person('ученик', 'ученика', 'ученику', 'ученика', 'учеником', 'ученике', 'ученики', 'учеников', 'ученикам', 'учеников', 'учениками', 'учениках'), ['student', 'students'])
const SINOV_DARSI = t(
  'sinov darsi',
  m('пробный урок', 'пробного урока', 'пробному уроку', 'пробный урок', 'пробным уроком', 'пробном уроке', 'пробные уроки', 'пробных уроков', 'пробным урокам', 'пробные уроки', 'пробными уроками', 'пробных уроках'),
  ['trial lesson', 'trial lessons'],
)
const BEMOR = t('bemor', person('пациент', 'пациента', 'пациенту', 'пациента', 'пациентом', 'пациенте', 'пациенты', 'пациентов', 'пациентам', 'пациентов', 'пациентами', 'пациентах'), ['patient', 'patients'])
const QABUL = t('qabul', m('приём', 'приёма', 'приёму', 'приём', 'приёмом', 'приёме', 'приёмы', 'приёмов', 'приёмам', 'приёмы', 'приёмами', 'приёмах'), ['appointment', 'appointments'])
const MIJOZ = t('mijoz', person('клиент', 'клиента', 'клиенту', 'клиента', 'клиентом', 'клиенте', 'клиенты', 'клиентов', 'клиентам', 'клиентов', 'клиентами', 'клиентах'), ['client', 'clients'])
const KORSATUV = t("ko'rsatuv", m('показ', 'показа', 'показу', 'показ', 'показом', 'показе', 'показы', 'показов', 'показам', 'показы', 'показами', 'показах'), ['viewing', 'viewings'])
const ABONEMENT = t('abonement', m('абонемент', 'абонемента', 'абонементу', 'абонемент', 'абонементом', 'абонементе', 'абонементы', 'абонементов', 'абонементам', 'абонементы', 'абонементами', 'абонементах'), ['membership', 'memberships'])
const AZO = t("a'zo", person('участник', 'участника', 'участнику', 'участника', 'участником', 'участнике', 'участники', 'участников', 'участникам', 'участников', 'участниками', 'участниках'), ['member', 'members'])
const SINOV_MASHGULOT = t(
  "sinov mashg'uloti",
  f('пробная тренировка', 'пробной тренировки', 'пробной тренировке', 'пробную тренировку', 'пробной тренировкой', 'пробной тренировке', 'пробные тренировки', 'пробных тренировок', 'пробным тренировкам', 'пробные тренировки', 'пробными тренировками', 'пробных тренировках'),
  ['trial workout', 'trial workouts'],
)
const XARIDOR = t('xaridor', person('покупатель', 'покупателя', 'покупателю', 'покупателя', 'покупателем', 'покупателе', 'покупатели', 'покупателей', 'покупателям', 'покупателей', 'покупателями', 'покупателях'), ['shopper', 'shoppers'])
const BUYURTMA = t('buyurtma', m('заказ', 'заказа', 'заказу', 'заказ', 'заказом', 'заказе', 'заказы', 'заказов', 'заказам', 'заказы', 'заказами', 'заказах'), ['order', 'orders'])
/** a clinic's deal is the paid service (treatment, check-up) the patient buys */
const XIZMAT = t('xizmat', f('услуга', 'услуги', 'услуге', 'услугу', 'услугой', 'услуге', 'услуги', 'услуг', 'услугам', 'услуги', 'услугами', 'услугах'), ['service', 'services'])
const SOROV = t("so'rov", m('запрос', 'запроса', 'запросу', 'запрос', 'запросом', 'запросе', 'запросы', 'запросов', 'запросам', 'запросы', 'запросами', 'запросах'), ['inquiry', 'inquiries'])

/** the lead page's visit KPIs, reworded per industry (uz / ru / en as the dictionaries say them today) */
const visitPhrases = (uz: [booked: string, came: string, bookedShort: string], ru: [string, string, string], en: [string, string, string]) => ({
  uz: [['Tashrif belgilandi', uz[0]], ['Tashrif buyurdi', uz[1]], ['Tashrif belg.', uz[2]]] as const,
  ru: [['Визит назначен', ru[0]], ['Визит состоялся', ru[1]], ['Визит назн.', ru[2]]] as const,
  en: [['Visit scheduled', en[0]], ['Visited', en[1]], ['Visit sched.', en[2]]] as const,
})

const WORDS: Record<IndustryId, TermSet> = {
  education: {
    terms: { lead: ARIZA, deal: SHARTNOMA, client: OQUVCHI, visit: SINOV_DARSI, meeting: SINOV_DARSI },
    phrases: {
      ...visitPhrases(['Sinov darsiga yozildi', 'Sinov darsiga keldi', 'Sinovga yozildi'], ['Записан на пробный урок', 'Был на пробном уроке', 'Запись на пробный'], ['Trial lesson booked', 'Attended a trial', 'Trial booked']),
    },
  },
  clinic: {
    terms: { lead: BEMOR, deal: XIZMAT, visit: QABUL, meeting: QABUL },
    phrases: visitPhrases(['Qabulga yozildi', 'Qabulga keldi', 'Qabulga yozildi'], ['Записан на приём', 'Пришёл на приём', 'Запись на приём'], ['Appointment booked', 'Attended', 'Booked']),
  },
  fitness: {
    terms: { deal: ABONEMENT, client: AZO, visit: SINOV_MASHGULOT, meeting: SINOV_MASHGULOT },
    phrases: visitPhrases(["Sinov mashg'ulotiga yozildi", "Sinov mashg'ulotiga keldi", 'Sinovga yozildi'], ['Записан на пробную тренировку', 'Был на пробной тренировке', 'Запись на пробную'], ['Trial workout booked', 'Attended a trial', 'Trial booked']),
  },
  retail: { terms: { lead: XARIDOR, deal: BUYURTMA } },
  realestate: {
    terms: { lead: MIJOZ, deal: SHARTNOMA, visit: KORSATUV, meeting: KORSATUV },
    phrases: visitPhrases(["Ko'rsatuv belgilandi", "Ko'rsatuv bo'ldi", "Ko'rsatuv belg."], ['Показ назначен', 'Показ состоялся', 'Показ назн.'], ['Viewing scheduled', 'Viewing held', 'Viewing sched.']),
  },
  services: { terms: { deal: BUYURTMA } },
  manufacturing: { terms: { lead: SOROV, deal: BUYURTMA } },
  other: { terms: {} },
}

export const INDUSTRY_PROFILES: Record<IndustryId, IndustryProfile> = Object.fromEntries(
  (Object.keys(WORDS) as IndustryId[]).map((id) => [id, { id, ...SHARED[id], words: WORDS[id] }]),
) as Record<IndustryId, IndustryProfile>

/** the profile of an industry; null (a project from before the industry was required) is "other" */
export const profileOf = (id: IndustryId | null | undefined): IndustryProfile => INDUSTRY_PROFILES[id && id in INDUSTRY_PROFILES ? id : 'other']

/** the words the preview names, most telling first (two at most: «Bemor», «Qabul») */
const PREVIEW_CONCEPTS: readonly Concept[] = ['lead', 'visit', 'deal', 'client']

/** what the Name step's preview card says for an industry: page count, the new words, the KPI shown first */
export function industryPreview(id: IndustryId, lang: Lang): { pages: number; words: string[]; focus: string | null } {
  const p = profileOf(id)
  const words = [...new Set(PREVIEW_CONCEPTS.flatMap((c) => (p.words.terms[c] ? [termWord(p.words.terms[c], lang)] : [])))].slice(0, 2)
  return { pages: p.pages.length, words, focus: p.focus }
}

/** the industry's KPI tiles first (in the profile's order), the rest as they were */
export function kpiOrder<T>(items: readonly T[], label: (item: T) => string, first: readonly string[] | undefined): T[] {
  if (!first?.length) return [...items]
  const rank = (item: T) => {
    const i = first.indexOf(label(item))
    return i < 0 ? first.length : i
  }
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item)
}
