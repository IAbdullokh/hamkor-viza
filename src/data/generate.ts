import type { Workspace } from './workspaces'
import { FIRST_F, FIRST_M, JUNK_REASONS, LAST, LOST_REASONS, SOURCES, VOCAB, surname, type KindVocab, type Source, type StageKey } from './domain'
import { count, gauss, int, pick, pickW, rng, type Rng } from './random'
import { DAY, HISTORY_DAYS, dayKey, monthKey, startOfDay } from './range'
import type { AdDay, Attendance, Call, Campaign, Deal, Expense, Lead, Payment, Plan, Staff } from './types'

/**
 * Seeded generator for one workspace: 180 days of history up to the end of today.
 * Rows stamped later than "now" exist but every range ends at now, so the demo fills in live during the day.
 * Everything is consistent: ad leads = leads with that campaign, deals come from booked leads, payments from won deals,
 * ne-perezvonili = missed inbound calls never returned within 24h.
 */
export interface GeneratedDb {
  staff: Staff[]
  campaigns: Campaign[]
  ads: AdDay[]
  leads: Lead[]
  deals: Deal[]
  calls: Call[]
  attendance: Attendance[]
  payments: Payment[]
  plans: Plan[]
  expenses: Expense[]
  /** generation anchor: start of the first day */
  start: number
  /** end of today (exclusive) */
  end: number
}

export const USD_UZS = 12_650

const UTM: Record<Source, { s: string; m: string }> = {
  Instagram: { s: 'instagram', m: 'cpc' },
  Facebook: { s: 'facebook', m: 'cpc' },
  Telegram: { s: 'telegram', m: 'social' },
  'Veb-sayt': { s: 'google', m: 'organic' },
  Tavsiya: { s: 'referral', m: 'referral' },
  "Qo'ng'iroq": { s: '(direct)', m: '(none)' },
}

/** UTM tags like Bitrix stores them (deterministic per lead, separate stream). */
function utmFor(source: Source, c: Campaign | null, wsId: string, id: number) {
  const r = rng(`${wsId}:U${id}`)
  const u = UTM[source]
  return {
    utm_source: u.s,
    utm_medium: c ? 'cpc' : u.m,
    utm_campaign: c ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : null,
    utm_content: c ? pick(r, ['video_15s', 'karusel', 'reels_natija', 'testimonial', 'banner']) : null,
  }
}

const HOUR = 3_600_000

/** Lead arrival by hour (Tashkent business day, evening peak from Instagram). */
const HOUR_W = [1, 0.5, 0.3, 0.2, 0.2, 0.4, 1, 2, 4, 6, 7, 7.5, 6.5, 6, 6.5, 6.5, 6, 6.5, 7.5, 8, 7.5, 6, 4, 2]
const HOURS = HOUR_W.map((_, i) => i)

function personName(r: Rng): { name: string; female: boolean } {
  const female = r() < 0.5
  const first = pick(r, female ? FIRST_F : FIRST_M)
  return { name: `${first} ${surname(pick(r, LAST), female)}`, female }
}

function phone(r: Rng): string {
  const op = pick(r, ['90', '91', '93', '94', '97', '99', '88', '33', '77'])
  return `+998 ${op} ${int(r, 100, 999)} ${String(int(r, 0, 99)).padStart(2, '0')} ${String(int(r, 0, 99)).padStart(2, '0')}`
}

function makeStaff(ws: Workspace, v: KindVocab, r: Rng, start: number): Staff[] {
  const out: Staff[] = []
  const used = new Set<string>()
  let n = 0
  for (const { role, count: c, base } of v.roles) {
    for (let i = 0; i < c; i++) {
      let p = personName(r)
      while (used.has(p.name)) p = personName(r)
      used.add(p.name)
      const sales = role === 'Menejer'
      const phoneRole = sales || role === 'Operator' || role === 'Administrator'
      out.push({
        id: `${ws.id}-s${++n}`,
        name: p.name,
        female: p.female,
        role,
        base: Math.round((base * (0.9 + r() * 0.25)) / 100_000) * 100_000,
        hue: (n * 47 + 200) % 360,
        branch: pick(r, v.branches),
        hired: dayKey(start - int(r, 30, 900) * DAY),
        sales,
        phone: phoneRole,
        skill: 0.82 + r() * 0.36,
        weekly_off: [],
        vacation: null,
        share: 0,
      })
    }
  }
  return out
}

