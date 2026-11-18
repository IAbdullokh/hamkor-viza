import { getSettings } from '@/lib/settings'

/**
 * The demo has ONE workspace: the client's company, created automatically when they paste their
 * Bitrix24 webhook / API key. Its name and portal come from that URL. The architecture stays multi-tenant
 * (every piece of data is still scoped by workspace id), the UI simply never asks the client to choose one.
 */
export type WorkspaceKind = 'sales'
export type ConnectorId = 'bitrix24' | 'meta' | 'sheets' | 'amocrm' | 'postgres' | 'csv'

export interface Workspace {
  id: string
  /** company name, from the Bitrix24 portal address */
  name: string
  /** e.g. "kompaniya.bitrix24.uz" */
  portal: string
  kind: WorkspaceKind
  /** 'cloud' = shared Data365 cloud, 'dedicated' = client's own server. The UI may show it, the code never branches on it. */
  deployment: 'cloud' | 'dedicated'
  /** default dashboard */
  home: string
}

export const WORKSPACE_ID = 'main'

export function getWorkspace(_id?: string): Workspace {
  const s = getSettings()
  return {
    id: WORKSPACE_ID,
    name: s.company || 'Demo kompaniya',
    portal: s.portal || 'kompaniya.bitrix24.uz',
    kind: 'sales',
    deployment: 'cloud',
    home: `${WORKSPACE_ID}-overview`,
  }
}

/**
 * Read the company out of whatever the client pasted:
 *   https://ilmacademy.bitrix24.uz/rest/1/abc123xyz/  →  { company: "Ilmacademy", portal: "ilmacademy.bitrix24.uz" }
 * A bare API key (no URL) is accepted too; the portal is then unknown.
 */
export function parseBitrixInput(raw: string): { ok: true; company: string; portal: string; key: string } | { ok: false; error: string } {
  const v = raw.trim()
  if (!v) return { ok: false, error: "Webhook manzili yoki API kalitni kiriting" }
  const url = /^https?:\/\/([a-z0-9-]+)\.(bitrix24\.[a-z.]+)\/rest\/(\d+)\/([A-Za-z0-9]{8,})\/?$/i.exec(v)
  if (url) {
    const sub = url[1]!
    const company = sub.replace(/^b24-/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return { ok: true, company, portal: `${sub}.${url[2]}`.toLowerCase(), key: url[4]! }
  }
  if (/^https?:\/\//i.test(v)) {
    if (!/bitrix24\./i.test(v)) return { ok: false, error: "Bu Bitrix24 manzili emas. Manzil …bitrix24.uz/rest/… ko'rinishida bo'ladi" }
    return { ok: false, error: "Webhook to'liq emas: oxirida /rest/1/kalit/ qismi bo'lishi kerak" }
  }
  if (/^[A-Za-z0-9]{16,64}$/.test(v)) return { ok: true, company: 'Kompaniyangiz', portal: 'bitrix24', key: v }
  return { ok: false, error: "Kalit noto'g'ri ko'rinishda. Bitrix24 → Dasturchilar uchun → Kiruvchi webhook bo'limidan nusxa oling" }
}
