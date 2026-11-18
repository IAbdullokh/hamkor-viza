import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useT } from '@/i18n'
import { Button } from '@/ui/controls'
import { Tooltip, useToast } from '@/ui/overlay'
import { CSRF_HEADER, CSRF_VALUE } from '@/features/auth/csrf'

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

/**
 * "Yangilash" on a published dashboard (its viewers, on the publishing server). The server keeps building new data by
 * itself; the page does not swap numbers under the viewer (2026-11-11). So the button means "show me the newest":
 *  - the server already has newer numbers than the screen (`pending`): they show at once, in place (`onApply`);
 *  - the screen is up to date: a fresh pull from the sources starts (POST /live/{slug}/pull — the server allows one a
 *    minute and never two at a time) and its build shows by itself when ready (`onAsk` marks it asked for).
 */
export function KioskRefresh({ slug, pending = false, onApply, onAsk }: { slug: string; pending?: boolean; onApply?: () => void; onAsk?: () => void }) {
  const { t } = useT()
  const toast = useToast()
  const [until, setUntil] = useState(0)
  const [, tick] = useState(0)
  const waiting = until > Date.now()

  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [waiting])

  const pull = async () => {
    if (pending && onApply) {
      onApply()
      return
    }
    try {
      const res = await fetch(`${BASE}/live/${encodeURIComponent(slug)}/pull`, { method: 'POST', credentials: 'include', headers: { [CSRF_HEADER]: CSRF_VALUE } })
      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as { params?: { retryAfter?: number } } | null
        const s = body?.params?.retryAfter ?? 60
        setUntil(Date.now() + s * 1000)
        toast(t("Hozirgina yangilandi — {s} soniyadan keyin qayta bosing", { s }), 'info')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      onAsk?.()
      setUntil(Date.now() + 60_000)
      toast(t("Yangi ma'lumotlar olinmoqda — 1–2 daqiqada o'zi chiqadi"), 'ok')
    } catch {
      toast(t("Yangilab bo'lmadi — birozdan keyin urinib ko'ring"), 'error')
    }
  }

  return (
    <Tooltip content={t("Eng yangi ma'lumotni ko'rsatish")}>
      <Button size="sm" variant="soft" icon={RefreshCw} onClick={() => void pull()} disabled={waiting && !pending}>
        {waiting && !pending ? t('Yangilanmoqda…') : t('Yangilash')}
      </Button>
    </Tooltip>
  )
}
