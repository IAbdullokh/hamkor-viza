import {
  CloudDownload,
  Layers,
  LayoutGrid,
  MessagesSquare,
  Network,
  PencilLine,
  Plug,
  Rocket,
  ScanEye,
  type LucideIcon,
} from 'lucide-react'
import type {
  CheckId,
  ColumnKind,
  ConnectableSourceId,
  EntityId,
  ErrorCode,
  ImpactMetric,
  IndustryId,
  JobKind,
  JobPhaseStep,
  MapTarget,
  Notice,
  NoticeCode,
  PageId,
  PresetUiId,
  ProjectStatus,
  QuestionId,
  StepId,
  UiId,
  ValueKind,
} from './types'
import { getSource, isDatabase, isTabular } from './sources'
import { mixLabel, parseMix } from './look/mix'

/**
 * Human text for every code of the wire contract (types.ts). The server sends codes + params; these helpers turn them
 * into Uzbek text through t() (RU + EN in src/i18n/dict/projects-shell.ts). Every map is an exhaustive Record, so a new
 * code in types.ts breaks the typecheck until it gets its text here.
 *
 *   const { t } = useT()
 *   stepLabel(t, 'structure')                 // "Tuzilma"
 *   errorText(t, err.body)                    // { title: "Bu Bitrix24 webhook havolasi emas", action: "…" }
 *   noticeText(t, { code: 'RATE_LIMIT_BACKOFF', params: { sec: 8 } })
 *
 * The keys passed to t() are literal strings, so the strings live here once; components only call the helpers.
 */
export type TFn = (uz: string, vars?: Record<string, string | number>) => string

type Params = Record<string, string | number> | undefined
const v = (params: Params): Record<string, string | number> => params ?? {}

// ───────────────────────────── steps ─────────────────────────────

const STEP: Record<StepId, { label: (t: TFn) => string; icon: LucideIcon }> = {
  name: { label: (t) => t('Nom'), icon: PencilLine },
  sources: { label: (t) => t('Manbalar'), icon: Plug },
  structure: { label: (t) => t('Tuzilma'), icon: Network },
  load: { label: (t) => t('Yuklash'), icon: CloudDownload },
  look: { label: (t) => t("Ko'rinish"), icon: LayoutGrid },
  pages: { label: (t) => t('Sahifalar'), icon: Layers },
  analysis: { label: (t) => t('Tahlil'), icon: ScanEye },
  questions: { label: (t) => t('Savollar'), icon: MessagesSquare },
  build: { label: (t) => t('Qurish'), icon: Rocket },
}
export const stepLabel = (t: TFn, s: StepId) => STEP[s].label(t)
export const stepIcon = (s: StepId): LucideIcon => STEP[s].icon

// ───────────────────────────── project status ─────────────────────────────

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

const STATUS: Record<ProjectStatus, { label: (t: TFn) => string; tone: Tone }> = {
  draft: { label: (t) => t('Qoralama'), tone: 'neutral' },
  loading: { label: (t) => t('Yuklanmoqda'), tone: 'accent' },
  analysing: { label: (t) => t('Tahlil qilinmoqda'), tone: 'accent' },
  questions: { label: (t) => t('Javob kutilmoqda'), tone: 'warn' },
  building: { label: (t) => t('Qurilmoqda'), tone: 'accent' },
  ready: { label: (t) => t('Tayyor'), tone: 'good' },
  error: { label: (t) => t('Xato'), tone: 'bad' },
}
export const statusLabel = (t: TFn, s: ProjectStatus) => STATUS[s].label(t)
export const statusTone = (s: ProjectStatus): Tone => STATUS[s].tone

// ───────────────────────────── pages, UIs, industries ─────────────────────────────

const PAGE: Record<PageId, { label: (t: TFn) => string; about: (t: TFn) => string }> = {
  lead: { label: (t) => t('Lidlar'), about: (t) => t("Lidlar qayerdan keladi, qaysi bosqichda turibdi va kim ishlayapti") },
  deal: { label: (t) => t('Sotuvlar'), about: (t) => t('Sdelkalar, tushum va menejerlar natijasi') },
  calls: { label: (t) => t("Qo'ng'iroqlar"), about: (t) => t("Kiruvchi va chiquvchi qo'ng'iroqlar, javobsizlar, kutish vaqti") },
  kampaniyalar: { label: (t) => t('Kampaniyalar'), about: (t) => t('Reklama sarfi, lid narxi va qaysi kampaniya sotuv olib keladi') },
  hisobot: { label: (t) => t('Hisobot'), about: (t) => t('Kunlik va oylik umumiy hisobot bir jadvalda') },
  reja: { label: (t) => t('Reja'), about: (t) => t('Oylik reja va bajarilishi menejerlar kesimida') },
  taqsimot: { label: (t) => t('Taqsimot'), about: (t) => t("Lidlar menejerlarga qanday taqsimlanayotgani (faqat ko'rish)") },
  chatlar: { label: (t) => t('Chatlar'), about: (t) => t('Telegram, WhatsApp va Instagram chatlari: javob tezligi, javobsizlar, chatdan kelgan lidlar') },
  savdo: { label: (t) => t('Savdo'), about: (t) => t("Kassa savdosi: tushum, o'rtacha chek, top mahsulotlar, sotuvchilar va qoldiq") },
}
export const pageLabel = (t: TFn, p: PageId) => PAGE[p].label(t)
export const pageAbout = (t: TFn, p: PageId) => PAGE[p].about(t)

const UI: Record<PresetUiId, (t: TFn) => string> = {
  glass: (t) => t('Liquid Glass'),
  klassik: (t) => t('Klassik'),
  statistik: (t) => t('Statistik'),
  kompakt: (t) => t('Kompakt'),
  bento: (t) => t('Bento'),
  midnight: (t) => t('Midnight'),
  minimal: (t) => t('Minimal'),
  glasspro: (t) => t('Glass Pro'),
}
/** a preset's name, or "Aralash · Bento · qorong'i · zich" for a mixed look */
export const uiLabel = (t: TFn, u: UiId): string => {
  const m = parseMix(u)
  return m ? mixLabel(t, m) : (UI[u as PresetUiId]?.(t) ?? u)
}

const INDUSTRY: Record<IndustryId, (t: TFn) => string> = {
  education: (t) => t("Ta'lim"),
  clinic: (t) => t('Klinika'),
  fitness: (t) => t('Fitnes'),
  retail: (t) => t('Savdo'),
  realestate: (t) => t("Ko'chmas mulk"),
  services: (t) => t('Xizmatlar'),
  manufacturing: (t) => t('Ishlab chiqarish'),
  other: (t) => t('Boshqa'),
}
export const industryLabel = (t: TFn, i: IndustryId) => INDUSTRY[i](t)
export const INDUSTRIES = Object.keys(INDUSTRY) as IndustryId[]

// ───────────────────────────── entities ─────────────────────────────

const ENTITY: Record<EntityId, (t: TFn) => string> = {
  leads: (t) => t('Lidlar'),
  deals: (t) => t('Sdelkalar'),
  contacts: (t) => t('Kontaktlar'),
  calls: (t) => t("Qo'ng'iroqlar"),
  users: (t) => t('Xodimlar'),
  departments: (t) => t("Bo'limlar"),
  leadStages: (t) => t('Lid bosqichlari'),
  dealStages: (t) => t('Sdelka bosqichlari'),
  pipelines: (t) => t('Voronkalar'),
  sources: (t) => t('Lid manbalari'),
  fields: (t) => t("Qo'shimcha maydonlar"),
  stageHistory: (t) => t('Bosqichlar tarixi'),
  campaigns: (t) => t('Reklama kampaniyalari'),
  adDays: (t) => t('Reklama kunlari'),
  extensions: (t) => t('Ichki raqamlar'),
  conversations: (t) => t('Chatlar'),
  orders: (t) => t('Buyurtmalar (cheklar)'),
  products: (t) => t('Mahsulotlar'),
  stock: (t) => t('Ombor qoldig\'i'),
}
export const entityLabel = (t: TFn, e: EntityId) => ENTITY[e](t)

// ───────────────────────────── table mappings ─────────────────────────────

const MAP_TARGET: Record<MapTarget, { label: (t: TFn) => string; about: (t: TFn) => string }> = {
  leads: { label: (t) => t('Lidlar'), about: (t) => t('Har bir qator — bitta lid: sana, holat, manba, menejer') },
  deals: { label: (t) => t('Sdelkalar'), about: (t) => t('Har bir qator — bitta sdelka: sana, bosqich, summa') },
  orders: { label: (t) => t('Cheklar (savdo)'), about: (t) => t('Har bir qator — bitta chek yoki buyurtma: sana va summa') },
  products: { label: (t) => t('Mahsulotlar va qoldiq'), about: (t) => t('Har bir qator — bitta mahsulot: nomi, narxi, qoldig\'i') },
  calls: { label: (t) => t("Qo'ng'iroqlar"), about: (t) => t("Har bir qator — bitta qo'ng'iroq: vaqt, raqam, davomiylik") },
  adSpend: { label: (t) => t('Reklama xarajati'), about: (t) => t('Har bir qator — kun va kampaniya bo\'yicha sarf') },
}
export const mapTargetLabel = (t: TFn, target: MapTarget) => MAP_TARGET[target].label(t)
export const mapTargetAbout = (t: TFn, target: MapTarget) => MAP_TARGET[target].about(t)

