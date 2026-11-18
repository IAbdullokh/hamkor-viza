import type { ValueType } from '@/formula'
import type { ConnectorId, Workspace } from './workspaces'
import { VOCAB } from './domain'
import type { Db } from './db'

/**
 * Synced tables as the semantic layer sees them: SQL name (lives in the workspace schema ws_<id>),
 * the connector it came from, and typed columns with Uzbek display names.
 */
export interface Column {
  /** Uzbek display name — formulas reference it as [name] */
  name: string
  /** SQL column name */
  sql: string
  type: ValueType
  get: (row: Record<string, unknown>) => unknown
}

export interface TableDef {
  name: string
  label: string
  connector: ConnectorId
  columns: Column[]
  rows: (db: Db) => Record<string, unknown>[]
  /** timestamp getter for date selectors */
  ts: (row: Record<string, unknown>) => number
}

const col = (name: string, sql: string, type: ValueType, key: string = sql): Column => ({ name, sql: `"${sql}"`, type, get: (r) => r[key] })
const dayTs = (r: Record<string, unknown>) => new Date(`${r.day as string}T00:00:00`).getTime()

export function tablesFor(ws: Workspace): TableDef[] {
  const v = VOCAB[ws.kind]
  // Everything below comes from the client's Bitrix24 (CRM, telephony, invoices, work time); only ads need Meta.
  const crm: ConnectorId = 'bitrix24'
  const crmPrefix = 'crm'
  const stageLabel = (r: Record<string, unknown>) => v.stages[r.stage as keyof typeof v.stages]
  const dealStatus: Record<string, string> = { won: 'Muvaffaqiyatli', lost: 'Muvaffaqiyatsiz', open: 'Jarayonda' }
  const attStatus: Record<string, string> = { ontime: 'Vaqtida', late: 'Kech', very_late: 'Juda kech', absent: 'Kelmadi' }

  const tables: TableDef[] = [
    {
      name: `${crmPrefix}_leads`,
      label: 'Lidlar',
      connector: crm,
      rows: (db) => db.leads as unknown as Record<string, unknown>[],
      ts: (r) => r.ts as number,
      columns: [
        col('ID', 'id', 'number'),
        col('Sana', 'day', 'date'),
        col('Vaqt', 'created_at', 'datetime', 'ts'),
        col('Ism', 'name', 'string'),
        col('Telefon', 'phone', 'string'),
        col('Manba', 'source', 'string'),
        col('Kampaniya', 'campaign', 'string'),
        col("Mas'ul", 'manager', 'string'),
        col(v.productLabel, 'product', 'string'),
        col('Filial', 'branch', 'string'),
        // the stage as the Lidlar page names it: the real CRM stage when the lead has one, else its standard name
        { name: 'Bosqich', sql: '"stage"', type: 'string', get: (r) => (r.stage_name as string | undefined) || stageLabel(r) },
        col("Aloqa o'rnatildi", 'contacted', 'boolean'),
        col('Sifatli', 'qualified', 'boolean'),
        col('Tashrif belgilandi', 'booked', 'boolean'),
        col('Tashrif buyurdi', 'visited', 'boolean'),
        col('Sotildi', 'won', 'boolean'),
        col('Sabab', 'reason', 'string'),
        // a lead not answered yet holds +Infinity in the Db (Taqsimot's "Kutilmoqda"): here it is empty, so AVG / MIN / MAX skip it
        { name: 'Javob vaqti, s', sql: '"first_response_sec"', type: 'number', get: (r) => (Number.isFinite(r.first_response_sec) ? r.first_response_sec : null) },
        col('UTM source', 'utm_source', 'string'),
        col('UTM medium', 'utm_medium', 'string'),
        col('UTM campaign', 'utm_campaign', 'string'),
      ],
    },
    {
      name: `${crmPrefix}_deals`,
      label: 'Sdelkalar',
      connector: crm,
      rows: (db) => db.deals as unknown as Record<string, unknown>[],
      // by creation, as the Sdelkalar page counts them (its Davr is DATE_CREATE): a chart added there shows the page's
      // deals; "Yopilgan sana" is the column for closing dates
      ts: (r) => r.ts as number,
      columns: [
        col('ID', 'id', 'number'),
        col('Sana', 'day', 'date'),
        col("Mas'ul", 'manager', 'string'),
        col(v.productLabel, 'product', 'string'),
        col('Manba', 'source', 'string'),
        col('Filial', 'branch', 'string'),
        { name: 'Holat', sql: '"status"', type: 'string', get: (r) => dealStatus[r.status as string] },
        // the pipeline stage, as the page's Bosqich filter names it
        col('Bosqich', 'stage', 'string'),
        col('Yopilgan sana', 'closed_day', 'date'),
        col('Summa', 'amount', 'number'),
      ],
    },
    {
      name: 'telephony_calls',
      label: "Qo'ng'iroqlar",
      connector: crm,
      rows: (db) => db.calls as unknown as Record<string, unknown>[],
      ts: (r) => r.ts as number,
      columns: [
        col('ID', 'id', 'number'),
        col('Sana', 'day', 'date'),
        col('Vaqt', 'started_at', 'datetime', 'ts'),
        col('Soat', 'hour', 'number'),
        { name: "Yo'nalish", sql: '"direction"', type: 'string', get: (r) => (r.direction === 'in' ? 'Kiruvchi' : 'Chiquvchi') },
        col('Operator', 'operator', 'string'),
        { name: 'Holat', sql: '"status"', type: 'string', get: (r) => (r.status === 'answered' ? 'Javob berildi' : r.status === 'short' ? 'Qisqa suhbat' : "O'tkazib yuborildi") },
        col('Davomiylik, s', 'duration_sec', 'number'),
        col('Kutish, s', 'wait_sec', 'number'),
        // no call back within 7 days, the same rule as the Qo'ng'iroqlar page (SnapshotBuilder; was "24 soatda …")
        col("Qayta qo'ng'iroq qilinmagan", 'ne_perezvonili', 'boolean'),
      ],
    },
    {
      name: 'ads_daily',
      label: 'Reklama (kunlik)',
      connector: 'meta',
      rows: (db) => db.ads as unknown as Record<string, unknown>[],
      ts: dayTs,
      columns: [
        col('Sana', 'day', 'date'),
        col('Kampaniya', 'campaign', 'string'),
        col('Ad set', 'adset', 'string'),
        col('Kreativ', 'creative', 'string'),
        col('Sarf, $', 'spend_usd', 'number'),
        col("Ko'rsatishlar", 'impressions', 'number'),
        col('Kliklar', 'clicks', 'number'),
        col('Lid formalar', 'leads', 'number'),
      ],
    },
    {
      name: `${crmPrefix}_payments`,
      label: "To'lovlar",
      connector: crm,
      rows: (db) => db.payments as unknown as Record<string, unknown>[],
      ts: (r) => r.ts as number,
      columns: [
        col('ID', 'id', 'number'),
        col('Sana', 'day', 'date'),
        col('Summa', 'amount', 'number'),
        col("To'lov usuli", 'method', 'string'),
        { name: 'Turi', sql: '"kind"', type: 'string', get: (r) => (r.kind === 'first' ? "Birinchi to'lov" : "Takroriy to'lov") },
        col("Mas'ul", 'manager', 'string'),
        col(v.productLabel, 'product', 'string'),
      ],
    },
    {
      name: 'timeman_days',
      label: 'Ish vaqti (davomat)',
      connector: crm,
      rows: (db) => db.attendance as unknown as Record<string, unknown>[],
      ts: dayTs,
      columns: [
        col('Sana', 'day', 'date'),
        col('Xodim', 'staff', 'string'),
        col('Kelgan vaqti, daq', 'check_in', 'number'),
        { name: 'Holat', sql: '"status"', type: 'string', get: (r) => attStatus[r.status as string] },
      ],
    },
    {
      name: 'crm_expenses',
      label: 'Chiqimlar',
      connector: crm,
      rows: (db) => db.expenses as unknown as Record<string, unknown>[],
      ts: (r) => r.ts as number,
      columns: [
        col('ID', 'id', 'number'),
        col('Sana', 'day', 'date'),
        col('Summa', 'amount', 'number'),
        col('Toifa', 'category', 'string'),
        col("To'lov usuli", 'method', 'string'),
        col('Izoh', 'note', 'string'),
      ],
    },
  ]
  return tables
}
