import type { Call } from '@/data/types'
import { bucketRows, type DateRange } from '@/data/range'

/**
 * Call metrics of the "Qo'ng'iroqlar" page (owner, 2026-11-03: "check the call section fully — a call shown successful that
 * was not; make it as detailed and clear as the lead section"). Every call has exactly one outcome:
 *  - answered  "Muvaffaqiyatli": someone talked (status 'answered'; for Bitrix only when an employee was on it, BitrixCanon.Call)
 *  - noanswer  "Javob bermadi": our outgoing call the client did not pick up / was busy
 *  - missed    "O'tkazib yuborilgan": the client's incoming call nobody took
 *  - short     "Qisqa suhbat": connected, but 10 seconds of talk or less (status 'short', SnapshotBuilder.CallStatus) — no
 *              conversation, yet no missed call either: it is never in "Qayta qo'ng'iroq kutayotganlar" (review 2026-11-04)
 * A missed call is "Qayta qo'ng'iroq qilingan" once we called that client back (or they were reached) AFTER it, within a week
 * (callback_ts, data/source.tsx withCallbacks — time-ordered, so a call before the miss never counts); otherwise it is
 * "Qayta qo'ng'iroq qilinmagan". Times: talk = connected time only; Davomiylik = the whole call (ringing included).
 */

export const isIn = (c: Call) => c.direction === 'in'
export const isOut = (c: Call) => c.direction === 'out'
export const answered = (c: Call) => c.status === 'answered'
export const talkOf = (c: Call) => (c.status === 'answered' ? c.duration_sec : 0)
export const fullOf = (c: Call) => c.duration_sec + c.wait_sec
export const phoneKey = (p: string) => p.replace(/\D/g, '').slice(-9)

export const isShort = (c: Call) => c.status === 'short'
export type Outcome = 'answered' | 'short' | 'noanswer' | 'missed'
export const outcomeOf = (c: Call): Outcome => (answered(c) ? 'answered' : isShort(c) ? 'short' : isIn(c) ? 'missed' : 'noanswer')
export const isMissed = (c: Call) => isIn(c) && c.status === 'missed'
export const isNoAnswer = (c: Call) => isOut(c) && c.status === 'missed'
export const isRecalled = (c: Call) => isMissed(c) && c.callback_ts != null
export const isUnrecalled = (c: Call) => isMissed(c) && c.callback_ts == null

export interface Cards {
  total: number
  outbound: number
  inbound: number
  success: number
  /** our outgoing calls nobody answered */
  noanswer: number
  /** the client's incoming calls nobody took */
  missed: number
  /** connected for 10 seconds or less (both directions; shortIn of them incoming) */
  short: number
  shortIn: number
  recalled: number
  unrecalled: number
  /** seconds; talk / answered */
  avgTalk: number
  talkSum: number
  /** seconds from a missed incoming call to our first call back (the median); null when none was called back */
  reaksiya: number | null
}

export function cardsOf(calls: Call[]): Cards {
  let outbound = 0, inbound = 0, success = 0, noanswer = 0, missed = 0, short = 0, shortIn = 0, recalled = 0, talk = 0
  const backs: number[] = []
  for (const c of calls) {
    if (isIn(c)) inbound++
    else outbound++
    if (answered(c)) {
      success++
      talk += c.duration_sec
    } else if (isShort(c)) {
      short++
      if (isIn(c)) shortIn++
    } else if (isIn(c)) {
      missed++
      if (c.callback_ts != null) {
        recalled++
        backs.push((c.callback_ts - c.ts) / 1000)
      }
    } else noanswer++
  }
  return {
    total: calls.length,
    outbound,
    inbound,
    success,
    noanswer,
    missed,
    short,
    shortIn,
    recalled,
    unrecalled: missed - recalled,
    avgTalk: success ? Math.round(talk / success) : 0,
    talkSum: talk,
    // the median (half were faster): one slow call back no longer drags the whole figure
    reaksiya: backs.length ? Math.round(median(backs)!) : null,
  }
}