/** field labels by id; a few ids mean something else in one target (products.name is the product, not the client) */
const MAP_FIELD: Record<string, (t: TFn) => string> = {
  id: (t) => t('ID (yozuv raqami)'),
  createdAt: (t) => t('Yaratilgan sana'),
  status: (t) => t('Holat'),
  title: (t) => t('Nomi'),
  name: (t) => t('Mijoz ismi'),
  phone: (t) => t('Telefon'),
  source: (t) => t('Manba'),
  manager: (t) => t('Menejer'),
  amount: (t) => t('Summa'),
  closedAt: (t) => t('Yopilgan sana'),
  utmSource: (t) => t('UTM source'),
  utmMedium: (t) => t('UTM medium'),
  utmCampaign: (t) => t('UTM campaign'),
  stage: (t) => t('Bosqich'),
  pipeline: (t) => t('Voronka'),
  leadId: (t) => t('Lid ID'),
  at: (t) => t('Sana va vaqt'),
  total: (t) => t('Summa'),
  shop: (t) => t("Do'kon / filial"),
  seller: (t) => t('Sotuvchi'),
  discount: (t) => t('Chegirma'),
  cost: (t) => t('Tannarx'),
  method: (t) => t("To'lov usuli"),
  items: (t) => t('Mahsulotlar soni'),
  price: (t) => t('Narx'),
  category: (t) => t('Kategoriya'),
  stock: (t) => t('Qoldiq'),
  sku: (t) => t('Artikul (SKU)'),
  direction: (t) => t("Yo'nalish (kiruvchi / chiquvchi)"),
  answered: (t) => t('Javob berildimi'),
  talkSec: (t) => t('Suhbat davomiyligi (soniya)'),
  waitSec: (t) => t('Kutish vaqti (soniya)'),
  day: (t) => t('Kun'),
  campaign: (t) => t('Kampaniya'),
  spend: (t) => t('Sarf'),
  adset: (t) => t("Reklama to'plami"),
  ad: (t) => t("E'lon"),
  impressions: (t) => t("Ko'rsatishlar"),
  clicks: (t) => t('Bosishlar'),
  leads: (t) => t('Lidlar soni'),
  platform: (t) => t('Platforma'),
}
const MAP_FIELD_IN: Partial<Record<MapTarget, Record<string, (t: TFn) => string>>> = {
  products: { name: (t) => t('Mahsulot nomi') },
  orders: { status: (t) => t('Chek holati') },
  calls: { manager: (t) => t('Operator / menejer') },
}
export const mapFieldLabel = (t: TFn, target: MapTarget, field: string): string => (MAP_FIELD_IN[target]?.[field] ?? MAP_FIELD[field])?.(t) ?? field

const VALUE_KIND: Record<ValueKind, (t: TFn) => string> = {
  text: (t) => t('matn'),
  number: (t) => t('son'),
  date: (t) => t('sana'),
  bool: (t) => t("ha / yo'q"),
  empty: (t) => t("bo'sh"),
}
export const valueKindLabel = (t: TFn, k: ValueKind) => VALUE_KIND[k](t)

// ───────────────────────────── checks ─────────────────────────────

export interface CheckText {
  title: string
  /** one plain line: what we checked */
  about: string
  /** what breaks when it is not ok */
  breaks: string
}

/** the pbx.* checks and PBX_* errors are shared by OnlinePBX and Moizvonki; `src` picks the Moizvonki wording */
const MZ = (src?: ConnectableSourceId) => src === 'moizvonki'

/** the generic src.* checks name the source; `params.source` (a source id) wins over the screen's source */
const srcName = (p: Record<string, string | number>, src?: ConnectableSourceId): string => {
  const id = typeof p.source === 'string' ? p.source : src
  try {
    return id ? getSource(id as ConnectableSourceId).name : ''
  } catch {
    return String(id ?? '')
  }
}
const CHAT_IDS: readonly string[] = ['telegram_bot', 'wazzup', 'instagram', 'whatsapp']

/** "1 240 ta chat" — the noun of src.data by params.entity, else by source */
function dataCount(t: TFn, p: Record<string, string | number>, src?: ConnectableSourceId): string {
  const count = p.count ?? 0
  const entity = typeof p.entity === 'string' ? p.entity : src === 'billz' ? 'orders' : src === 'amocrm' ? 'leads' : src && isTabular(src) ? 'tables' : 'conversations'
  switch (entity) {
    case 'tables':
      return src === 'excel' || src === 'sheets' ? t('{count} ta varaq', { count }) : t('{count} ta jadval', { count })
    case 'rows':
      return t('{count} ta qator', { count })
    case 'leads':
      return t('{count} ta lid', { count })
    case 'deals':
      return t('{count} ta sdelka', { count })
    case 'users':
      return t('{count} ta xodim', { count })
    case 'orders':
      return t('{count} ta chek', { count })
    case 'products':
      return t('{count} ta mahsulot', { count })
    case 'stock':
      return t('{count} ta qoldiq yozuvi', { count })
    default:
      return t('{count} ta chat', { count })
  }
}

