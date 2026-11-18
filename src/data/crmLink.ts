/**
 * A lead's or deal's own page in the portal (owner, 2026-10-26: "when I press a client it doesn't go to the CRM"). Only a
 * live project knows its portal (meta.portalUrl); the demo has none, so its rows stay plain. The path follows the CRM
 * (review 2026-11-04): an amoCRM / Kommo account (*.amocrm.ru, *.amocrm.com, *.kommo.com) opens /leads/detail/ID — its deals
 * are its leads, with the same id — and anything else is a Bitrix24 portal (also a box one on its own domain, with a port).
 *
 * The link is always the portal's own address — a *.bitrix24.kz portal too: the relay server only carries Studio's API
 * calls, never the viewer's browser. Only a CRM record has a page: a call, a chat or a table-source row has none, so callers
 * link the call's lead (lead_id), never the call's own id.
 */
export type CrmKind = 'lead' | 'deal'

const AMO_HOST = /\.(amocrm\.(ru|com)|kommo\.com)$/i

/** "https://host" or "https://host:port" (a box portal); anything else (http, a path, a script) gives no link */
const PORTAL = /^https:\/\/[a-z0-9.-]+(:\d{2,5})?$/i

/** the portal's base address: a bare host ("x.bitrix24.kz") is taken as https, a trailing slash or path is dropped */
export function portalBase(portalUrl: string | null | undefined): string | null {
  if (!portalUrl) return null
  let base = portalUrl.trim()
  if (!/^[a-z]+:\/\//i.test(base)) base = `https://${base}`
  const m = /^(https:\/\/[^/?#]+)/i.exec(base)
  if (!m || !PORTAL.test(m[1]!)) return null
  return m[1]!.toLowerCase()
}

/** a real CRM id: a positive whole number (0, "", "mz-12" or a table row's key are not records in the portal) */
export function isCrmId(id: number | string | null | undefined): boolean {
  if (id == null || id === '') return false
  const s = String(id)
  return /^\d+$/.test(s) && Number(s) > 0
}

export function crmUrl(portalUrl: string | null | undefined, kind: CrmKind, id: number | string | null | undefined): string | null {
  const base = portalBase(portalUrl)
  if (!base || !isCrmId(id)) return null
  if (AMO_HOST.test(base.replace(/:\d+$/, ''))) return `${base}/leads/detail/${id}`
  return `${base}/crm/${kind}/details/${id}/`
}

/**
 * Opens the record in a new tab with no opener (the portal page can't reach back into Studio). A link click, not
 * window.open with a features string: some browsers turn that into a popup window, and a Telegram / phone web view
 * blocks it.
 */
export function openCrm(url: string | null): void {
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