/** Card values per trend point over the range (sparklines): a day, week or month each by the period's length. */
export function dailyCards(calls: Call[], r: DateRange): Cards[] {
  return bucketRows(calls, r, (c) => c.day).groups.map(cardsOf)
}

export interface OpRow {
  id: string
  name: string
  rank: number
  cAll: number
  cIn: number
  cOut: number
  success: number
  /** 0..1 */
  rate: number
  noanswer: number
  missed: number
  unrecalled: number
  talk: number
  /** the calls' whole length, ringing included (Davomiylik), next to the talk alone */
  duration: number
  avgTalk: number
  /** distinct clients (last 9 digits; calls without a number are not a client) */
  clients: number
  reaksiya: number | null
  calls: Call[]
}

export function operatorRows(calls: Call[]): OpRow[] {
  const by = new Map<string, Call[]>()
  for (const c of calls) {
    const a = by.get(c.operator_id)
    if (a) a.push(c)
    else by.set(c.operator_id, [c])
  }
  // "Tezlik" is the speed of the calls back an operator MADE (callback_by_id), not of the misses that rang on them
  const backs = new Map<string, number[]>()
  for (const c of calls) {
    if (!isRecalled(c)) continue
    const who = c.callback_by_id ?? c.operator_id
    backs.set(who, [...(backs.get(who) ?? []), (c.callback_ts! - c.ts) / 1000])
  }
  const rows: OpRow[] = []
  for (const [id, xs] of by) {
    const k = cardsOf(xs)
    const clients = new Set<string>()
    for (const c of xs) if (phoneKey(c.phone)) clients.add(phoneKey(c.phone))
    rows.push({
      id,
      name: xs[0]!.operator,
      rank: 0,
      cAll: k.total,
      cIn: k.inbound,
      cOut: k.outbound,
      success: k.success,
      rate: k.total ? k.success / k.total : 0,
      noanswer: k.noanswer,
      missed: k.missed,
      unrecalled: k.unrecalled,
      talk: k.talkSum,
      duration: xs.reduce((n, c) => n + (c.duration_sec || 0), 0),
      avgTalk: k.avgTalk,
      clients: clients.size,
      reaksiya: backs.has(id) ? Math.round(median(backs.get(id)!)!) : null,
      calls: [...xs].sort((a, b) => b.ts - a.ts),
    })
  }
  rows.sort((a, b) => b.cAll - a.cAll)
  rows.forEach((r, i) => (r.rank = i + 1))
  return rows
}

