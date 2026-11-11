import {
  Blocks,
  Bot,
  Calculator,
  ChartColumn,
  ContactRound,
  CreditCard,
  Database,
  FileSpreadsheet,
  Headset,
  Camera,
  Infinity as InfinityIcon,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Phone,
  PhoneCall,
  Plus,
  Send,
  Server,
  Sheet,
  Smartphone,
  Wallet,
  Package,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import type { ConnectableSourceId, DatabaseSourceId, PageId, SourceId, TabularSourceId } from './types'
import type { TFn } from './labels'

/**
 * The source catalog registry (ux.md §1.9, SPEC §1 "Catalog"): every tile of step 2 with its category, mark, colour and
 * badge. Tayyor = Bitrix24, AmoCRM, Meta Ads, OnlinePBX, Moi Zvonki, the chat channels (Telegram bot, Wazzup, Instagram,
 * WhatsApp), Billz and the table sources (Excel / CSV, Google Sheets, PostgreSQL, MySQL, ClickHouse, SQL Server); Bitrix24 telefoniya = info tile; everything else Tez kunda (never
 * navigates). Colours are data here, never page CSS. Marks are neutral lucide icons or text monograms — never real logos.
 *
 *   SOURCES.filter((s) => s.category === 'crm')
 *   const s = getSource('meta'); <ConnectorGlyph source={s.id} />
 */
export type SourceCategory = 'crm' | 'ads' | 'tel' | 'chat' | 'pos' | 'files' | 'db' | 'pay' | 'other'
export type SourceBadge = 'ready' | 'info' | 'soon' | 'request'

export type SourceMark = { kind: 'icon'; icon: LucideIcon } | { kind: 'text'; text: string }

export interface SourceDef {
  id: SourceId
  /** product names are not translated */
  name: string
  category: SourceCategory
  mark: SourceMark
  /** squircle fill, hex */
  color: string
  /** mark colour on light fills (default white) */
  ink?: string
  badge: SourceBadge
  /** shown first with "Tavsiya etiladi" */
  recommended?: boolean
  /** pages this source unlocks or completes */
  pages: PageId[]
  /** one line on the tile */
  about: (t: TFn) => string
}

/** a mapped table can feed every standard page except Chatlar (what it feeds depends on the mapping) */
const TABLE_PAGES: PageId[] = ['lead', 'deal', 'calls', 'kampaniyalar', 'hisobot', 'reja', 'taqsimot', 'savdo']

const icon = (i: LucideIcon): SourceMark => ({ kind: 'icon', icon: i })
const text = (s: string): SourceMark => ({ kind: 'text', text: s })

export const CATEGORIES: { id: SourceCategory; label: (t: TFn) => string; icon: LucideIcon }[] = [
  { id: 'crm', label: (t) => t('CRM'), icon: ContactRound },
  { id: 'ads', label: (t) => t('Reklama'), icon: Megaphone },
  { id: 'tel', label: (t) => t('Telefoniya'), icon: Phone },
  { id: 'chat', label: (t) => t('Chatlar va messenjerlar'), icon: MessagesSquare },
  { id: 'pos', label: (t) => t('Savdo va kassa (POS)'), icon: ShoppingBag },
  { id: 'files', label: (t) => t('Fayllar va jadvallar'), icon: FileSpreadsheet },
  { id: 'db', label: (t) => t("Ma'lumotlar bazalari"), icon: Database },
  { id: 'pay', label: (t) => t("Moliya va to'lovlar"), icon: Wallet },
  { id: 'other', label: (t) => t('Boshqa'), icon: Blocks },
]

export const SOURCES: SourceDef[] = [
  { id: 'bitrix24', name: 'Bitrix24', category: 'crm', mark: text('24'), color: '#2fc6f6', badge: 'ready', recommended: true, pages: ['lead', 'deal', 'hisobot', 'reja', 'taqsimot'], about: (t) => t('Lidlar, sdelkalar, bosqichlar va xodimlar') },
  { id: 'amocrm', name: 'AmoCRM / Kommo', category: 'crm', mark: text('amo'), color: '#339dc7', badge: 'ready', pages: ['lead', 'deal', 'hisobot', 'reja', 'taqsimot'], about: (t) => t('Lidlar, sdelkalar, bosqichlar va xodimlar') },
  { id: 'meta', name: 'Meta Ads (Facebook va Instagram)', category: 'ads', mark: icon(InfinityIcon), color: '#0866ff', badge: 'ready', pages: ['kampaniyalar', 'hisobot'], about: (t) => t('Reklama sarfi, kampaniyalar va lid formalar') },
  { id: 'google_ads', name: 'Google Ads', category: 'ads', mark: icon(ChartColumn), color: '#34a853', badge: 'soon', pages: ['kampaniyalar'], about: (t) => t('Qidiruv va YouTube reklamasi') },
  { id: 'yandex_direct', name: 'Yandex Direct', category: 'ads', mark: icon(Megaphone), color: '#fc3f1d', badge: 'soon', pages: ['kampaniyalar'], about: (t) => t('Yandex reklamasi') },
  { id: 'tiktok_ads', name: 'TikTok Ads', category: 'ads', mark: text('Tk'), color: '#111111', badge: 'soon', pages: ['kampaniyalar'], about: (t) => t('TikTok reklamasi') },
  { id: 'telegram_ads', name: 'Telegram Ads', category: 'ads', mark: icon(Send), color: '#2aabee', badge: 'soon', pages: ['kampaniyalar'], about: (t) => t('Telegram kanallaridagi reklama') },
  { id: 'onlinepbx', name: 'OnlinePBX', category: 'tel', mark: icon(PhoneCall), color: '#1aa260', badge: 'ready', pages: ['calls', 'taqsimot'], about: (t) => t("Qo'ng'iroqlar, operatorlar va kutish vaqti") },
  { id: 'bitrix_tel', name: 'Bitrix24 telefoniya', category: 'tel', mark: icon(Headset), color: '#2fc6f6', badge: 'info', pages: ['calls'], about: (t) => t('Bitrix24 bilan birga ulanadi') },
  { id: 'zadarma', name: 'Zadarma', category: 'tel', mark: text('Z'), color: '#e5332a', badge: 'soon', pages: ['calls'], about: (t) => t('IP-telefoniya') },
  { id: 'uis', name: 'UIS', category: 'tel', mark: text('UIS'), color: '#5b4bdb', badge: 'soon', pages: ['calls'], about: (t) => t('Qo\'ng\'iroqlar tahlili') },
  { id: 'sipuni', name: 'Sipuni', category: 'tel', mark: text('S'), color: '#ff7a00', badge: 'soon', pages: ['calls'], about: (t) => t('IP-telefoniya') },
  { id: 'moizvonki', name: 'Moi Zvonki', category: 'tel', mark: icon(Smartphone), color: '#7b61ff', badge: 'ready', pages: ['calls', 'taqsimot'], about: (t) => t("Mobil qo'ng'iroqlar") },
  { id: 'telegram_bot', name: 'Telegram bot', category: 'chat', mark: icon(Bot), color: '#2aabee', badge: 'ready', pages: ['chatlar'], about: (t) => t('Bot orqali kelgan murojaatlar va lidlar') },
  { id: 'wazzup', name: 'Wazzup', category: 'chat', mark: icon(MessageCircle), color: '#20c05c', badge: 'ready', pages: ['chatlar'], about: (t) => t('WhatsApp va Telegram chatlari') },
  { id: 'instagram', name: 'Instagram Direct', category: 'chat', mark: icon(Camera), color: '#d6297a', badge: 'ready', pages: ['chatlar'], about: (t) => t('Direct xabarlari va javob tezligi') },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'chat', mark: text('WA'), color: '#1fa855', badge: 'ready', pages: ['chatlar'], about: (t) => t('Rasmiy WhatsApp raqamidagi suhbatlar') },
  { id: 'billz', name: 'Billz', category: 'pos', mark: text('B'), color: '#6c3cf0', badge: 'ready', pages: ['savdo'], about: (t) => t("Savdo, mahsulotlar, qoldiq va sotuvchilar") },
  { id: 'excel', name: 'Excel / CSV', category: 'files', mark: icon(FileSpreadsheet), color: '#21a366', badge: 'ready', pages: TABLE_PAGES, about: (t) => t('Istalgan jadval fayli') },
  { id: 'sheets', name: 'Google Sheets', category: 'files', mark: icon(Sheet), color: '#0f9d58', badge: 'ready', pages: TABLE_PAGES, about: (t) => t('Onlayn jadvallar') },
  { id: 'postgres', name: 'PostgreSQL', category: 'db', mark: icon(Database), color: '#336791', badge: 'ready', pages: TABLE_PAGES, about: (t) => t("O'z bazangiz") },
  { id: 'mysql', name: 'MySQL', category: 'db', mark: icon(Database), color: '#00758f', badge: 'ready', pages: TABLE_PAGES, about: (t) => t("O'z bazangiz") },
  { id: 'clickhouse', name: 'ClickHouse', category: 'db', mark: icon(Server), color: '#e8b414', ink: '#1c1c1e', badge: 'ready', pages: TABLE_PAGES, about: (t) => t('Analitik baza') },
  { id: 'mssql', name: 'SQL Server', category: 'db', mark: icon(Database), color: '#a91d22', badge: 'ready', pages: TABLE_PAGES, about: (t) => t("O'z bazangiz") },
  { id: 'onec', name: '1C', category: 'pay', mark: icon(Calculator), color: '#f2b705', ink: '#1c1c1e', badge: 'soon', pages: [], about: (t) => t('Buxgalteriya va ombor') },
  { id: 'moysklad', name: 'MoySklad', category: 'pay', mark: icon(Package), color: '#1f8ceb', badge: 'soon', pages: [], about: (t) => t('Savdo va ombor') },
  { id: 'payme', name: 'Payme', category: 'pay', mark: icon(Wallet), color: '#33cccc', badge: 'soon', pages: ['deal'], about: (t) => t("Onlayn to'lovlar") },
  { id: 'click', name: 'Click', category: 'pay', mark: icon(CreditCard), color: '#0078ff', badge: 'soon', pages: ['deal'], about: (t) => t("Onlayn to'lovlar") },
  { id: 'request', name: "Manba so'rash", category: 'other', mark: icon(Plus), color: '#8e8e93', badge: 'request', pages: [], about: (t) => t("Kerakli manba yo'qmi? Bizga yozing") },
]

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]))

