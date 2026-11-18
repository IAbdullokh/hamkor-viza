import type { DatasetField, DatasetSpec, Format } from '@/spec'
import { VOCAB } from './domain'
import { tablesFor } from './tables'
import type { ConnectorId, Workspace } from './workspaces'

/** Datasets whose source is connected (the "Datasetlar" list). */
export function availableDatasets(ws: Workspace, connected: ConnectorId[]): DatasetSpec[] {
  const tables = tablesFor(ws)
  return datasetsFor(ws).filter((d) => connected.includes(tables.find((t) => t.name === d.table)!.connector))
}

/**
 * Default datasets of every workspace — the semantic layer Data365 ships with each client.
 * Every source column becomes a dimension; measures and calculated fields are formulas
 * (the same formulas a user can edit in the dataset editor).
 */
/** Why a lead has no response time (StageHistory.FirstResponseSec on the server): Taqsimot and the dataset charts say it. */
export const RESPONSE_EMPTY =
  "Javob vaqti yo'q: bu davrdagi lidlar birinchi bosqichdan siljimagan, ularga chiquvchi qo'ng'iroq bo'lmagan yoki bosqichlar tarixi yuklanmagan"

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻ'’`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const m = (name: string, formula: string, format: Format = 'number', description?: string): DatasetField => ({ id: slug(name), name, kind: 'measure', formula, format, description })
const d = (name: string, formula: string, format?: Format, description?: string): DatasetField => ({ id: slug(name), name, kind: 'dimension', formula, format, description, calculated: true })

function columnFields(table: string, ws: Workspace, skip: string[] = []): DatasetField[] {
  const t = tablesFor(ws).find((x) => x.name === table)!
  return t.columns
    .filter((c) => !skip.includes(c.name))
    .map((c) => ({
      id: slug(c.name),
      name: c.name,
      kind: 'dimension' as const,
      formula: `[${c.name}]`,
      format: c.type === 'date' ? ('date' as const) : undefined,
    }))
}

