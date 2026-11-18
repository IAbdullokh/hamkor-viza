import type { WorkspaceKind } from './workspaces'

/** Business vocabulary of the demo company. All Uzbek labels go through t() in the UI. */

/** Stage keys are shared by all kinds; labels differ. Order = funnel order. */
export const STAGE_KEYS = ['new', 'contact', 'qualified', 'booked', 'visited', 'won', 'lost', 'junk'] as const
export type StageKey = (typeof STAGE_KEYS)[number]
export const FUNNEL_STAGES: StageKey[] = ['new', 'contact', 'qualified', 'booked', 'visited', 'won']

export const SOURCES = ['Instagram', 'Facebook', 'Telegram', 'Veb-sayt', 'Tavsiya', "Qo'ng'iroq"] as const
export type Source = (typeof SOURCES)[number]

export const JUNK_REASONS = ["Raqam noto'g'ri", "Javob bermadi", 'Qiziqish yo\'q', 'Boshqa shahar', 'Dublikat', 'Spam'] as const
export const LOST_REASONS = ['Narx qimmat', 'Vaqt mos emas', 'Raqobatchini tanladi', "O'ylab ko'radi", 'Manzil uzoq'] as const

export interface Product {
  name: string
  price: number
  /** relative demand */
  weight: number
  /** paid monthly (subscription) → repeat payments */
  recurring: boolean
}

export interface KindVocab {
  stages: Record<StageKey, string>
  products: Product[]
  /** what one "product" is called in UI */
  productLabel: string
  branches: string[]
  sourceWeights: number[]
  /** average leads per day at the start of history */
  leadsPerDay: number
  /** probability of reaching each next funnel stage from the previous one */
  funnel: { contact: number; qualified: number; booked: number; visited: number; won: number }
  campaigns: { name: string; product: string; daily: number }[]
  roles: { role: StaffRole; count: number; base: number }[]
}

export type StaffRole = 'Menejer' | 'Operator' | 'Marketolog' | 'Administrator' | 'Rahbar'

/**
 * A neutral sales company as Data365 Studio sees it right after the client pastes their Bitrix24 webhook:
 * the default lead pipeline, products from the Bitrix catalogue, CRM sources, the sales team.
 * (Deliberately not modelled on any real Data365 client.)
 */
const SALES: KindVocab = {
  stages: {
    new: 'Yangi lid',
    contact: "Aloqa o'rnatildi",
    qualified: 'Sifatli lid',
    booked: 'Uchrashuv belgilandi',
    visited: "Uchrashuv bo'ldi",
    won: 'Sotildi',
    lost: 'Bekor qilindi',
    junk: 'Sifatsiz',
  },
  products: [
    { name: 'Standart paket', price: 450_000, weight: 34, recurring: true },
    { name: 'Biznes paket', price: 1_100_000, weight: 24, recurring: true },
    { name: 'Premium paket', price: 2_400_000, weight: 10, recurring: false },
    { name: 'Bir martalik xizmat', price: 850_000, weight: 20, recurring: false },
    { name: 'Konsultatsiya', price: 300_000, weight: 12, recurring: false },
  ],
  productLabel: 'Mahsulot',
  branches: ['Bosh ofis', 'Filial 1', 'Filial 2'],
  sourceWeights: [36, 20, 16, 12, 10, 6],
  leadsPerDay: 46,
  funnel: { contact: 0.84, qualified: 0.58, booked: 0.56, visited: 0.68, won: 0.46 },
  campaigns: [
    { name: 'Lid forma | Asosiy taklif', product: 'Standart paket', daily: 34 },
    { name: 'Reels | Biznes paket', product: 'Biznes paket', daily: 26 },
    { name: 'Retarget | Sayt mehmonlari', product: 'Premium paket', daily: 14 },
    { name: 'Aksiya | Konsultatsiya', product: 'Konsultatsiya', daily: 10 },
  ],
  roles: [
    { role: 'Rahbar', count: 1, base: 15_000_000 },
    { role: 'Menejer', count: 6, base: 4_000_000 },
    { role: 'Operator', count: 2, base: 3_200_000 },
    { role: 'Marketolog', count: 1, base: 7_000_000 },
    { role: 'Administrator', count: 1, base: 3_600_000 },
  ],
}

export const VOCAB: Record<WorkspaceKind, KindVocab> = { sales: SALES }

export const FIRST_M = ['Jasur', 'Sardor', 'Bekzod', 'Otabek', 'Javohir', 'Rustam', 'Aziz', 'Dilshod', 'Sherzod', 'Bobur', 'Ulug\'bek', 'Akmal', 'Farrux', 'Islom', 'Temur', 'Shoxrux', 'Eldor', 'Nodir', 'Jamshid', 'Anvar']
export const FIRST_F = ['Dilnoza', 'Malika', 'Nodira', 'Shahzoda', 'Madina', 'Kamola', 'Zarina', 'Nilufar', 'Gulnoza', 'Sevara', 'Mohira', 'Feruza', 'Dildora', 'Laylo', 'Munisa', 'Sabina', 'Gulshan', 'Aziza', 'Barno', 'Yulduz']
export const LAST = ['Karimov', 'Rahimov', 'Yusupov', 'Aliyev', 'Xasanov', 'Tursunov', 'Ergashev', 'Nazarov', 'Qodirov', 'Islomov', 'Saidov', 'Mirzayev', 'Abdullayev', 'Ismoilov', 'Sobirov', 'Umarov', 'Jo\'rayev', 'Rasulov', 'Haydarov', 'Sultonov']

/** Female surname form: Karimov → Karimova. */
export function surname(last: string, female: boolean): string {
  return female ? `${last}a` : last
}
