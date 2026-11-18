import { ChevronDown, CircleX, LoaderCircle, RefreshCw, TriangleAlert, Check } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { useT } from '@/i18n'
import { Badge, Button } from './controls'

/**
 * The universal states vocabulary (ux.md §1.4) as components, so every screen says the same words.
 *
 *   <Spinner label={t('Yuklanmoqda…')} />
 *   <StatusPill state="partial" />            // "Qisman" warn badge with triangle-alert
 *   <ErrorPanel title={e.title} action={e.action} detail={err.detail} code={err.code} onRetry={refresh} />
 */
export function Spinner({ size = 18, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2 text-ink-3', className)}>
      <LoaderCircle aria-hidden size={size} className="animate-spin" />
      {label ? <span className="text-[0.875rem]">{label}</span> : <span className="sr-only">…</span>}
    </span>
  )
}

export type StatusState = 'working' | 'done' | 'partial' | 'attention' | 'error' | 'soon' | 'ready' | 'inprocess' | 'draft'

/** one pill per state of ux.md §1.4 (label can be overridden, the look cannot) */
export function StatusPill({ state, label, className }: { state: StatusState; label?: string; className?: string }) {
  const { t } = useT()
  switch (state) {
    case 'working':
      return (
        <Badge tone="accent" className={className}>
          <span className="status-dot" data-s="sync" aria-hidden />
          {label ?? t('Ishlanmoqda…')}
        </Badge>
      )
    case 'inprocess':
      return (
        <Badge tone="accent" className={className}>
          <span className="status-dot" data-s="sync" aria-hidden />
          {label ?? t('Jarayonda')}
        </Badge>
      )
    case 'done':
    case 'ready':
      return (
        <Badge tone="good" className={className}>
          <Check aria-hidden size={12} strokeWidth={3} />
          {label ?? t('Tayyor')}
        </Badge>
      )
    case 'partial':
      return (
        <Badge tone="warn" className={className}>
          <TriangleAlert aria-hidden size={12} />
          {label ?? t('Qisman')}
        </Badge>
      )
    case 'attention':
      return (
        <Badge tone="warn" className={className}>
          {label ?? t("E'tibor kerak")}
        </Badge>
      )
    case 'error':
      return (
        <Badge tone="bad" className={className}>
          <CircleX aria-hidden size={12} />
          {label ?? t('Xato')}
        </Badge>
      )
    case 'soon':
      return (
        <Badge tone="neutral" className={className}>
          {label ?? t('Tez kunda')}
        </Badge>
      )
    case 'draft':
      return (
        <Badge tone="neutral" className={className}>
          {label ?? t('Qoralama')}
        </Badge>
      )
  }
}

/** Hard error block: what happened + what to do, retry, and a collapsed "Texnik ma'lumot" line. */
export function ErrorPanel({
  title,
  action,
  code,
  detail,
  onRetry,
  extra,
  className,
}: {
  title: string
  action?: string
  code?: string
  detail?: string
  onRetry?: () => void
  extra?: ReactNode
  className?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const tech = [code, detail].filter(Boolean).join(' · ')
  return (
    <div role="alert" className={cx('panel rise-in flex flex-col items-center gap-2 px-6 py-8 text-center', className)}>
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-[16px] bg-danger-soft text-danger">
        <CircleX aria-hidden size={24} />
      </span>
      <p className="text-[1.0625rem] font-semibold text-ink">{title}</p>
      {action && <p className="max-w-md text-[0.875rem] text-ink-2">{action}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
            {t('Qayta urinish')}
          </Button>
        )}
        {extra}
      </div>
      {tech && (
        <div className="mt-2">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="pressable inline-flex items-center gap-1 rounded-full px-2 text-[0.75rem] text-ink-3 hover:text-ink-2">
            {t("Texnik ma'lumot")}
            <ChevronDown aria-hidden size={13} className={cx('transition-transform', open && 'rotate-180')} />
          </button>
          {open && <p className="reveal mt-1 font-mono text-[0.75rem] break-all text-ink-3 select-all">{tech}</p>}
        </div>
      )}
    </div>
  )
}