const CHECK: Record<CheckId, (t: TFn, p: Record<string, string | number>, src?: ConnectableSourceId) => CheckText> = {
  'bitrix.reachable': (t) => ({ title: t('Portal javob berdi'), about: t('Bitrix24 manzili ochiladi va javob qaytaradi'), breaks: t("Portal ochilmasa, hech qanday ma'lumot ololmaymiz") }),
  'bitrix.webhook': (t) => ({ title: t('Havola ishlayapti'), about: t('Bu tirik kiruvchi webhook havolasi'), breaks: t("Havola o'chirilgan bo'lsa, ulanib bo'lmaydi") }),
  'bitrix.plan': (t, p) => ({ title: t('Tarif: {plan}', { plan: p.plan ?? '—' }), about: t('Bu tarifda REST API ochiq'), breaks: t("Bepul tarifda REST yopiq — ma'lumot ololmaymiz") }),
  'bitrix.creator': (t, p) => ({ title: t('Havolani yaratgan: {name}', { name: p.name ?? '—' }), about: t("Ma'lumotlar shu xodim huquqlari bilan o'qiladi"), breaks: t("Bu xodim ko'rmaydigan yozuvlar dashbordga tushmaydi") }),
  'bitrix.admin': (t) => ({ title: t('Administrator huquqi'), about: t('Havolani administrator yaratgan'), breaks: t("Administrator bo'lmasa, ba'zi lid va sdelkalar yashirin qolishi mumkin") }),
  'bitrix.scope.crm': (t) => ({ title: t('CRM ruxsati'), about: t("Lid, sdelka va bosqichlarni o'qish"), breaks: t('Busiz dashbord ishlamaydi') }),
  'bitrix.scope.user': (t) => ({ title: t('Xodimlar ruxsati'), about: t("Menejerlar ro'yxatini o'qish"), breaks: t("Busiz menejerlar bo'yicha natija ko'rinmaydi") }),
  'bitrix.scope.department': (t) => ({ title: t("Bo'limlar ruxsati"), about: t("Bo'limlar tuzilmasini o'qish"), breaks: t("Bo'limlar kesimidagi filtrlar bo'lmaydi") }),
  'bitrix.scope.telephony': (t) => ({ title: t('Telefoniya ruxsati'), about: t("Bitrix24 ichidagi qo'ng'iroqlarni o'qish"), breaks: t("Qo'ng'iroqlar sahifasi uchun OnlinePBX kerak bo'ladi") }),
  'bitrix.scope.task': (t) => ({ title: t('Vazifalar ruxsati'), about: t("Vazifalarni o'qish"), breaks: t('Vazifalar statistikasi bo\'lmaydi') }),
  'bitrix.scope.timeman': (t) => ({ title: t('Ish vaqti ruxsati'), about: t("Ish kunining boshlanishi va tugashini o'qish"), breaks: t('Ish vaqti hisoblari taxminiy bo\'ladi') }),
  'bitrix.data.leads': (t, p) => ({ title: t('{count} ta lid', { count: p.count ?? 0 }), about: t('Portalda lidlar bor'), breaks: t("Lid bo'lmasa, Lidlar sahifasi bo'sh qoladi") }),
  'bitrix.data.deals': (t, p) => ({ title: t('{count} ta sdelka', { count: p.count ?? 0 }), about: t('Portalda sdelkalar bor'), breaks: t("Sdelka bo'lmasa, Sotuvlar sahifasi bo'sh qoladi") }),
  'bitrix.data.calls': (t, p) => ({ title: t("{count} ta qo'ng'iroq", { count: p.count ?? 0 }), about: t("Bitrix24 telefoniyasidagi qo'ng'iroqlar"), breaks: t("Qo'ng'iroqlar uchun OnlinePBX ulang") }),
  'meta.token': (t) => ({ title: t('Token ishlayapti'), about: t('Meta tokenni tanidi'), breaks: t("Token noto'g'ri bo'lsa, reklama ma'lumoti kelmaydi") }),
  'meta.expiry': (t, p) => ({
    title: p.days === undefined ? t('Muddatsiz token') : t('Token {days} kundan keyin tugaydi', { days: p.days }),
    about: t('Token qancha vaqt ishlashi'),
    breaks: t("Muddati tugasa, reklama raqamlari yangilanmay qoladi"),
  }),
  'meta.perm.ads_read': (t) => ({ title: t("Reklamani o'qish ruxsati"), about: t('ads_read: sarf va natijalar'), breaks: t("Busiz Kampaniyalar sahifasi ishlamaydi") }),
  'meta.perm.leads_retrieval': (t) => ({ title: t('Lid formalar ruxsati'), about: t("leads_retrieval: formadan kelgan lidlar"), breaks: t('Forma nomlari va forma lidlari ko\'rinmaydi') }),
  'meta.perm.pages': (t) => ({ title: t('Sahifalar ruxsati'), about: t("Facebook sahifalarini o'qish"), breaks: t('Lid formalarni sahifa bo\'yicha topa olmaymiz') }),
  'meta.perm.business': (t) => ({ title: t('Biznes menejer ruxsati'), about: t("Biznes hisobidagi reklama hisoblari"), breaks: t("Ba'zi reklama hisoblari ko'rinmasligi mumkin") }),
  'meta.accounts': (t, p) => ({ title: t('{count} ta reklama hisobi', { count: p.count ?? 0 }), about: t('Token ko\'radigan reklama hisoblari'), breaks: t("Hisob bo'lmasa, reklama ma'lumoti yo'q") }),
  'meta.insights': (t) => ({ title: t("Sarf o'qiladi"), about: t('Oxirgi 30 kunlik reklama sarfi'), breaks: t("Sarf o'qilmasa, lid narxi hisoblanmaydi") }),
  'pbx.auth': (t, _p, src) => ({ title: t('Kalit ishlayapti'), about: MZ(src) ? t('Moi Zvonki login va API kalitini tanidi') : t('OnlinePBX API kalitini tanidi'), breaks: t("Kalit noto'g'ri bo'lsa, qo'ng'iroqlar kelmaydi") }),
  'pbx.domain': (t, _p, src) => ({ title: MZ(src) ? t('Hisob topildi') : t('Domen topildi'), about: MZ(src) ? t('Moi Zvonki hisob manzili javob berdi') : t('OnlinePBX domeni javob berdi'), breaks: t("Domen noto'g'ri bo'lsa, ulanib bo'lmaydi") }),
  'pbx.users': (t, p, src) => ({ title: MZ(src) ? t('{count} ta xodim', { count: p.count ?? 0 }) : t('{count} ta ichki raqam', { count: p.count ?? 0 }), about: MZ(src) ? t("Xodimlar ro'yxati administrator kaliti bilan olinadi") : t('Operatorlarning ichki raqamlari'), breaks: t("Ichki raqam bo'lmasa, operatorlar bo'yicha natija yo'q") }),
  'pbx.history': (t, p) => ({ title: t("Oxirgi sutkada {count} ta qo'ng'iroq", { count: p.count ?? 0 }), about: t("Qo'ng'iroqlar tarixi o'qiladi"), breaks: t("Tarix o'qilmasa, Qo'ng'iroqlar sahifasi bo'sh qoladi") }),
  'src.auth': (t, p, src) => CHECK_SRC['src.auth'](t, p, src),
  'src.account': (t, p, src) => CHECK_SRC['src.account'](t, p, src),
  'src.permissions': (t, p, src) => CHECK_SRC['src.permissions'](t, p, src),
  'src.data': (t, p, src) => CHECK_SRC['src.data'](t, p, src),
  'src.webhook': (t, p, src) => CHECK_SRC['src.webhook'](t, p, src),
}
const CHECK_SRC: Record<Extract<CheckId, `src.${string}`>, (t: TFn, p: Record<string, string | number>, src?: ConnectableSourceId) => CheckText> = {
  'src.auth': (t, p, src) =>
    src === 'excel'
      ? { title: t("Fayl o'qildi"), about: t('Fayl ochildi va jadvallari topildi'), breaks: t("Fayl o'qilmasa, undan ma'lumot olib bo'lmaydi") }
      : src === 'sheets'
        ? { title: t('Jadval ochildi'), about: t('Google Sheets jadvali bizga ochiq'), breaks: t("Jadval ulashilmagan bo'lsa, uni o'qiy olmaymiz") }
        : src && isDatabase(src)
          ? { title: t('Bazaga ulandik'), about: t('{source} login va parolni qabul qildi', { source: srcName(p, src) }), breaks: t("Login yoki parol noto'g'ri bo'lsa, ma'lumot kelmaydi") }
          : { title: t('Kalit ishlayapti'), about: t('{source} kalitni tanidi', { source: srcName(p, src) }), breaks: t("Kalit noto'g'ri bo'lsa, ma'lumot kelmaydi") },
  'src.account': (t, p, src) => ({
    title: String(p.name ?? '—'),
    about:
      src === 'telegram_bot'
        ? t('Shu bot topildi. Bitta bot — bitta manba.')
        : src === 'billz'
          ? t("Shu kompaniyaning do'konlari o'qiladi")
          : src === 'excel' || src === 'sheets'
            ? t("Shu jadval o'qiladi")
            : src && isDatabase(src)
              ? t("Shu baza o'qiladi")
          : CHAT_IDS.includes(src ?? '')
            ? t('Shu hisob chatlari o\'qiladi')
            : t('Shu hisob ochildi'),
    breaks: t("Hisob topilmasa, ulanib bo'lmaydi"),
  }),
  'src.permissions': (t, p, src) =>
    src && isDatabase(src)
      ? {
          // databases warn when the user can write: the server sends params {reason: 'writable', user, privileges: "INSERT,UPDATE"}
          title: p.privileges || p.grants || p.missing ? t('Foydalanuvchi yozish huquqiga ega: {grants}', { grants: p.privileges ?? p.grants ?? p.missing ?? '' }) : t("Faqat o'qish huquqi"),
          about: t("Biz faqat tanlangan jadvallardan SELECT qilamiz — hech narsa yozmaymiz"),
          breaks: t("Xavfsizlik uchun faqat o'qish uchun alohida foydalanuvchi yarating (formadagi yo'riqnoma)"),
        }
      : {
    title: p.missing ? t('Yetishmayotgan ruxsatlar: {missing}', { missing: p.missing }) : t('Kerakli ruxsatlar bor'),
    about: t("Dashbordga kerak bo'ladigan o'qish ruxsatlari"),
    breaks: t("Ruxsat yetishmasa, ba'zi raqamlar ko'rinmaydi"),
        },
  'src.data': (t, p, src) => ({ title: dataCount(t, p, src), about: t("Ma'lumot bor va o'qiladi"), breaks: t("Ma'lumot bo'lmasa, sahifa bo'sh qoladi") }),
  'src.webhook': (t) => ({
    title: t('Jonli yangilanish'),
    about: t("Jonli yangilanish uchun ochiq manzil kerak — hozircha ma'lumot muntazam yuklab olinadi"),
    breaks: t('Yangi chatlar darhol emas, keyingi yangilanishda tushadi'),
  }),
}

export const checkText = (t: TFn, id: CheckId, params?: Params, src?: ConnectableSourceId): CheckText => CHECK[id](t, v(params), src)

// ───────────────────────────── errors (what happened + what to do) ─────────────────────────────

export interface ErrorText {
  /** what happened (headline) */
  title: string
  /** what to do */
  action: string
}

