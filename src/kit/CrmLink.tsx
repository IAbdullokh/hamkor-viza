import { ArrowUpRight } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useMeta } from '@/data/source'
import { crmUrl, type CrmKind } from '@/data/crmLink'

/**
 * A record's "#id": a real link to its page in the portal (new tab) when there is one, else plain grey text — a row with
 * no CRM record (the demo, a table source, a call without a lead) never looks like a link. The click stays on the link:
 * a list row that opens the record itself does not open it a second time.
 */
export function CrmLink({ kind, id, label, className }: { kind: CrmKind; id: number | string | null | undefined; label?: string; className?: string }) {
  const url = crmUrl(useMeta().portalUrl, kind, id)
  const text = label ?? `#${id}`
  if (!url) return <span className={cx('num text-ink-3', className)}>{text}</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cx('num inline-flex items-center gap-0.5 font-semibold whitespace-nowrap text-primary-strong underline-offset-2 hover:underline', className)}
    >
      {text}
      <ArrowUpRight aria-hidden size={12} className="shrink-0 opacity-70" />
    </a>
  )
}