export function generate(ws: Workspace, now = Date.now()): GeneratedDb {
  const v = VOCAB[ws.kind]
  const r = rng(`nazar:${ws.id}`)
  const today = startOfDay(now)
  const start = today - HISTORY_DAYS * DAY
  const end = today + DAY

  const staff = makeStaff(ws, v, r, start)
  const sales = staff.filter((s) => s.sales)
  const phones = staff.filter((s) => s.phone)
  const salesW = sales.map((s) => s.skill * (0.8 + r() * 0.4))

  // ---- campaigns -------------------------------------------------------------
  const campaigns: Campaign[] = v.campaigns.map((c, i) => ({
    id: `${ws.id}-c${i + 1}`,
    name: c.name,
    platform: i % 3 === 2 ? 'Facebook' : 'Instagram',
    product: c.product,
    objective: c.name.includes('Lid forma') ? 'Lid forma' : c.name.includes('Telegram') ? 'Trafik' : i % 2 ? 'Xabarlar' : 'Lid forma',
    // one campaign started mid-way, one was paused 12 days ago
    status: i === v.campaigns.length - 1 ? "To'xtatilgan" : 'Faol',
    start: dayKey(i === 1 ? start + 60 * DAY : start),
  }))
  const campaignEnd = (idx: number) => (idx === campaigns.length - 1 ? today - 12 * DAY : end)
  const adsets = ['Toshkent 18-34', 'Viloyatlar 22-45', 'Lookalike 1%', 'Qiziqishlar']
  const creatives = ['Video 15s', 'Karusel', 'Reels — natija', 'Sharh (testimonial)', 'Statik banner']
  const cpl = campaigns.map(() => 1.3 + r() * 2.2)

  const metaShare = (v.sourceWeights[0]! + v.sourceWeights[1]!) / v.sourceWeights.reduce((a, b) => a + b, 0)
  const organicSources: Source[] = ['Telegram', 'Veb-sayt', 'Tavsiya', "Qo'ng'iroq"]
  const organicW = v.sourceWeights.slice(2)
  const sourceQ: Record<Source, number> = { Instagram: 0.95, Facebook: 0.82, Telegram: 1, 'Veb-sayt': 1.08, Tavsiya: 1.3, "Qo'ng'iroq": 1.15 }

  const ads: AdDay[] = []
  const leads: Lead[] = []
  const deals: Deal[] = []
  const payments: Payment[] = []
  let leadId = 1000
  let dealId = 5000
  let payId = 1

  const totalAdDaily = v.campaigns.reduce((a, c) => a + c.daily, 0)

  for (let i = 0; i <= HISTORY_DAYS; i++) {
    const day0 = start + i * DAY
    const day = dayKey(day0)
    const dow = new Date(day0).getDay()
    const growth = 1 + 0.38 * (i / HISTORY_DAYS) + 0.06 * Math.sin(i / 9)
    const week = dow === 0 ? 0.55 : dow === 6 ? 0.8 : 1
    // an October push: the last 3 weeks run hotter
    const surge = i > HISTORY_DAYS - 21 ? 1.18 : 1
    const dayFactor = growth * week * surge * (1 + gauss(r) * 0.07)

    // ---- ads → meta leads ---------------------------------------------------
    const metaLeadsTarget = v.leadsPerDay * metaShare * dayFactor
    campaigns.forEach((c, ci) => {
      if (day0 < new Date(`${c.start}T00:00:00`).getTime() || day0 >= campaignEnd(ci)) return
      const share = v.campaigns[ci]!.daily / totalAdDaily
      const leadsN = count(r, metaLeadsTarget * share)
      const thisCpl = cpl[ci]! * (1 + 0.12 * Math.sin(i / 11 + ci)) * (1 + gauss(r) * 0.08)
      const spend = Math.max(1, leadsN * thisCpl + r() * 3)
      const impressions = Math.round((spend / (1.4 + r() * 1.2)) * 1000)
      const clicks = Math.round(impressions * (0.009 + r() * 0.013))
      ads.push({
        day,
        campaign_id: c.id,
        campaign: c.name,
        adset: pick(r, adsets),
        creative: pick(r, creatives),
        spend_usd: Math.round(spend * 100) / 100,
        spend_uzs: Math.round(spend * 100) / 100 * USD_UZS,
        impressions,
        clicks,
        leads: leadsN,
      })
      for (let k = 0; k < leadsN; k++) addLead(day0, c.platform, c)
    })

    // ---- organic leads ------------------------------------------------------
    const organicN = count(r, v.leadsPerDay * (1 - metaShare) * dayFactor)
    for (let k = 0; k < organicN; k++) addLead(day0, pickW(r, organicSources, organicW), null)
  }

  function addLead(day0: number, source: Source, c: Campaign | null) {
    // Each lead has its own random stream, so "now" (which decides how far a lead has progressed)
    // can never shift the numbers of other leads between reloads.
    const r = rng(`${ws.id}:L${leadId}`)
    const ts = day0 + pickW(r, HOURS, HOUR_W) * HOUR + Math.floor(r() * HOUR)
    const mi = sales.indexOf(pickW(r, sales, salesW))
    const m = sales[mi]!
    const product = c && r() < 0.8 ? c.product : pickW(r, v.products.map((p) => p.name), v.products.map((p) => p.weight))
    const p = personName(r)
    const q = sourceQ[source] * m.skill
    const f = v.funnel
    // pre-draw every roll so the stream is identical whatever "now" is
    const rolls = Array.from({ length: 6 }, () => r())
    const delays = Array.from({ length: 6 }, () => r())
    const junkReason = pick(r, JUNK_REASONS)
    const lostReason = pick(r, LOST_REASONS)
    let ri = 0
    const step = (base: number) => rolls[ri++]! < Math.min(0.97, base * q)
    const dl = (i: number) => delays[i]!
    // response time: skilled managers answer faster; nights are slow
    const hour = new Date(ts).getHours()
    const night = hour < 8 || hour >= 22
    const first_response_sec = Math.round((night ? 6 * 3600 * r() + 1800 : 40 + r() * 900) / m.skill)

    let stage = 'new' as StageKey
    let t = ts + first_response_sec * 1000
    let reason: string | null = null
    const flags = { contacted: false, qualified: false, booked: false, visited: false, won: false }
    let qualifiedTs = 0
    const advance = (key: StageKey, delayH: number) => {
      const nt = t + delayH * HOUR
      if (nt > now) return false // not happened yet → lead stays open at the current stage
      t = nt
      stage = key
      return true
    }

    const walk = () => {
      if (!advance('contact', 0)) return
      if (!step(f.contact)) return void ((stage = 'junk'), (reason = JUNK_REASONS[1]))
      flags.contacted = true
      if (!step(f.qualified)) return void ((stage = 'junk'), (reason = junkReason))
      if (!advance('qualified', 0.3 + dl(0) * 3)) return
      flags.qualified = true
      qualifiedTs = t
      if (!step(f.booked)) return void (t + 24 * HOUR < now ? ((stage = 'lost'), (reason = lostReason)) : null)
      if (!advance('booked', 1 + dl(1) * 20)) return
      flags.booked = true
      if (!step(f.visited)) return void (t + 36 * HOUR < now ? ((stage = 'lost'), (reason = lostReason)) : null)
      if (!advance('visited', 6 + dl(2) * 42)) return
      flags.visited = true
      if (!step(f.won)) return void (t + 48 * HOUR < now ? ((stage = 'lost'), (reason = lostReason)) : null)
      if (!advance('won', 1 + dl(3) * 24)) return
      flags.won = true
    }
    walk()
    if (stage === 'contact') flags.contacted = true

    const lead: Lead = {
      id: leadId++,
      ts,
      day: dayKey(ts),
      name: p.name,
      phone: phone(r),
      source,
      campaign_id: c?.id ?? null,
      campaign: c?.name ?? null,
      manager_id: m.id,
      manager: m.name,
      product,
      branch: pick(r, v.branches),
      stage,
      ...flags,
      reason,
      first_response_sec,
      stage_ts: t,
      closed_ts: stage === 'won' || stage === 'lost' || stage === 'junk' ? t : null,
      ...utmFor(source, c, ws.id, leadId),
    }
    // why it counts as «Sifatli lid», as a live snapshot says it (SnapshotBuilder.QualifiedProof; no random draw, so every
    // number stays): the stage reached and when, from the stage history — for a lead whose history was not kept (every 9th)
    // the stage it stands in now, or its booked visit; now and then its deal reached a chosen deal stage
    if (flags.qualified) {
      if (lead.id % 9 === 0 && stage === 'qualified') lead.qualified_by = v.stages.qualified
      else if (lead.id % 9 === 0 && flags.booked) lead.qualified_by = '@booked'
      else if (lead.id % 23 === 0 && flags.booked) lead.qualified_by = '@deal'
      else (lead.qualified_by = v.stages.qualified), (lead.qualified_ts = qualifiedTs)
    }
    leads.push(lead)

    if (flags.booked) {
      const prod = v.products.find((x) => x.name === product)!
      const amount = Math.round((prod.price * (0.85 + r() * 0.3)) / 10_000) * 10_000
      const status: Deal['status'] = flags.won ? 'won' : stage === 'lost' ? 'lost' : 'open'
      const deal: Deal = {
        id: dealId++,
        lead_id: lead.id,
        ts: lead.ts + Math.round((t - lead.ts) * 0.5),
        day: '',
        manager_id: m.id,
        manager: m.name,
        product,
        source,
        branch: lead.branch,
        status,
        closed_ts: status === 'open' ? null : t,
        closed_day: status === 'open' ? null : dayKey(t),
        amount,
        stage: status === 'won' ? "Sotuv bo'ldi" : status === 'lost' ? "Bekor bo'ldi" : flags.visited ? (t % 3 === 0 ? 'Ish boshlandi' : "Kelishuv bo'ldi") : 'Yangi / Uchrashuv',
        reason: status === 'lost' ? reason ?? LOST_REASONS[0] : null,
      }
      deal.day = dayKey(deal.ts)
      deals.push(deal)
      if (status === 'won') {
        const method = pickW(r, ['Karta', 'Naqd', 'Click', 'Payme', 'Bank'] as const, [30, 26, 18, 16, 10])
        payments.push({ id: payId++, deal_id: deal.id, ts: t, day: dayKey(t), amount, method, kind: 'first', manager_id: m.id, manager: m.name, product })
        if (prod.recurring) {
          // monthly renewals while the client stays (≈80% monthly retention)
          let pt = t + 30 * DAY
          while (pt < end && r() < 0.8) {
            payments.push({
              id: payId++,
              deal_id: deal.id,
              ts: pt,
              day: dayKey(pt),
              amount: prod.price,
              method: pickW(r, ['Karta', 'Naqd', 'Click', 'Payme', 'Bank'] as const, [30, 22, 20, 20, 8]),
              kind: 'repeat',
              manager_id: m.id,
              manager: m.name,
              product,
            })
            pt += 30 * DAY + int(r, -2, 3) * DAY
          }
        }
      }
    }
  }

  leads.sort((a, b) => a.ts - b.ts)
  deals.sort((a, b) => a.ts - b.ts)
  payments.sort((a, b) => a.ts - b.ts)

  // ---- calls ------------------------------------------------------------------
  const calls: Call[] = []
  let callId = 1
  const phoneW = phones.map((s) => (s.sales ? 1.2 : 1) * s.skill)
  for (const lead of leads) {
    const r = rng(`${ws.id}:C${lead.id}`)
    // inbound: about 1 per lead (people call back, ask prices)
    const inbound = count(r, 0.95)
    for (let k = 0; k < inbound; k++) {
      // people call during the day, within ~3 days of becoming a lead
      const ts = startOfDay(lead.ts) + int(r, 0, 2) * DAY + pickW(r, HOURS, HOUR_W) * HOUR + Math.floor(r() * HOUR)
      const op = pickW(r, phones, phoneW)
      const hour = new Date(ts).getHours()
      const busy = hour >= 11 && hour <= 13 ? 0.06 : 0
      const missed = r() < 0.06 + busy + (hour < 9 || hour >= 21 ? 0.3 : 0)
      let callback_ts: number | null = null
      if (missed) {
        const roll = r()
        if (roll < 0.62) callback_ts = ts + (5 + r() * 90) * 60_000
        else if (roll < 0.86) callback_ts = ts + (2 + r() * 20) * HOUR
        else if (roll < 0.9) callback_ts = ts + (25 + r() * 30) * HOUR
      }
      calls.push({
        id: callId++,
        ts,
        day: dayKey(ts),
        hour,
        direction: 'in',
        operator_id: op.id,
        operator: op.name,
        status: missed ? 'missed' : 'answered',
        duration_sec: missed ? 0 : Math.round(45 + Math.exp(4.4 + gauss(r) * 0.6)),
        wait_sec: Math.round(4 + r() * (missed ? 70 : 28) / op.skill),
        callback_ts,
        // the same rule as live data (data/source.tsx): no call back attempt at all (the Calls page's «Qayta qo'ng'iroq qilinmagan»)
        ne_perezvonili: missed && callback_ts === null,
        lead_id: lead.id,
        phone: lead.phone,
        recorded: !missed,
      })
    }
    // outbound: managers call every lead 1–3 times
    const outbound = lead.contacted ? 1 + count(r, lead.booked ? 1.6 : 0.8) : count(r, 1.4)
    for (let k = 0; k < outbound; k++) {
      const ts = lead.ts + lead.first_response_sec * 1000 + k * Math.floor((4 + r() * 30) * HOUR)
      const answered = lead.contacted ? r() < 0.82 : r() < 0.18
      const op = sales.find((s) => s.id === lead.manager_id) ?? pick(r, phones)
      calls.push({
        id: callId++,
        ts,
        day: dayKey(ts),
        hour: new Date(ts).getHours(),
        direction: 'out',
        operator_id: op.id,
        operator: op.name,
        status: answered ? 'answered' : 'missed',
        duration_sec: answered ? Math.round(30 + Math.exp(4.6 + gauss(r) * 0.55)) : 0,
        wait_sec: 0,
        callback_ts: null,
        ne_perezvonili: false,
        lead_id: lead.id,
        phone: lead.phone,
        recorded: answered,
      })
    }
  }
  calls.sort((a, b) => a.ts - b.ts)

  // ---- attendance (Mon–Sat) -----------------------------------------------------
  const attendance: Attendance[] = []
  {
  const r = rng(`${ws.id}:att`)
  for (let i = 0; i <= HISTORY_DAYS; i++) {
    const day0 = start + i * DAY
    if (new Date(day0).getDay() === 0) continue
    for (const s of staff) {
      const absent = r() < 0.025
      const late = Math.max(-25, Math.round(gauss(r) * 14 / s.skill + (1.1 - s.skill) * 40))
      const check_in = absent ? null : 9 * 60 + late
      const status: Attendance['status'] = absent ? 'absent' : late <= 0 ? 'ontime' : late <= 20 ? 'late' : 'very_late'
      attendance.push({ staff_id: s.id, staff: s.name, day: dayKey(day0), check_in, status })
    }
  }
  }

  // ---- plans: per manager per month, ~10% above their recent pace ---------------
  const plans: Plan[] = []
  const rp = rng(`${ws.id}:plans`)
  const revenueByMonth = new Map<string, number>()
  const dealsByMonth = new Map<string, number>()
  for (const p of payments) {
    const k = `${monthKey(p.ts)}|${p.manager_id}`
    revenueByMonth.set(k, (revenueByMonth.get(k) ?? 0) + p.amount)
  }
  for (const d of deals) {
    if (d.status !== 'won' || d.closed_ts === null) continue
    const k = `${monthKey(d.closed_ts)}|${d.manager_id}`
    dealsByMonth.set(k, (dealsByMonth.get(k) ?? 0) + 1)
  }
  const months: string[] = []
  for (let t = start; t < end; t += 27 * DAY) if (!months.includes(monthKey(t))) months.push(monthKey(t))
  if (!months.includes(monthKey(today))) months.push(monthKey(today))
  const curMonth = monthKey(today)
  for (const m of sales) {
    for (const month of months) {
      const idx = months.indexOf(month)
      const ref = months[Math.max(0, idx - 1)]!
      const base = revenueByMonth.get(`${month === curMonth ? ref : month}|${m.id}`) ?? revenueByMonth.get(`${ref}|${m.id}`) ?? 10_000_000
      const target = Math.max(5_000_000, Math.round((base * (1.06 + rp() * 0.1)) / 1_000_000) * 1_000_000)
      const dealsRef = dealsByMonth.get(`${month === curMonth ? ref : month}|${m.id}`) ?? 10
      plans.push({ month, manager_id: m.id, manager: m.name, target_amount: target, target_deals: Math.max(5, Math.round(dealsRef * 1.1)) })
    }
  }

  // ---- expenses (cash out): rent, salaries, ads, utilities, tax, petty cash -----
  const expenses: Expense[] = []
  {
    const r = rng(`${ws.id}:exp`)
    let id = 1
    const payroll = staff.reduce((s, x) => s + x.base, 0)
    const revByMonth = new Map<string, number>()
    for (const p of payments) revByMonth.set(monthKey(p.ts), (revByMonth.get(monthKey(p.ts)) ?? 0) + p.amount)
    const adsByWeek = new Map<number, number>()
    for (const a of ads) {
      const wk = Math.floor((new Date(`${a.day}T00:00:00`).getTime() - start) / (7 * DAY))
      adsByWeek.set(wk, (adsByWeek.get(wk) ?? 0) + a.spend_uzs)
    }
    const push = (ts: number, amount: number, category: Expense['category'], method: Expense['method'], note: string) =>
      expenses.push({ id: id++, ts, day: dayKey(ts), amount: Math.round(amount / 1000) * 1000, category, method, note })
    for (let i = 0; i <= HISTORY_DAYS; i++) {
      const day0 = start + i * DAY
      const d = new Date(day0)
      const at = (h: number) => day0 + h * HOUR + Math.floor(r() * HOUR)
      if (d.getDate() === 5) push(at(10), 14_000_000, 'Ijara', 'Bank', 'Ofis ijarasi')
      if (d.getDate() === 10) push(at(11), payroll * (0.98 + r() * 0.08), 'Ish haqi', 'Bank', "Oylik ish haqi")
      if (d.getDate() === 25) push(at(11), payroll * 0.4, 'Ish haqi', 'Naqd', 'Avans')
      if (d.getDate() === 12) push(at(9), 2_400_000 + r() * 900_000, 'Kommunal', 'Bank', "Elektr, gaz, internet")
      if (d.getDate() === 15) {
        const prev = monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime())
        const rev = revByMonth.get(prev)
        if (rev) push(at(10), rev * 0.04, 'Soliq', 'Bank', 'Aylanma solig‘i (4%)')
      }
      if (d.getDay() === 1) {
        const wk = Math.floor((day0 - start) / (7 * DAY)) - 1
        const spend = adsByWeek.get(wk)
        if (spend) push(at(12), spend, 'Reklama', 'Karta', 'Meta reklama (to‘ldirish)')
      }
      const small = count(r, d.getDay() === 0 ? 0.3 : 1.6)
      for (let k = 0; k < small; k++) {
        const cat = pickW(r, ["Xo'jalik", 'Transport', 'Ofis'] as const, [5, 3, 2])
        const notes = { "Xo'jalik": ['Suv va choy', 'Tozalash vositalari', 'Kanselyariya'], Transport: ['Taksi', 'Kuryer', 'Yoqilg‘i'], Ofis: ['Printer kartriji', 'Mebel ta’miri', 'Internet modem'] }[cat]
        push(at(9 + Math.floor(r() * 9)), 40_000 + Math.pow(r(), 2) * 900_000, cat, r() < 0.7 ? 'Naqd' : 'Karta', pick(r, notes))
      }
    }
    expenses.sort((a, b) => a.ts - b.ts)
  }

  // ---- Taqsimot: who works which day, planned leave, distribution shares -------------------
  {
    const r = rng(`${ws.id}:schedule`)
    const salesStaff = staff.filter((s) => s.sales)
    const weights = salesStaff.map((s) => 0.6 + s.skill * 0.6 + r() * 0.3)
    const total = weights.reduce((a, b) => a + b, 0)
    let left = 100
    salesStaff.forEach((s, i) => {
      s.share = i === salesStaff.length - 1 ? left : Math.round((weights[i]! / total) * 100)
      left -= s.share
    })
    for (const s of staff) {
      s.weekly_off = [0, ...(r() < 0.45 ? [pick(r, [1, 2, 3, 4, 5, 6])] : [])]
      if (r() < 0.35) {
        const from = today + int(r, -6, 18) * DAY
        s.vacation = { from: dayKey(from), to: dayKey(from + int(r, 3, 9) * DAY) }
      }
    }
  }

  return { staff, campaigns, ads, leads, deals, calls, attendance, payments, plans, expenses, start, end }
}

/** All sources in display order (for legends and filters). */
export const ALL_SOURCES = SOURCES