const ERROR: Record<ErrorCode, (t: TFn, p: Record<string, string | number>, src?: ConnectableSourceId) => ErrorText> = {
  NOT_FOUND: (t) => ({ title: t('Bunday loyiha topilmadi'), action: t("Loyihalar ro'yxatidan qaytadan oching") }),
  // sign-in (RU + EN in src/i18n/dict/auth.ts; the sign-in pages use features/auth/errors.ts for their own wording)
  UNAUTHORIZED: (t) => ({ title: t('Kirish muddati tugadi'), action: t('Qaytadan kiring') }),
  FORBIDDEN: (t) => ({ title: t('Bu amal faqat egasi uchun'), action: t("Kerak bo'lsa, egasidan so'rang") }),
  INVALID_LOGIN: (t) => ({ title: t("E-mail yoki parol noto'g'ri"), action: t("Qaytadan tekshirib kiriting. Parolni unutgan bo'lsangiz, egasidan yangi parol so'rang") }),
  SETUP_DONE: (t) => ({ title: t('Egasi allaqachon yaratilgan'), action: t('E-mail va parolingiz bilan kiring') }),
  WEAK_PASSWORD: (t) => ({ title: t('Parol juda oddiy'), action: t("Kamida 10 ta belgi bo'lsin va oson topiladigan parol bo'lmasin (masalan, 12345678 yoki qwerty)") }),
  VALIDATION:(t) => ({ title: t("Kiritilgan ma'lumot to'liq emas"), action: t("Belgilangan maydonni to'g'rilang") }),
  ALREADY_CONNECTED: (t) => ({ title: t('Bu manba allaqachon ulangan'), action: t("Bir manbani ikki marta ulab bo'lmaydi, CRM esa bitta bo'ladi (Bitrix24 yoki AmoCRM) — boshqasini tanlang") }),
  // the table sources' own codes
  SHEET_NOT_SHARED: (t, p) => ({
    title: t('Jadval bizga ochilmagan'),
    action: (p.serviceAccount ?? p.email)
      ? t("Google Sheets'da «Ulashish» → {email} manzilini «Ko'ruvchi» qilib qo'shing yoki «Havolaga ega har kim» → «Ko'ruvchi» ni tanlang", { email: p.serviceAccount ?? p.email ?? '' })
      : t("Google Sheets'da «Ulashish» → bizning xizmat e-pochtamizni «Ko'ruvchi» qilib qo'shing yoki «Havolaga ega har kim» → «Ko'ruvchi» ni tanlang"),
  }),
  HOST_NOT_ALLOWED: (t) => ({
    title: t('Serverimiz bu manzilga ulana olmaydi'),
    action: t("Ichki (xususiy) manzillarga, masalan localhost yoki 192.168.x.x ga ulanib bo'lmaydi — bazaning ochiq (public) manzilini kiriting yoki biz bilan bog'laning"),
  }),
  TABLE_NOT_FOUND: (t, p) => ({
    title: p.table ? t('«{table}» jadvali topilmadi', { table: p.table }) : t('Jadval topilmadi'),
    action: t("Jadval o'chirilgan yoki nomi o'zgargan — moslashni yangilang"),
  }),
  MAPPING_INVALID: (t, p) => ({
    title: p.field ? t('«{field}» maydoni to\'g\'ri moslanmagan', { field: p.fieldLabel ?? p.field }) : t("Moslash to'liq emas"),
    action: t("Majburiy maydonlarga ustun tanlang va ustun jadvalda borligini tekshiring"),
  }),
  CONNECT_BLOCKED: (t) => ({ title: t("Kalit ishlaydi, lekin kerakli ruxsat yo'q"), action: t("Quyidagi qizil bandlarni tuzating va qayta tekshiring") }),
  EMPTY: (t) => ({ title: t("Maydon bo'sh"), action: t('Havolani yoki kalitni joylashtiring') }),
  NO_DATA: (t) => ({ title: t('Portalda lid yoki sdelka topilmadi'), action: t("Portalda lid yoki sdelka borligini tekshirib, ma'lumotlarni qayta yuklang") }),
  NOT_A_WEBHOOK: (t) => ({ title: t('Bu Bitrix24 webhook havolasi emas'), action: t("Bitrix24 → Dasturchilar → Kiruvchi webhook bo'limidan havolani nusxalang") }),
  BROKEN_WEBHOOK: (t) => ({ title: t("Havola to'liq emas"), action: t('Havolani oxirigacha, / belgisi bilan birga nusxalang') }),
  LOOKS_LIKE_OAUTH: (t) => ({ title: t("Bu ilova kaliti, webhook havolasi emas"), action: t('Kiruvchi webhook yarating va uning havolasini joylashtiring') }),
  BAD_USER_ID: (t) => ({ title: t("Havoladagi xodim raqami noto'g'ri"), action: t('Havolani Bitrix24 dan qaytadan nusxalang') }),
  INVALID_CREDENTIALS: (t) => ({ title: t('Kalit qabul qilinmadi'), action: t("Kalit o'chirilgan yoki noto'g'ri — yangisini yarating") }),
  NO_AUTH_FOUND: (t) => ({ title: t('Portal bu havolani tanimadi'), action: t("Webhook o'chirilmaganini tekshiring yoki yangisini yarating") }),
  ACCESS_DENIED: (t) => ({ title: t('Bu tarifda REST API yopiq'), action: t("Bitrix24 tarifini tekshiring — bepul tarifda ulanib bo'lmaydi") }),
  PORTAL_DELETED: (t) => ({ title: t("Portal o'chirilgan yoki bloklangan"), action: t('Portal manzilini tekshiring') }),
  // 429 OVERLOAD_LIMIT {service: 'voice'} = too many spoken questions this minute (POST /api/assistant/messages)
  OVERLOAD_LIMIT: (t, p) =>
    voiceLimit(t, { code: 'OVERLOAD_LIMIT', params: p }) ?? { title: t("Portal so'rovlarni vaqtincha cheklayapti"), action: t('Bir necha daqiqadan keyin qayta urinib ko\'ring') },
  // 429 UNREACHABLE {service: 'voice', reason: 'rate_limited' | 'daily_limit'} = the live-voice limits (POST /api/voice/…)
  UNREACHABLE: (t, p) => voiceLimit(t, { code: 'UNREACHABLE', params: p }) ?? { title: t("Server bilan aloqa yo'q"), action: t("Internetni tekshiring va qayta urinib ko'ring") },
  TIMEOUT: (t) => ({ title: t('Javob juda uzoq kutildi'), action: t("Qayta urinib ko'ring") }),
  META_TOKEN_INVALID: (t) => ({ title: t('Meta tokeni yaroqsiz'), action: t('Business Manager → System User dan yangi token oling') }),
  META_TOKEN_EXPIRED: (t) => ({ title: t('Meta tokenining muddati tugagan'), action: t('Muddatsiz System User tokenini yarating') }),
  META_PERMISSION: (t) => ({ title: t("Tokenda ads_read ruxsati yo'q"), action: t("Token yaratishda ads_read ni belgilang") }),
  META_AD_ACCOUNT: (t) => ({
    title: t("Reklama hisobini o'qib bo'lmadi"),
    action: t("Reklama akkaunti ID sini kiriting (Ads Manager manzilida act= dan keyingi raqam) va token shu hisobga ruxsatli ekanini tekshiring"),
  }),
  PBX_WRONG_DOMAIN: (t, _p, src) =>
    MZ(src)
      ? { title: t('Moi Zvonki hisobi topilmadi'), action: t('Manzilni tekshiring, masalan kompaniya.moizvonki.ru') }
      : { title: t('OnlinePBX domeni topilmadi'), action: t("Domenni tekshiring, masalan kompaniya.onpbx.ru") },
  PBX_WRONG_KEY: (t, _p, src) =>
    MZ(src)
      ? { title: t('Moi Zvonki login yoki kalitni qabul qilmadi'), action: t("Login — shu foydalanuvchining e-pochtasi; kalitni «Настройки» → «Интеграция» dan qaytadan nusxalang") }
      : { title: t('OnlinePBX kaliti qabul qilinmadi'), action: t('Integratsiya bo\'limidan kalitni qaytadan nusxalang') },
  PBX_DISABLED: (t, _p, src) => ({ title: MZ(src) ? t("Moi Zvonki da API o'chirilgan") : t("OnlinePBX da API o'chirilgan"), action: t('Sozlamalarda API ni yoqing') }),
  PBX_FORBIDDEN_IP: (t, _p, src) => ({ title: MZ(src) ? t('Moi Zvonki bizning serverimizni bloklayapti') : t('OnlinePBX bizning serverimizni bloklayapti'), action: t("IP cheklovini olib tashlang yoki ruxsat bering") }),
  FILE_TOO_LARGE: (t, p, src) => ({
    title: t('Fayl juda katta'),
    action: p.maxMb
      ? t('{maxMb} MB dan kichik fayl yuklang', { maxMb: p.maxMb })
      : src === 'excel'
        ? t("Server faylni qabul qilmadi. Kichikroq fayl yuklang yoki ortiqcha varaqlarni o'chiring")
        : // no limit in the answer: the web server in front of Studio refused it, so no number is promised here
          t('Server faylni qabul qilmadi. Kichikroq fayl yuklang'),
  }),
  FILE_FORMAT: (t, _p, src) =>
    src === 'excel'
      ? { title: t("Bu fayl turini o'qiy olmaymiz"), action: t('.xlsx, .xls yoki .csv fayl yuklang — parolsiz, birinchi qatorda ustun nomlari bilan') }
      : { title: t('Bu fayl turini o\'qiy olmaymiz'), action: t('Bitrix24 dan CSV yoki Excel qilib eksport qiling') },
  FILE_NO_ID: (t) => ({ title: t('Faylda ID ustuni yo\'q'), action: t('Eksportda ID ustunini yoqing va qayta yuklang') }),
  FILE_WRONG_PORTAL: (t) => ({ title: t('Bu fayl boshqa portaldan'), action: t('Ulangan portaldan eksport qilingan faylni yuklang') }),
  // what happened + where it goes in the slot card (the file type switch is gone): the row offers "Sdelkalar fayli sifatida yuklash"
  FILE_WRONG_ENTITY: (t, p) =>
    p.detected === 'deals'
      ? { title: t('Bu sdelkalar fayli, lidlar emas'), action: t('Sdelkalar qatoriga tashlang') }
      : p.detected === 'leads'
        ? { title: t('Bu lidlar fayli, sdelkalar emas'), action: t('Lidlar qatoriga tashlang') }
        : { title: t('Fayl bu qatorga mos emas'), action: t("Faylni o'z qatoriga tashlang") },
  JOB_RUNNING: (t) => ({ title: t('Jarayon allaqachon ketyapti'), action: t('Tugashini kuting yoki uni to\'xtating') }),
  STEP_LOCKED: (t) => ({ title: t("Bu qadamga hali o'tib bo'lmaydi"), action: t('Avval joriy qadamni tugating') }),
  SCRATCH_SOON: (t) => ({ title: t('Muharrir tez kunda'), action: t('Hozircha tayyor dashbord bilan davom eting') }),
  NEEDS_BITRIX: (t) => ({ title: t('Asosiy manba ulanmagan'), action: t("Avval CRM (Bitrix24 yoki AmoCRM), chat yoki kassa (Billz) manbasini ulang") }),
  // Nova (the assistant): one neutral text for every "the model can't answer" code outside /sozlamalar/ai; the
  // detailed Claude Code / Anthropic texts live in features/ai/labels.ts (aiSettingsErrorText), used on that page only
  CLAUDE_UNAVAILABLE: (t) => alfredDown(t),
  AI_KEY_INVALID: (t) => alfredDown(t),
  AI_CLI_NOT_FOUND: (t) => alfredDown(t),
  AI_CLI_NOT_LOGGED_IN: (t) => alfredDown(t),
  AI_LIMIT_REACHED: (t, p) => ({
    title: t('Nova limitga yetdi'),
    action: p.resetsAt
      ? t("{time} dan keyin yana to'liq javob beradi — hozircha tezkor javoblar ishlaydi", { time: fmtResets(p.resetsAt) })
      : t("Birozdan keyin qayta so'rang — hozircha tezkor javoblar ishlaydi"),
  }),
  GEMINI_KEY_INVALID: (t) => ({ title: t('Ovoz kaliti (Gemini) qabul qilinmadi'), action: t("Kalitni Google AI Studio'dan to'liq nusxalab qayta qo'ying") }),
  GEMINI_NOT_CONFIGURED: (t) => ({ title: t('Ovoz hali sozlanmagan'), action: t("Administrator Sozlamalar → AI ulanish bo'limida ovoz kalitini qo'shsin") }),
  VOICE_LIVE_DISABLED: (t) => ({ title: t("Jonli suhbat o'chirilgan"), action: t('Diktovkadan foydalaning') }),
  VOICE_NOTICE_REQUIRED: (t) => ({ title: t('Avval ovoz haqidagi ogohlantirishni tasdiqlang'), action: t('"Roziman" tugmasini bosing va qayta urining') }),
  // Loyihalar → usage: "Hozir yangilash"
  USAGE_NO_COLLECTOR: (t) => ({ title: t("Bu loyiha uchun avtomatik yig'ish ulanmagan"), action: t("Raqamlarni qo'lda yuklang yoki yig'ishni sozlang") }),
  TOO_SOON: (t, p) => ({
    title: t('Hozirgina yangilandi'),
    action: p.retryAfter ? t('{n} soniyadan keyin qayta urining', { n: p.retryAfter }) : t("Birozdan keyin qayta urinib ko'ring"),
  }),
  NOT_PUBLISHED: (t) => ({ title: t('Dashbord hali nashr qilinmagan'), action: t('Avval dashbordni nashr qiling — taqsimot uning serverida ishlaydi') }),
  NOT_SYNCED: (t) => ({ title: t("Dashbord serveriga yetib bo'lmadi"), action: t("Qayta urinib ko'ring") }),
  INTERNAL: (t) => ({ title: t('Serverda xato yuz berdi'), action: t("Qayta urinib ko'ring; takrorlansa, bizga yozing") }),
}
export const errorText = (t: TFn, e: { code: ErrorCode; params?: Params }, src?: ConnectableSourceId): ErrorText => ERROR[e.code](t, v(e.params), src)