export function datasetsFor(ws: Workspace): DatasetSpec[] {
  const tables = tablesFor(ws)
  const tn = (label: string) => tables.find((t) => t.label === label)!.name
  const v = VOCAB[ws.kind]
  const leadsT = tn('Lidlar')
  const out: DatasetSpec[] = [
    {
      version: 1,
      id: 'leads',
      name: 'Lidlar voronkasi',
      description: "CRM lidlari: manba, kampaniya, mas'ul va voronka bosqichlari",
      table: leadsT,
      dateField: 'Vaqt',
      fields: [
        ...columnFields(leadsT, ws, ['Ism', 'Telefon']),
        d('Hafta', 'DATETRUNC([Sana], "week")', 'date'),
        d('Oy', 'DATETRUNC([Sana], "month")', 'date'),
        d('Soat', 'HOUR([Vaqt])', 'hour'),
        d('Hafta kuni', 'WEEKDAY([Sana])', 'weekday'),
        d('Kanal', 'IF([Manba] IN ("Instagram", "Facebook"), "Meta reklama", "Organik")', undefined, 'Meta reklamasidan kelganmi yoki organik'),
        m('Lidlar soni', 'COUNT([ID])', 'number', 'Barcha kelgan lidlar'),
        m('Sifatli lidlar', 'COUNT_IF([Sifatli])'),
        m('Sifatsiz lidlar', 'COUNT_IF([Bosqich] = "' + v.stages.junk + '")'),
        m('Sifatli ulush', 'COUNT_IF([Sifatli]) / COUNT([ID])', 'percent'),
        m('Tashrif belgilanganlar', 'COUNT_IF([Tashrif belgilandi])'),
        m('Tashrif buyurganlar', 'COUNT_IF([Tashrif buyurdi])'),
        m('Sotuvlar', 'COUNT_IF([Sotildi])'),
        m('Konversiya', 'COUNT_IF([Sotildi]) / COUNT([ID])', 'percent', 'Lid → sotuv'),
        m('Sifatli → tashrif', 'COUNT_IF([Tashrif buyurdi]) / COUNT_IF([Sifatli])', 'percent'),
        { ...m("O'rtacha javob vaqti", 'AVG([Javob vaqti, s]) / 60', 'minutes', "Lid kelgandan birinchi aloqagacha, daqiqa"), empty: RESPONSE_EMPTY },
        m("Mas'ullar soni", "COUNTD([Mas'ul])"),
      ],
    },
    {
      version: 1,
      id: 'ads',
      name: 'Meta reklama',
      description: 'Kampaniyalar, ad setlar va kreativlar bo‘yicha kunlik sarf va natija',
      table: 'ads_daily',
      dateField: 'Sana',
      fields: [
        ...columnFields('ads_daily', ws),
        d('Hafta', 'DATETRUNC([Sana], "week")', 'date'),
        d('Oy', 'DATETRUNC([Sana], "month")', 'date'),
        m('Jami sarf', 'SUM([Sarf, $])', 'usd'),
        m('Impressiyalar', "SUM([Ko'rsatishlar])"),
        m('Kliklar soni', 'SUM([Kliklar])'),
        m('Lidlar (Meta)', 'SUM([Lid formalar])'),
        m('Lead narxi (CPL)', 'SUM([Sarf, $]) / SUM([Lid formalar])', 'usd', 'Bitta lid narxi'),
        m('Click narxi (CPC)', 'SUM([Sarf, $]) / SUM([Kliklar])', 'usd'),
        m('CTR', "SUM([Kliklar]) / SUM([Ko'rsatishlar])", 'percent'),
        m('CPM', "SUM([Sarf, $]) / SUM([Ko'rsatishlar]) * 1000", 'usd'),
      ],
    },
    {
      version: 1,
      id: 'calls',
      name: "Qo'ng'iroqlar",
      description: "Telefoniya: kiruvchi/chiquvchi, o'tkazib yuborilgan va ne-perezvonili",
      table: 'telephony_calls',
      dateField: 'Vaqt',
      fields: [
        ...columnFields('telephony_calls', ws),
        d('Hafta kuni', 'WEEKDAY([Sana])', 'weekday'),
        m("Qo'ng'iroqlar soni", 'COUNT([ID])'),
        m('Kiruvchi', 'COUNT_IF([Yo\'nalish] = "Kiruvchi")'),
        m('Chiquvchi', 'COUNT_IF([Yo\'nalish] = "Chiquvchi")'),
        m('Propushenniy', 'COUNT_IF([Yo\'nalish] = "Kiruvchi" AND [Holat] = "O\'tkazib yuborildi")', 'number', "O'tkazib yuborilgan kiruvchi qo'ng'iroqlar"),
        m('Ne-perezvonili', "COUNT_IF([Qayta qo'ng'iroq qilinmagan])", 'number', "Qayta qo'ng'iroq qilinmagan"),
        m('Javob ulushi', 'COUNT_IF([Holat] = "Javob berildi") / COUNT([ID])', 'percent'),
        m("O'rtacha davomiylik", 'AVG_IF([Davomiylik, s], [Holat] = "Javob berildi")', 'duration'),
        m('Jami suhbat', 'SUM([Davomiylik, s]) / 3600', 'decimal', 'Soatlarda'),
        m("O'rtacha kutish", 'AVG_IF([Kutish, s], [Yo\'nalish] = "Kiruvchi")', 'duration'),
      ],
    },
    {
      version: 1,
      id: 'deals',
      name: 'Sdelkalar',
      description: 'Sdelkalar holati, summasi va o‘rtacha chek',
      table: tn('Sdelkalar'),
      dateField: 'Sana',
      fields: [
        ...columnFields(tn('Sdelkalar'), ws),
        d('Oy', 'DATETRUNC([Sana], "month")', 'date'),
        m('Sdelkalar soni', 'COUNT([ID])'),
        m('Muvaffaqiyatli', 'COUNT_IF([Holat] = "Muvaffaqiyatli")'),
        m('Muvaffaqiyatsiz', 'COUNT_IF([Holat] = "Muvaffaqiyatsiz")'),
        m('Jarayonda', 'COUNT_IF([Holat] = "Jarayonda")'),
        m('Sotuvlar summasi', 'SUM_IF([Summa], [Holat] = "Muvaffaqiyatli")', 'money'),
        m("O'rtacha chek", 'AVG_IF([Summa], [Holat] = "Muvaffaqiyatli")', 'money'),
        m('Yutish ulushi', 'COUNT_IF([Holat] = "Muvaffaqiyatli") / NULLIF(COUNT_IF([Holat] != "Jarayonda"), 0)', 'percent'),
      ],
    },
    {
      version: 1,
      id: 'payments',
      name: "To'lovlar (Kassa)",
      description: "Kelib tushgan to'lovlar: usul, birinchi/takroriy",
      table: tn("To'lovlar"),
      dateField: 'Sana',
      fields: [
        ...columnFields(tn("To'lovlar"), ws),
        d('Oy', 'DATETRUNC([Sana], "month")', 'date'),
        d('Hafta', 'DATETRUNC([Sana], "week")', 'date'),
        m('Tushum', 'SUM([Summa])', 'money'),
        m("To'lovlar soni", 'COUNT([ID])'),
        m("O'rtacha to'lov", 'AVG([Summa])', 'money'),
        m('Takroriy ulush', 'SUM_IF([Summa], [Turi] = "Takroriy to\'lov") / SUM([Summa])', 'percent'),
      ],
    },
    {
      version: 1,
      id: 'attendance',
      name: 'Davomat',
      description: 'Xodimlarning ishga kelish vaqti',
      table: 'timeman_days',
      dateField: 'Sana',
      fields: [
        ...columnFields('timeman_days', ws),
        m('Kunlar', 'COUNT([Sana])'),
        m('Vaqtida', 'COUNT_IF([Holat] = "Vaqtida")'),
        m('Kechikishlar', 'COUNT_IF([Holat] IN ("Kech", "Juda kech"))'),
        m('Vaqtida ulush', 'COUNT_IF([Holat] = "Vaqtida") / COUNT([Sana])', 'percent'),
      ],
    },
    {
      version: 1,
      id: 'expenses',
      name: 'Chiqimlar (Kassa)',
      description: "Ijara, ish haqi, reklama, soliq va mayda xarajatlar",
      table: 'crm_expenses',
      dateField: 'Sana',
      fields: [
        ...columnFields('crm_expenses', ws),
        d('Oy', 'DATETRUNC([Sana], "month")', 'date'),
        d('Hafta', 'DATETRUNC([Sana], "week")', 'date'),
        m('Jami chiqim', 'SUM([Summa])', 'money'),
        m('Chiqimlar soni', 'COUNT([ID])'),
        m('Naqd chiqim', 'SUM_IF([Summa], [To\'lov usuli] = "Naqd")', 'money'),
      ],
    },
  ]
  return out
}
