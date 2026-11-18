import type { StaffRole, StageKey } from './domain'
import type { SnapConversation, SnapOrder, SnapOrderLine, SnapProduct, UfValue } from '@/features/projects/types'

/**
 * Row types of the synced tables every demo workspace has. Names are denormalised
 * (lead.manager, lead.campaign) the way Data365 sync jobs store CRM data, so queries need no joins.
 * Timestamps are epoch ms, `day` is 'YYYY-MM-DD'. Money is so'm unless the field says usd.
 */

export interface Staff {
  id: string
  name: string
  female: boolean
  role: StaffRole | string
  /** base monthly salary, so'm */
  base: number
  hue: number
  branch: string
  hired: string
  /** handles leads/deals (appears in Taqsimot, Reja, KPI) */
  sales: boolean
  /** handles phone calls */
  phone: boolean
  /** 0.8..1.2 — how good this person is (drives conversion, punctuality, speed) */
  skill: number
  /** Taqsimot: weekly days off (0 = Sunday … 6 = Saturday), planned leave, distribution share % (sales staff) */
  weekly_off: number[]
  vacation: { from: string; to: string } | null
  share: number
  /** live: dismissed in the portal ("ishdan ketgan") */
  fired?: boolean
}

export interface Campaign {
  id: string
  name: string
  /** Meta platform; equals the lead source name in meta.paidSources */
  platform: 'Instagram' | 'Facebook'
  product: string
  objective: 'Lid forma' | 'Xabarlar' | 'Trafik'
  status: 'Faol' | "To'xtatilgan"
  start: string
}

export interface AdDay {
  day: string
  campaign_id: string
  campaign: string
  adset: string
  creative: string
  spend_usd: number
  /** the spend in so'm at its own day's rate (a live project: the Central Bank's, or the owner's own rate) */
  spend_uzs: number
  impressions: number
  clicks: number
  leads: number
  /** Meta's ad id (CRM leads carry it in utm_content); absent in the demo and older snapshots */
  ad_id?: string
  /** a non-USD ad account: its currency and Meta's own amount; unconverted = no rate known, spend_usd is 0 */
  currency?: string
  spend?: number
  unconverted?: boolean
  /** the creative's picture and its post (Instagram / Facebook) — only on each ad's latest row */
  thumb?: string
  link?: string
}

export interface Lead {
  id: number
  ts: number
  day: string
  name: string
  phone: string
  /** CRM source name (the demo uses SOURCES; a project sends its portal's names) */
  source: string
  campaign_id: string | null
  campaign: string | null
  manager_id: string
  manager: string
  product: string
  branch: string
  stage: StageKey
  /** the real CRM stage (a live project; the owner's own name when he gave one): the stage table / filter / column show it */
  stage_name?: string
  /** a live project's qualified lead: the first chosen "Sifatli lid" stage it reached ('@deal' / '@booked' otherwise) and when */
  qualified_by?: string
  qualified_ts?: number
  /** furthest funnel flags (sticky even if later lost) */
  contacted: boolean
  qualified: boolean
  booked: boolean
  visited: boolean
  won: boolean
  /** junk / lost reason */
  reason: string | null
  /** seconds from lead creation to first manager action (Infinity in a live project when not known yet) */
  first_response_sec: number
  /** last stage change */
  stage_ts: number
  /** set when the lead reached a final stage (won / lost / junk): a live project's closing date (DATE_CLOSED / stage history) */
  closed_ts: number | null
  /** live: an archive stage ("Sandiq"): stage 'lost', but not counted as "Bekor bo'ldi" on the Lead page */
  archived?: boolean
  utm_source: string
  utm_medium: string
  utm_campaign: string | null
  utm_content: string | null
  /** direct Meta attribution (live projects); the demo joins the ad row by campaign + day instead */
  adset?: string
  creative?: string
  form_name?: string
  platform?: string
  /** the portal's custom (UF_) field values (live projects; meta.fields names them) */
  uf?: Record<string, UfValue>
}

export interface Deal {
  id: number
  lead_id: number
  ts: number
  day: string
  manager_id: string
  manager: string
  product: string
  source: string
  branch: string
  status: 'won' | 'lost' | 'open'
  closed_ts: number | null
  closed_day: string | null
  /** contract amount (Shartnoma summasi) */
  amount: number
  /** current pipeline stage label */
  stage: string
  /** cancel reason for lost deals */
  reason: string | null
  /** the portal's custom (UF_) field values (live projects; meta.fields names them) */
  uf?: Record<string, UfValue>
  /** live: reached "Kelishuv" per the stage history (absent = judge by the current stage) */
  kelishuv?: boolean
}

export interface Call {
  /** Bitrix telephony ids are strings, generated / OnlinePBX ids numbers */
  id: number | string
  ts: number
  day: string
  hour: number
  direction: 'in' | 'out'
  operator_id: string
  operator: string
  /** 'short': connected, but 10 seconds of talk or less — neither a conversation nor a missed call (SnapshotBuilder.CallStatus) */
  status: 'answered' | 'short' | 'missed'
  duration_sec: number
  wait_sec: number
  /** for missed inbound calls: when we called back (null = never) */
  callback_ts: number | null
  /** live: who made that call back (the operator of the callback call; absent in the demo) */
  callback_by?: string
  callback_by_id?: string
  /** missed inbound call not returned within 24h */
  ne_perezvonili: boolean
  lead_id: number | null
  phone: string
  /** has a recording (Tinglash) */
  recorded: boolean
  /** recording link of a real call (live projects) */
  record_url?: string
  /** why it did not connect (Bitrix CALL_FAILED_CODE: "304" no answer, "486" busy, "603" declined …) */
  fail_code?: string
  /** live: the system the call comes from (bitrix / onlinepbx / moizvonki …; SnapCall.provider) */
  provider?: string
}

export interface Attendance {
  staff_id: string
  staff: string
  day: string
  /** minutes after midnight, null when absent */
  check_in: number | null
  status: 'ontime' | 'late' | 'very_late' | 'absent'
}

export interface Payment {
  id: number
  deal_id: number
  ts: number
  day: string
  amount: number
  method: 'Naqd' | 'Karta' | 'Bank' | 'Click' | 'Payme' | string
  kind: 'first' | 'repeat'
  manager_id: string
  manager: string
  product: string
}

export interface Plan {
  month: string
  manager_id: string
  manager: string
  target_amount: number
  target_deals: number
}

/** Cash out (Kassa & Moliya). Cash in = payments. */
export interface Expense {
  id: number
  ts: number
  day: string
  amount: number
  category: 'Ish haqi' | 'Ijara' | 'Reklama' | 'Kommunal' | 'Soliq' | "Xo'jalik" | 'Transport' | 'Ofis'
  method: 'Naqd' | 'Karta' | 'Bank'
  note: string
}

/**
 * Chats and POS sales exist only in a project snapshot (Telegram bot, Wazzup, Instagram, WhatsApp; Billz). Same shape as
 * the wire rows (timestamps already epoch ms). The demo generator has none: these tables are [] there.
 */
export type Conversation = SnapConversation
export type Order = SnapOrder
export type OrderLine = SnapOrderLine
export type Product = SnapProduct

export interface ChatSalesTables {
  conversations: Conversation[]
  orders: Order[]
  orderLines: OrderLine[]
  products: Product[]
}