/**
 * Nova's voice limits in words (null = not a voice limit): 429 OVERLOAD_LIMIT {service: 'voice'} (spoken questions per
 * minute) and 429 UNREACHABLE {service: 'voice', reason: 'rate_limited'} (voice tokens per minute) → "too many spoken
 * questions"; UNREACHABLE {reason: 'daily_limit'} → today's live-conversation limit is used up.
 */
export function voiceLimit(t: TFn, e: { code: string; params?: Params }): ErrorText | null {
  const p = v(e.params)
  if (e.code === 'UNREACHABLE' && p.reason === 'daily_limit')
    return { title: t('Bugungi ovozli suhbat limiti tugadi'), action: t("Ertaga qayta urinib ko'ring — hozircha savolni yozib yuboring") }
  if ((e.code === 'OVERLOAD_LIMIT' && p.service === 'voice') || (e.code === 'UNREACHABLE' && p.service === 'voice' && p.reason === 'rate_limited'))
    return { title: t("Juda ko'p ovozli savol — bir daqiqadan keyin qayta urinib ko'ring"), action: t('Hozircha savolni yozib yuborishingiz mumkin') }
  return null
}

function alfredDown(t: TFn): ErrorText {
  return { title: t('Nova hozir javob bera olmaydi'), action: t("Administrator Sozlamalar → AI ulanish bo'limini tekshirsin") }
}