export function getSource(id: SourceId): SourceDef {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`unknown source ${id}`)
  return s
}

export const CONNECTABLE: readonly ConnectableSourceId[] = [
  'bitrix24',
  'amocrm',
  'meta',
  'onlinepbx',
  'moizvonki',
  'telegram_bot',
  'wazzup',
  'instagram',
  'whatsapp',
  'billz',
  'excel',
  'sheets',
  'postgres',
  'mysql',
  'clickhouse',
  'mssql',
]

/** chat channels (Chatlar page): metadata of conversations, never message text */
export const CHAT_SOURCES: readonly ConnectableSourceId[] = ['telegram_bot', 'wazzup', 'instagram', 'whatsapp']
/** the newer sources answer with the generic src.* checks */
export const GENERIC_SOURCES: readonly ConnectableSourceId[] = ['amocrm', ...CHAT_SOURCES, 'billz']

/** telephony sources with their own connector (pbx.* checks, details.domain / extensions / callsLast24h) */
export const PBX_SOURCES: readonly ConnectableSourceId[] = ['onlinepbx', 'moizvonki']

/** read-only databases (one form: URL or host / port / database / user / password / SSL) */
export const DATABASE_SOURCES: readonly DatabaseSourceId[] = ['postgres', 'mysql', 'clickhouse', 'mssql']
/** table sources: they feed pages only through the mappings the client makes ("Jadvallarni moslash") */
export const TABULAR_SOURCES: readonly TabularSourceId[] = ['excel', 'sheets', ...DATABASE_SOURCES]

export function isTabular(id: string): id is TabularSourceId {
  return (TABULAR_SOURCES as readonly string[]).includes(id)
}

export function isDatabase(id: string): id is DatabaseSourceId {
  return (DATABASE_SOURCES as readonly string[]).includes(id)
}

export function isConnectable(id: string): id is ConnectableSourceId {
  return (CONNECTABLE as readonly string[]).includes(id)
}

export function isSourceId(id: string): id is SourceId {
  return BY_ID.has(id as SourceId)
}

/** badge text of a tile */
export function badgeLabel(t: TFn, b: SourceBadge): string {
  switch (b) {
    case 'ready':
      return t('Tayyor')
    case 'info':
      return t('Bitrix24 ichida')
    case 'soon':
      return t('Tez kunda')
    case 'request':
      return t("So'rash")
  }
}