/** distinct clients: one (latest) call per phone; calls without a number are left out (they are no client) */
export function uniqueByPhone(calls: Call[]): Call[] {
  const seen = new Set<string>()
  const out: Call[] = []
  for (const c of [...calls].sort((a, b) => b.ts - a.ts)) {
    const k = phoneKey(c.phone)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

/**
 * Clients waiting for a call back: their latest missed incoming call was never followed by ours (nor reached), newest
 * first, one row per client.
 */
export function waitingClients(calls: Call[]): Call[] {
  return uniqueByPhone(calls.filter(isMissed)).filter(isUnrecalled)
}

/** Why calls did not connect: Bitrix failure codes grouped into plain reasons (the PBX providers have no code: "Noma'lum"). */
export type Reason = 'noanswer' | 'busy' | 'declined' | 'unreachable' | 'wrong' | 'robot' | 'short' | 'balance' | 'other' | 'unknown'
export function reasonOf(c: Call): Reason {
  switch (c.fail_code) {
    case undefined:
    case null:
    case '':
      return 'unknown'
    case '304':
    case '408':
      return 'noanswer'
    case '486':
      return 'busy'
    case '603':
      return 'declined'
    case '480':
    case '503':
      return 'unreachable'
    case '404':
    case '484':
      return 'wrong'
    case '200':
      return 'robot' // "connected" but no employee on it: an IVR / voicemail took it
    case 'short':
      return 'short' // connected, but 10 seconds of talk or less (SnapshotBuilder.MinTalkSec)
    case '402':
      return 'balance'
    default:
      return 'other'
  }
}
export const REASON_LABEL: Record<Reason, string> = {
  noanswer: 'Javob bermadi',
  busy: 'Band',
  declined: 'Rad etdi',
  unreachable: 'Aloqadan tashqarida',
  wrong: "Noto'g'ri raqam",
  robot: 'Avtojavob / ovozli pochta',
  short: '10 soniyadan qisqa suhbat',
  balance: 'Balans yetmadi',
  other: 'Boshqa sabab',
  unknown: "Sababi noma'lum",
}
export function reasonRows(calls: Call[]): { reason: Reason; calls: Call[] }[] {
  const by = new Map<Reason, Call[]>()
  for (const c of calls) {
    if (answered(c) || isShort(c)) continue
    const r = reasonOf(c)
    const a = by.get(r)
    if (a) a.push(c)
    else by.set(r, [c])
  }
  return [...by].map(([reason, xs]) => ({ reason, calls: xs })).sort((a, b) => b.calls.length - a.calls.length)
}

/** When calls come: [weekday 0 = Monday … 6][hour] → calls / missed incoming (the "Qaysi soatda" map) */
export function hourGrid(calls: Call[]): { total: number[][]; missed: number[][] } {
  const total = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  const missed = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const c of calls) {
    const [y, m, d] = c.day.split('-').map(Number)
    const dow = (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7
    const h = Math.min(23, Math.max(0, c.hour))
    total[dow]![h]!++
    if (isMissed(c)) missed[dow]![h]!++
  }
  return { total, missed }
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** seconds → HH:MM:SS (hours may exceed 24) */
export function fmtHms(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`
}

/** "19.10" */
export function fmtDM(ts: number): string {
  const d = new Date(ts)
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`
}

/** "2026-10-19" → "19.10.26" */
export function fmtDay(day: string): string {
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y!.slice(2)}`
}

/** "19.10.26 14:05" */
export function fmtDT(ts: number): string {
  const d = new Date(ts)
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/* ---------------- Reaksiya vaqti: three speeds (owner, 2026-11-03) ---------------- */

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const a = [...xs].sort((x, y) => x - y)
  const m = a.length >> 1
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2
}

/** one measured wait: whose it was, how long (seconds), and the call it is about */
export interface Wait {
  sec: number
  who: string
  call: Call
}

export interface Speed {
  waits: Wait[]
  median: number | null
  average: number | null
  /** [label key, count] in band order */
  bands: { key: string; count: number }[]
  byOperator: { name: string; count: number; median: number | null }[]
}

export function speedOf(waits: Wait[], edges: { key: string; max: number }[]): Speed {
  const secs = waits.map((w) => w.sec)
  const bands = edges.map((e, i) => ({ key: e.key, count: secs.filter((s) => s >= (i ? edges[i - 1]!.max : 0) && s < e.max).length }))
  const byOp = new Map<string, number[]>()
  for (const w of waits) byOp.set(w.who, [...(byOp.get(w.who) ?? []), w.sec])
  return {
    waits,
    median: median(secs),
    average: secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null,
    bands,
    byOperator: [...byOp].map(([name, xs]) => ({ name, count: xs.length, median: median(xs) })).sort((a, b) => b.count - a.count),
  }
}

export const PICKUP_BANDS = [
  { key: '10 soniyagacha', max: 10 },
  { key: '10–20 soniya', max: 20 },
  { key: '20–40 soniya', max: 40 },
  { key: '40–60 soniya', max: 60 },
  { key: '1 daqiqadan ko‘p', max: Infinity },
]
export const CALLBACK_BANDS = [
  { key: '5 daqiqagacha', max: 300 },
  { key: '5–15 daqiqa', max: 900 },
  { key: '15–60 daqiqa', max: 3600 },
  { key: '1–3 soat', max: 3 * 3600 },
  { key: '3 soatdan ko‘p', max: Infinity },
]

/** 1. The client called and waited until someone picked up (answered incoming calls; the PBX tells the ringing time). */
export function pickupWaits(calls: Call[]): Wait[] {
  return calls.filter((c) => isIn(c) && answered(c) && c.wait_sec > 0).map((c) => ({ sec: c.wait_sec, who: c.operator, call: c }))
}

/** 2. A missed incoming call until our first call back to that client — the speed of whoever called back. */
export function callbackWaits(calls: Call[]): Wait[] {
  return calls.filter(isRecalled).map((c) => ({ sec: (c.callback_ts! - c.ts) / 1000, who: c.callback_by ?? c.operator, call: c }))
}

/** A lead nobody called yet, with every call found for it anyway (to its number or linked to it, either way, any time): the proof */
export interface UncalledLead<L> {
  lead: L
  calls: Call[]
}

/**
 * 3. A new lead that did not come by phone (its source is not a call source) until our first OUTGOING call to it (like the
 * server's first_response_sec: their own call back is no reaction of ours) — a call linked to the lead (lead_id) first, else
 * one to its number. Leads nobody called yet are counted apart (`notCalled`) and listed (`uncalled`) with every call that touches
 * them all the same, so a «not called» can be shown to be true or not (owner, 2026-11-09: "operators blame us… we have to prove it").
 */
export function leadFirstCalls<L extends { id: number; ts: number; phone: string; source: string; manager: string }>(
  leads: L[],
  calls: Call[],
  callSources: readonly string[],
  /** every call (either way, any time) to look the uncalled leads up in; defaults to `calls` */
  allCalls: Call[] = calls,
): { waits: Wait[]; notCalled: number; leads: number; uncalled: UncalledLead<L>[] } {
  const byPhone = new Map<string, Call[]>()
  const byLead = new Map<number, Call[]>()
  for (const c of [...calls].sort((a, b) => a.ts - b.ts)) {
    if (!isOut(c)) continue
    const k = phoneKey(c.phone)
    if (k) byPhone.set(k, [...(byPhone.get(k) ?? []), c])
    if (c.lead_id != null) byLead.set(c.lead_id, [...(byLead.get(c.lead_id) ?? []), c])
  }
  const waits: Wait[] = []
  const missing: L[] = []
  let count = 0
  for (const l of leads) {
    const k = phoneKey(l.phone)
    if ((!k && !byLead.has(l.id)) || callSources.includes(l.source)) continue
    count++
    const first = byLead.get(l.id)?.find((c) => c.ts >= l.ts) ?? (k ? byPhone.get(k)?.find((c) => c.ts >= l.ts) : undefined)
    if (first) waits.push({ sec: (first.ts - l.ts) / 1000, who: first.operator, call: first })
    else missing.push(l)
  }
  // the proof: every call either way that belongs to an uncalled lead, newest first
  const want = new Map(missing.map((l) => [l.id, l]))
  const wantPhone = new Map<string, number[]>()
  for (const l of missing) {
    const k = phoneKey(l.phone)
    if (k) wantPhone.set(k, [...(wantPhone.get(k) ?? []), l.id])
  }
  const found = new Map<number, Call[]>()
  for (const c of allCalls) {
    const ids = new Set<number>()
    if (c.lead_id != null && want.has(c.lead_id)) ids.add(c.lead_id)
    const k = phoneKey(c.phone)
    for (const id of (k && wantPhone.get(k)) || []) ids.add(id)
    for (const id of ids) found.set(id, [...(found.get(id) ?? []), c])
  }
  const uncalled = missing
    .map((lead) => ({ lead, calls: (found.get(lead.id) ?? []).sort((a, b) => b.ts - a.ts) }))
    .sort((a, b) => b.lead.ts - a.lead.ts)
  return { waits, notCalled: missing.length, leads: count, uncalled }
}