/** "14:30" today, "23.10 14:30" on another day (local time) */
function fmtResets(at: string | number): string {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return String(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date().toDateString() ? time : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`
}

// ───────────────────────────── notices ─────────────────────────────

export type NoticeTone = 'info' | 'warn' | 'good'

const NOTICE: Record<NoticeCode, { tone: NoticeTone; text: (t: TFn, p: Record<string, string | number>) => string }> = {
  RATE_LIMIT_BACKOFF: { tone: 'info', text: (t, p) => t("Portal so'rovlarni cheklayapti — {sec} soniya kutamiz", { sec: p.sec ?? 0 }) },
  OPERATION_TIME_PAUSE: { tone: 'info', text: (t, p) => t("Portal vaqt limiti: {sec} soniya tanaffus", { sec: p.sec ?? 0 }) },
  SERVER_RESTARTED: { tone: 'warn', text: (t) => t("Server qayta ishga tushdi — to'xtagan joyidan davom ettiring") },
  PARTIAL_DATA: { tone: 'warn', text: (t, p) => t("{entity}: ma'lumotning bir qismi olindi", { entity: p.entity ?? '' }) },
  PBX_DAY_SPLIT: { tone: 'info', text: (t, p) => t("{day}: kun bo'laklarga bo'lib olinmoqda", { day: p.day ?? '' }) },
  META_THROTTLED: { tone: 'info', text: (t, p) => t('Meta cheklov qo\'ydi — {sec} soniya kutamiz', { sec: p.sec ?? 0 }) },
  WAITING_FOR_LOAD: { tone: 'info', text: (t) => t("Yuklash tugashini kutyapmiz") },
  NO_NEW_DATA: { tone: 'good', text: (t) => t("Yangi ma'lumot yo'q — hammasi joyida") },
  BIG_PORTAL: { tone: 'warn', text: (t, p) => t('Katta portal: {rows} ta yozuv', { rows: p.rows ?? 0 }) },
  NIGHT_RECOMMENDED: { tone: 'info', text: (t) => t("Kechasi yuklash tavsiya etiladi — portal kunduzi tez ishlaydi") },
  PBX_WEEK_CHUNKS: { tone: 'info', text: (t) => t("Qo'ng'iroqlar haftama-hafta olinadi") },
  META_HISTORY_37M: { tone: 'info', text: (t) => t('Meta faqat oxirgi 37 oylik tarixni beradi') },
  DEMO_SPEED: { tone: 'info', text: (t, p) => t('Demo tezligi: ×{scale}', { scale: p.scale ?? 1 }) },
  FILE_OK: { tone: 'good', text: (t) => t('Fayl portal bilan mos keldi') },
  FILE_PARTIAL: { tone: 'warn', text: (t, p) => t('Faylda {file} ta yozuv, portalda {portal} ta', { file: p.file ?? 0, portal: p.portal ?? 0 }) },
  FILE_STALE: { tone: 'warn', text: (t, p) => t("Fayl eskirgan: {pct}% yozuv o'zgargan", { pct: p.pct ?? 0 }) },
  UNKNOWN_LABELS: { tone: 'warn', text: (t, p) => t('{count} ta nom portalda topilmadi', { count: p.count ?? 0 }) },
  DATES_SHIFTED: { tone: 'info', text: (t, p) => t('Sanalar {hours} soatga surilgan — tuzatdik', { hours: p.hours ?? 0 }) },
  NO_BITRIX: { tone: 'warn', text: (t) => t('Bitrix24 ulanmagan') },
  NO_CHATS: { tone: 'warn', text: (t) => t('Chat manbasi ulanmagan — Telegram, Wazzup, Instagram yoki WhatsApp ulang') },
  NO_POS: { tone: 'warn', text: (t) => t('Kassa (POS) ulanmagan — Billz ulang') },
  ROWS_SKIPPED: { tone: 'warn', text: (t, p) => t("{table}: {count} ta qator o'tkazib yuborildi — majburiy qiymat yo'q yoki o'qilmadi", { table: p.table ?? '', count: p.count ?? 0 }) },
  NO_TELEPHONY: { tone: 'warn', text: (t) => t("Telefoniya ulanmagan — OnlinePBX ulang") },
  NO_META: { tone: 'warn', text: (t) => t("Meta Ads ulanmagan — reklama sarfi ko'rinmaydi") },
  NO_DEPARTMENT: { tone: 'warn', text: (t) => t("Bo'limlar ruxsati yo'q — bo'lim filtri bo'lmaydi") },
  NO_PAYMENTS: { tone: 'warn', text: (t) => t("To'lov ma'lumoti yo'q — yutilgan sdelka summasi olinadi") },
  NO_DEALS: { tone: 'warn', text: (t) => t("Portalda sdelka yo'q") },
  NO_WON_DEALS: { tone: 'warn', text: (t) => t("Yutilgan sdelka yo'q — reja bajarilishi bo'sh") },
  NO_FORMS: { tone: 'warn', text: (t) => t("Lid formalar ruxsati yo'q — forma nomlari ko'rinmaydi") },
  NO_UTM_MATCH: { tone: 'warn', text: (t) => t('Lidlar kampaniyalarga UTM orqali bog\'lanmadi') },
  VIEW_ONLY: { tone: 'info', text: (t) => t("Faqat ko'rish: portalga hech narsa yozmaymiz") },
  MASKED: { tone: 'info', text: (t) => t('Shaxsiy ma\'lumotlar yashirilgan') },
  EMPTY: { tone: 'info', text: (t) => t("Bu yerda hali yozuv yo'q") },
  NOT_AVAILABLE: { tone: 'info', text: (t) => t("Bu ma'lumot shu manbada yo'q") },
  GUESS_NAME: { tone: 'info', text: (t) => t('Nomiga qarab taxmin qildik') },
  GUESS_TEMPLATE: { tone: 'info', text: (t) => t('Data365 shabloniga qarab taxmin qildik') },
  GUESS_SEMANTICS: { tone: 'info', text: (t) => t("Bitrix24 bosqich turiga qarab taxmin qildik") },
  GUESS_ACTIVITY: { tone: 'info', text: (t) => t("Oxirgi 90 kunlik faollikka qarab taxmin qildik") },
  GUESS_DEFAULT: { tone: 'info', text: (t) => t('Odatiy tanlov') },
  SECTION_SKIPPED: { tone: 'info', text: (t) => t("Bu bo'lim yuklanmagan — sahifada bo'sh ko'rinadi") },
}

function isNoticeCode(code: string): code is NoticeCode {
  return code in NOTICE
}

/** text of a notice; job errors (ErrorCode) read as their headline */
export function noticeText(t: TFn, n: Notice): string {
  return isNoticeCode(n.code) ? NOTICE[n.code].text(t, v(n.params)) : ERROR[n.code](t, v(n.params)).title
}
export function noticeTone(n: Notice): NoticeTone {
  return isNoticeCode(n.code) ? NOTICE[n.code].tone : 'warn'
}

// ───────────────────────────── questions ─────────────────────────────

export interface QuestionText {
  title: string
  help: string
}

const QUESTION: Record<QuestionId, (t: TFn, p: Record<string, string | number>) => QuestionText> = {
  'lead.stageMap': (t, p) => ({
    title: t('Lid bosqichlaringiz nimani anglatadi?'),
    help: t("Portalingizdagi {stages} ta bosqichning har biriga ma'no bering — biz taxmin qilib qo'ydik", { stages: p.stages ?? '' }),
  }),
  'lead.qualified': (t) => ({
    title: t('Qaysi bosqichlar sifatli lid hisoblanadi?'),
    help: t("Buni o'zingiz belgilaysiz — biz oldindan belgilamadik. Lid shu bosqichlardan biriga bir marta yetsa ham sifatli sanaladi."),
  }),
  'lead.junk': (t) => ({
    title: t('Qaysilari sifatsiz lid?'),
    help: t("Bitrix24 bu bosqichlarni «muvaffaqiyatsiz» deb biladi, nomidan esa aniq emas. Belgilanganlari «Sifatsiz», qolganlari «Bekor bo'ldi» bo'ladi."),
  }),
  'lead.visited': (t) => ({
    title: t('Qaysi bosqichlar — mijoz keldi («Tashrif buyurdi»)?'),
    help: t('Bosqich nomlari va muvaffaqiyatli bosqichdan taxmin qildik'),
  }),
  'lead.booked': (t) => ({
    title: t("Mijoz kelishga rozi bo'lgan bosqich qaysi? («Tashrif belgilandi»)"),
    help: t('Bosqich yoki sana maydoni bo\'lishi mumkin — qaysi biri ishonchliroq bo\'lsa'),
  }),
  'lead.reasons': (t) => ({
    title: t("«Bekor bo'ldi» va «Sifatsiz» sabablari qaysi maydonlarda?"),
    help: t("Sabablar diagrammasi shu maydonlardan quriladi"),
  }),
  'deal.reasons': (t) => ({
    title: t('Sdelka bekor bo\'lish sabablari qaysi maydonlarda?'),
    help: t('Bekor bo\'lgan sdelkalar sababi shu maydonlardan olinadi'),
  }),
  'deal.pipelines': (t) => ({
    title: t('Qaysi voronkalar sotuv?'),
    help: t("Keyingi savollar va dashborddagi sotuv faqat shu voronkalar bo'yicha hisoblanadi"),
  }),
  'deal.stageMap': (t) => ({
    title: t('Sdelka bosqichlari nimani anglatadi?'),
    help: t("Har bir bosqich: ochiq, kelishuv, sotildi yoki bekor"),
  }),
  'deal.kelishuv': (t) => ({
    title: t('Qaysi bosqichdan mijoz bilan kelishilgan hisoblanadi?'),
    help: t('Har voronkadan bitta bosqich tanlang — undan keyingilari ham «Kelishuv» sanaladi'),
  }),
  'deal.payments': (t) => ({ title: t("To'langan pulni qayerdan olamiz?"), help: t("Tushum raqami shundan hisoblanadi") }),
  'deal.paymentDate': (t) => ({ title: t("To'lov sanasi qaysi maydondan olinsin?"), help: t("Birinchi to'ldirilgani olinadi") }),
  'staff.sales': (t) => ({ title: t("Kimlar sotuv bo'yicha mas'ul (menejer)?"), help: t("Faqat shu xodimlar menejerlar reytingida ko'rinadi") }),
  'taqsimot.main': (t) => ({ title: t('Yangi lidlar qaysi foydalanuvchiga tushadi?'), help: t('Taqsimot yoqilganda shu foydalanuvchidagi lidlar operatorlarga beriladi') }),
  'taqsimot.hours': (t) => ({ title: t('Operatorlar soat nechadan nechagacha ishlaydi?'), help: t('Ish vaqtidan keyin kelgan lidlar ertangi kun jamoasiga beriladi') }),
  'staff.exclude': (t) => ({ title: t('Qaysi foydalanuvchilarni yashiramiz?'), help: t('Integratsiya, bot va tizim foydalanuvchilari hisobotlarni buzadi') }),
  'sources.phone': (t) => ({ title: t("Qaysi manbalar — kiruvchi qo'ng'iroq?"), help: t("Qo'ng'iroqdan kelgan lidlar alohida sanaladi") }),
  'sources.paid': (t) => ({ title: t('Qaysi manbalar — Facebook/Instagram reklamasidan kelgan lidlar?'), help: t('Lid narxi va reklama natijasi shu manbalardan hisoblanadi') }),
  currency: (t) => ({ title: t('Summalar qaysi valyutada?'), help: t('Dollarni Markaziy bank kursida so\'mga aylantiramiz') }),
  'calls.extensions': (t) => ({ title: t('Ichki raqamlar qaysi xodimga tegishli?'), help: t("OnlinePBX raqamini Bitrix24 xodimiga bog'lang — operatorlar natijasi shundan") }),
  'meta.attribution': (t) => ({ title: t('Lidlar reklama kampaniyasiga qanday bog\'lanadi?'), help: t("Eng ko'p lid mos kelgan usulni tanladik") }),
  'lead.reportStage': (t) => ({
    title: t('Lid hisobot bosqichi qaysi maydondan olinsin?'),
    help: t("Bo'sh qolgan lidda Bitrix bosqichi ko'rsatiladi; sotildi / bekor Bitrix bosqichidan hisoblanadi"),
  }),
  'deal.reportStage': (t) => ({
    title: t('Sdelka hisobot bosqichi qaysi maydondan olinsin?'),
    help: t("Bo'sh qolgan sdelkada Bitrix bosqichi ko'rsatiladi; sotildi / bekor Bitrix bosqichidan hisoblanadi"),
  }),
  'lead.scope': (t) => ({ title: t('Dashbord hamma lidlarni ko\'rsatsinmi?'), help: t('Faqat bitta yo\'nalish yoki brend kerak bo\'lsa, uni tanlang') }),
}
export const questionText = (t: TFn, id: QuestionId, params?: Params): QuestionText => QUESTION[id](t, v(params))

/** role codes used as option values (types.ts, Answer) */
export type RoleCode =
  | 'new' | 'contact' | 'qualified' | 'booked' | 'visited' | 'won' | 'lost' | 'junk' | 'archive'
  | 'open' | 'kelishuv'
  | 'won_amount' | 'uf_paid' | 'none'
  | 'utm_campaign' | 'utm_source' | 'form'
  | 'all'
  | 'crm_stage'

const ROLE: Record<RoleCode, (t: TFn) => string> = {
  new: (t) => t('Yangi'),
  contact: (t) => t("Bog'lanildi"),
  qualified: (t) => t('Sifatli lid'),
  booked: (t) => t('Tashrif belgilandi'),
  visited: (t) => t('Tashrif buyurdi'),
  won: (t) => t('Sotildi'),
  lost: (t) => t("Bekor bo'ldi"),
  junk: (t) => t('Sifatsiz lid'),
  archive: (t) => t('Arxiv'),
  open: (t) => t('Ochiq'),
  kelishuv: (t) => t("Kelishuv bo'ldi"),
  won_amount: (t) => t('Yutilgan sdelka summasi'),
  uf_paid: (t) => t("«To'langan summa» maydoni"),
  none: (t) => t("Yo'q"),
  utm_campaign: (t) => t('UTM kampaniya nomi'),
  utm_source: (t) => t('UTM manba'),
  form: (t) => t('Lid forma'),
  all: (t) => t('Hammasi'),
  crm_stage: (t) => t('Bitrix bosqichi (STATUS_ID)'),
}
export function isRoleCode(code: string): code is RoleCode {
  return code in ROLE
}
/** what a stage group does on the dashboard, one plain line (shown under the role list and on "Qo'llash") */
const ROLE_MEANING: Partial<Record<RoleCode, (t: TFn) => string>> = {
  new: (t) => t("Lid hozirgina keldi, hali hech kim ishlamagan. Jami lidlarda sanaladi."),
  contact: (t) => t("Mijozga yetishga harakat qildik, lekin u hali gaplashmadi. Jami lidlarda bor, sifatli lidga kirmaydi, hali ochiq."),
  qualified: (t) => t("Menejer gaplashdi, haqiqiy mijoz. Asosiy «Sifatli lid» raqami shundan."),
  booked: (t) => t("Mijoz kelishga rozi bo'ldi. Sifatli lid va «Tashrif belgilandi» kartasida sanaladi."),
  visited: (t) => t("Mijoz keldi. «Tashrif» kartasida sanaladi."),
  won: (t) => t("Sotuv bo'ldi. Sotuv va konversiyada sanaladi."),
  lost: (t) => t("Mijoz rad etdi yoki bekor bo'ldi. «Nega yo'qotyapmiz?» diagrammasida sanaladi."),
  junk: (t) => t("Haqiqiy lid emas (spam, xato raqam). Menejerlar natijasidan yashiriladi."),
  archive: (t) => t("Chetga olib qo'yilgan — bekor bo'lgan lid kabi sanaladi."),
  open: (t) => t("Sdelka hali jarayonda."),
  kelishuv: (t) => t("Mijoz bilan kelishildi, to'lov kutilmoqda."),
}
/**
 * The override list of a stage map whose groups come from Bitrix (params.semantics = 1): every option says which group it
 * counts in — Jarayonda, Muvaffaqiyatli, Bekor bo'ldi or Sifatsiz — with the in-process shade after a dot.
 */
const GROUP_ROLE: Partial<Record<RoleCode, (t: TFn) => string>> = {
  new: (t) => t('Jarayonda · yangi lid'),
  contact: (t) => t('Jarayonda'),
  booked: (t) => t('Jarayonda · tashrif belgilandi'),
  open: (t) => t('Jarayonda'),
  kelishuv: (t) => t('Jarayonda · kelishuv'),
  won: (t) => t('Muvaffaqiyatli'),
  lost: (t) => t("Bekor bo'ldi"),
  junk: (t) => t('Sifatsiz'),
  archive: (t) => t("Bekor bo'ldi · arxiv"),
}
const GROUP_MEANING: Partial<Record<RoleCode, (t: TFn) => string>> = {
  new: (t) => t("Hali yakunlanmagan lid, voronkaning boshi. «Jarayonda» kartasida sanaladi."),
  contact: (t) => t("Hali yakunlanmagan lid. «Jarayonda» kartasida sanaladi."),
  booked: (t) => t("Hali yakunlanmagan, mijoz kelishga rozi bo'lgan lid. «Jarayonda» va «Tashrif belgilandi» kartalarida sanaladi."),
  open: (t) => t('Sdelka hali jarayonda.'),
  kelishuv: (t) => t("Sdelka jarayonda, mijoz bilan kelishildi."),
  won: (t) => t("Muvaffaqiyatli yakunlangan. Sotuv va yakuniy konversiyada sanaladi."),
  lost: (t) => t("Mijoz rad etdi yoki bekor bo'ldi. «Bekor bo'ldi» kartasida sanaladi."),
  junk: (t) => t("Haqiqiy lid emas (spam, xato raqam). «Sifatsiz» kartasida sanaladi."),
  archive: (t) => t("Chetga olib qo'yilgan — «Bekor bo'ldi»da sanaladi."),
}
/** true when a stage map's groups come from the CRM's own stage types (Bitrix SEMANTICS) */
export const isBitrixGroups = (q: { id: string; params?: Record<string, string | number> }): boolean =>
  (q.id === 'lead.stageMap' || q.id === 'deal.stageMap') && Number(q.params?.semantics) === 1
/** an option of a Bitrix-typed stage map: the group it counts in (older fine roles keep their own label) */
export const groupRoleLabel = (t: TFn, code: string): string => (isRoleCode(code) && GROUP_ROLE[code] ? GROUP_ROLE[code](t) : roleLabel(t, code))
/** what a group does on the dashboard (Bitrix-typed stage maps) */
export const groupRoleMeaning = (t: TFn, code: string): string | null => (isRoleCode(code) ? (GROUP_MEANING[code]?.(t) ?? ROLE_MEANING[code]?.(t) ?? null) : null)

/** the dashboard meaning of a stage group, or null for codes that are not stage groups */
export const roleMeaning = (t: TFn, code: string): string | null => (isRoleCode(code) ? (ROLE_MEANING[code]?.(t) ?? null) : null)
/** an option label: role codes get our text, portal labels are shown as is */
export const roleLabel = (t: TFn, code: string): string => (isRoleCode(code) ? ROLE[code](t) : code)

// ───────────────────────────── impact metrics ─────────────────────────────

const IMPACT: Record<ImpactMetric, (t: TFn) => string> = {
  qualified_leads: (t) => t('Sifatli lidlar'),
  booked_leads: (t) => t('Tashrif belgilangan lidlar'),
  visited_leads: (t) => t('Tashrif buyurgan lidlar'),
  won_deals: (t) => t('Sotilgan sdelkalar'),
  paid_amount: (t) => t("To'langan summa"),
  sales_staff: (t) => t('Sotuv menejerlari'),
  phone_leads: (t) => t("Qo'ng'iroqdan kelgan lidlar"),
  paid_leads: (t) => t('Reklamadan kelgan lidlar'),
  matched_calls: (t) => t("Xodimga bog'langan qo'ng'iroqlar"),
  attributed_leads: (t) => t("Kampaniyaga bog'langan lidlar"),
  scoped_leads: (t) => t('Dashborddagi lidlar'),
  kelishuv_deals: (t) => t('Kelishilgan sdelkalar'),
}
export const impactLabel = (t: TFn, m: ImpactMetric) => IMPACT[m](t)

/**
 * The impact line with its period (owner: "the result line must say what it counts"): "oxirgi 30 kunda yaratilgan 8 861
 * liddan 3 992 (45%)". `value` / `total` come formatted; `pct` is a whole percent or null.
 */
const IMPACT_OF: Partial<Record<ImpactMetric, (t: TFn, p: { days: number; total: string; value: string }) => string>> = {
  qualified_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  booked_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  visited_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  phone_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  paid_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  attributed_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  scoped_leads: (t, p) => t('oxirgi {days} kunda yaratilgan {total} liddan {value}', p),
  won_deals: (t, p) => t('oxirgi {days} kunda yopilgan {total} sdelkadan {value} tasi sotildi', p),
  kelishuv_deals: (t, p) => t('oxirgi {days} kunda yaratilgan {total} sdelkadan {value}', p),
  matched_calls: (t, p) => t("oxirgi {days} kundagi {total} qo'ng'iroqdan {value}", p),
}
export function impactPeriod(t: TFn, m: ImpactMetric, value: string, total: number | undefined, days: number | undefined, fmt: (n: number) => string): string | null {
  if (days == null) return null
  if (total == null || !IMPACT_OF[m]) return t('oxirgi {days} kunda', { days })
  return IMPACT_OF[m]!(t, { days, total: fmt(total), value })
}

// ───────────────────────────── jobs ─────────────────────────────

const JOB_KIND: Record<JobKind, (t: TFn) => string> = {
  pull: (t) => t("Ma'lumot yuklanmoqda"),
  import: (t) => t('Fayl import qilinmoqda'),
  analysis: (t) => t('Tahlil'),
  build: (t) => t('Dashbord qurilmoqda'),
  refresh: (t) => t('Yangilanmoqda'),
}
export const jobKindLabel = (t: TFn, k: JobKind) => JOB_KIND[k](t)

/** every phase id of every job kind (types.ts, JobPhase) */
export type JobPhaseId =
  | 'users' | 'stages' | 'fields' | 'leads' | 'deals' | 'history' | 'calls' | 'ads' | 'extensions' | 'conversations' | 'chats' | 'products' | 'orders' | 'verify'
  | 'parse' | 'match'
  | 'wait-load' | 'sources' | 'managers' | 'quality' | 'questions'
  | 'mapping' | 'tables' | 'pages' | 'snapshot' | 'url'

const PHASE: Record<JobPhaseId, (t: TFn, kind: JobKind) => string> = {
  users: (t) => t('Xodimlar'),
  stages: (t, k) => (k === 'analysis' ? t("Bosqichlarni o'rganish") : t('Bosqichlar')),
  fields: (t, k) => (k === 'analysis' ? t("Qo'shimcha maydonlarni tekshirish") : t("Qo'shimcha maydonlar")),
  leads: (t) => t('Lidlar'),
  deals: (t) => t('Sdelkalar'),
  history: (t, k) => (k === 'analysis' ? t('Bosqichlar tarixini tahlil qilish') : t('Bosqichlar tarixi')),
  calls: (t, k) => (k === 'analysis' ? t("Qo'ng'iroqlarni lidlarga bog'lash") : t("Qo'ng'iroqlar")),
  ads: (t, k) => (k === 'analysis' ? t('Reklamani lidlarga bog\'lash') : t('Reklama')),
  extensions: (t) => t('Ichki raqamlar'),
  conversations: (t) => t('Chatlar'), // Telegram bot, Wazzup
  chats: (t) => t('Instagram va WhatsApp chatlari'),
  products: (t) => t('Mahsulotlar'), // Billz
  orders: (t) => t('Buyurtmalar (cheklar)'),
  verify: (t) => t('Tekshiruv'),
  parse: (t) => t("Faylni o'qish"),
  match: (t) => t('Ustunlarni moslash'),
  'wait-load': (t) => t('Yuklash tugashini kutish'),
  sources: (t) => t("Manbalarni o'rganish"),
  managers: (t) => t('Menejerlarni aniqlash'),
  quality: (t) => t("Ma'lumot sifatini tekshirish"),
  questions: (t) => t('Savollarni tayyorlash'),
  mapping: (t) => t('Javoblarni qo\'llash'),
  tables: (t) => t('Jadvallarni yig\'ish'),
  pages: (t) => t('Sahifalarni tayyorlash'),
  snapshot: (t) => t("Ma'lumotni joylash"),
  url: (t) => t('Havola yaratish'),
}
export function isPhaseId(id: string): id is JobPhaseId {
  return id in PHASE
}
export const phaseLabel = (t: TFn, kind: JobKind, id: string): string => (isPhaseId(id) ? PHASE[id](t, kind) : id)

const PHASE_STEP: Record<JobPhaseStep, (t: TFn, phase: string) => string> = {
  staged: (t) => t("Oldin olinganlar qo'shilyapti"),
  changed: (t) => t("O'zgarganlar tekshirilyapti"),
  new: (t, phase) => (phase === 'deals' ? t('Yangi sdelkalar') : t('Yangi lidlar')),
  gaps: (t) => t('Yetishmayotganlar'),
  phones: (t) => t('Telefon raqamlari'),
}
/** "O'zgarganlar tekshirilyapti" — the pass a running phase is in (unknown steps show nothing) */
export const phaseStepLabel = (t: TFn, phase: string, step: string | undefined): string | undefined =>
  step && step in PHASE_STEP ? PHASE_STEP[step as JobPhaseStep](t, phase) : undefined

// ───────────────────────────── preview columns ─────────────────────────────

const KIND: Record<ColumnKind, (t: TFn) => string> = {
  id: (t) => t('ID'),
  text: (t) => t('Matn'),
  number: (t) => t('Son'),
  money: (t) => t('Summa'),
  date: (t) => t('Sana'),
  datetime: (t) => t('Sana va vaqt'),
  phone: (t) => t('Telefon'),
  person: (t) => t('Xodim'),
  stage: (t) => t('Bosqich'),
  source: (t) => t('Manba'),
  bool: (t) => t('Ha / yo\'q'),
  duration: (t) => t('Davomiylik'),
}
export const columnKindLabel = (t: TFn, k: ColumnKind) => KIND[k](t)

/** system column keys the server sends without a title (custom fields come with the portal's own title) */
export type SystemColumnKey =
  | 'id' | 'title' | 'name' | 'stage' | 'status' | 'source' | 'manager' | 'createdAt' | 'modifiedAt' | 'closedAt' | 'amount'
  | 'currency' | 'phone' | 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'pipeline' | 'leadId' | 'direction'
  | 'answered' | 'duration' | 'wait' | 'operator' | 'extension' | 'department' | 'position' | 'active' | 'sort' | 'semantics'
  | 'campaign' | 'objective' | 'platform' | 'spend' | 'impressions' | 'clicks' | 'leads' | 'day' | 'type' | 'at'
  // chats (conversations)
  | 'channel' | 'startedAt' | 'lastAt' | 'firstReply' | 'messagesIn' | 'messagesOut' | 'unanswered' | 'isLead'
  // POS (orders, products, stock)
  | 'shop' | 'seller' | 'total' | 'discount' | 'cost' | 'method' | 'items' | 'customerPhone' | 'product' | 'category' | 'price'
  | 'qty' | 'stock' | 'sku' | 'barcode' | 'profit'

const COLUMN: Record<SystemColumnKey, (t: TFn) => string> = {
  id: (t) => t('ID'),
  title: (t) => t('Nomi'),
  name: (t) => t('Ism'),
  stage: (t) => t('Bosqich'),
  status: (t) => t('Holat'),
  source: (t) => t('Manba'),
  manager: (t) => t("Mas'ul"),
  createdAt: (t) => t('Yaratilgan'),
  modifiedAt: (t) => t("O'zgartirilgan"),
  closedAt: (t) => t('Yopilgan'),
  amount: (t) => t('Summa'),
  currency: (t) => t('Valyuta'),
  phone: (t) => t('Telefon'),
  utmSource: (t) => t('UTM manba'),
  utmMedium: (t) => t('UTM kanal'),
  utmCampaign: (t) => t('UTM kampaniya'),
  utmContent: (t) => t('UTM kontent'),
  pipeline: (t) => t('Voronka'),
  leadId: (t) => t('Lid ID'),
  direction: (t) => t("Yo'nalish"),
  answered: (t) => t('Javob berildi'),
  duration: (t) => t('Davomiylik'),
  wait: (t) => t('Kutish'),
  operator: (t) => t('Operator'),
  extension: (t) => t('Ichki raqam'),
  department: (t) => t("Bo'lim"),
  position: (t) => t('Lavozim'),
  active: (t) => t('Faol'),
  sort: (t) => t('Tartib'),
  semantics: (t) => t('Turi'),
  campaign: (t) => t('Kampaniya'),
  objective: (t) => t('Maqsad'),
  platform: (t) => t('Platforma'),
  spend: (t) => t('Sarf'),
  impressions: (t) => t("Ko'rishlar"),
  clicks: (t) => t('Bosishlar'),
  leads: (t) => t('Lidlar'),
  day: (t) => t('Kun'),
  type: (t) => t('Turi'),
  at: (t) => t('Vaqt'),
  channel: (t) => t('Kanal'),
  startedAt: (t) => t('Boshlangan'),
  lastAt: (t) => t('Oxirgi xabar'),
  firstReply: (t) => t('Birinchi javob'),
  messagesIn: (t) => t('Kiruvchi xabarlar'),
  messagesOut: (t) => t('Chiquvchi xabarlar'),
  unanswered: (t) => t('Javobsiz'),
  isLead: (t) => t('Lid bo\'ldi'),
  shop: (t) => t("Do'kon"),
  seller: (t) => t('Sotuvchi'),
  total: (t) => t('Summa'),
  discount: (t) => t('Chegirma'),
  cost: (t) => t('Tannarx'),
  method: (t) => t("To'lov usuli"),
  items: (t) => t('Mahsulotlar soni'),
  customerPhone: (t) => t('Mijoz telefoni'),
  product: (t) => t('Mahsulot'),
  category: (t) => t('Kategoriya'),
  price: (t) => t('Narx'),
  qty: (t) => t('Miqdor'),
  stock: (t) => t('Qoldiq'),
  sku: (t) => t('Artikul'),
  barcode: (t) => t('Shtrix-kod'),
  profit: (t) => t('Foyda'),
}
export function isSystemColumn(key: string): key is SystemColumnKey {
  return key in COLUMN
}
/** header of a preview column: the portal's title for custom fields, our text for system keys, else the key */
export function columnLabel(t: TFn, col: { key: string; title?: string }): string {
  if (col.title) return col.title
  return isSystemColumn(col.key) ? COLUMN[col.key](t) : col.key
}
