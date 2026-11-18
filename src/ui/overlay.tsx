import { createContext, useCallback, useContext, useState, type HTMLAttributes, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import * as Tip from '@radix-ui/react-tooltip'
import { Check, CheckCircle2, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useT } from '@/i18n'

/**
 * Floating surfaces: Sheet (slides up from the bottom / in from the side), Modal, Popover, Menu, Tooltip, Toasts.
 * All use .glass-pop (dense glass) so text stays readable over anything.
 */

export function Sheet({
  open,
  onOpenChange,
  title,
  subtitle,
  side = 'right',
  width = 560,
  children,
  footer,
  onOpenAutoFocus,
  contentProps,
  overlay,
  top,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  subtitle?: ReactNode
  side?: 'right' | 'bottom'
  width?: number
  children: ReactNode
  footer?: ReactNode
  /** e.g. focus a composer instead of the first button (call e.preventDefault() first) */
  onOpenAutoFocus?: (e: Event) => void
  /** extra handlers on the whole sheet (e.g. the Nova panel's file drop) */
  contentProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>
  /** drawn over the whole sheet (e.g. a drop hint) */
  overlay?: ReactNode
  /** opened from another dialog (the zoomed block editor, z 80): drawn above it */
  top?: boolean
}) {
  const { t } = useT()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cx('sheet-overlay fixed inset-0 bg-[rgb(12_14_20/0.32)]', top ? 'z-[90]' : 'z-[60]')} />
        <Dialog.Content
          className={cx(
            'glass-pop fixed flex flex-col overflow-hidden focus:outline-none',
            top ? 'z-[91]' : 'z-[61]',
            side === 'right'
              ? 'sheet-right inset-y-3 end-3 max-w-[calc(100vw-24px)] rounded-[28px]'
              : 'sheet-bottom inset-x-3 bottom-3 max-h-[86dvh] rounded-[28px] sm:inset-x-auto sm:start-1/2 sm:w-[min(920px,calc(100vw-48px))] sm:-translate-x-1/2',
          )}
          style={side === 'right' ? { width } : undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          {...contentProps}
        >
          {overlay}
          <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[1.1875rem] font-bold tracking-[-0.015em] text-ink">{title}</Dialog.Title>
              {subtitle ? (
                <Dialog.Description className="mt-0.5 text-[0.875rem] text-ink-2">{subtitle}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="pressable -me-1 grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={t("Yopish")}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const { t } = useT()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[60] bg-[rgb(12_14_20/0.36)] backdrop-blur-[3px]" />
        <Dialog.Content
          className="modal-in glass-pop fixed start-1/2 top-1/2 z-[61] flex max-h-[88dvh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] focus:outline-none"
          style={{ maxWidth: width }}
        >
          <header className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[1.1875rem] font-bold tracking-[-0.015em] text-ink">{title}</Dialog.Title>
              {subtitle ? (
                <Dialog.Description className="mt-0.5 text-[0.875rem] text-ink-2">{subtitle}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="pressable -me-1 grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={t("Yopish")}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Pop({
  trigger,
  children,
  align = 'end',
  width = 280,
  open,
  onOpenChange,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  width?: number
  /** controlled (e.g. a choice inside closes it); omit both for a plain popover */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={8} className="pop-in glass-pop z-[65] rounded-[20px] p-2 focus:outline-none" style={{ width }}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  danger?: boolean
  hint?: string
  /** a choice menu (Finder style): true shows ✓ in front; false keeps the space */
  checked?: boolean
}

export function DropMenu({ trigger, items, align = 'end' }: { trigger: ReactNode; items: (MenuItem | 'sep')[]; align?: 'start' | 'end' }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={align} sideOffset={8} className="pop-in glass-pop z-[65] min-w-[220px] rounded-[18px] p-1.5 focus:outline-none">
          {items.map((it, i) =>
            it === 'sep' ? (
              <Menu.Separator key={i} className="my-1 h-px bg-line" />
            ) : (
              <Menu.Item
                key={i}
                onSelect={it.onSelect}
                className={cx(
                  'flex min-h-[36px] cursor-pointer items-center gap-2.5 rounded-[12px] px-2.5 text-[0.875rem] outline-none select-none data-[highlighted]:bg-surface-2',
                  it.danger ? 'text-danger' : 'text-ink',
                )}
              >
                {it.checked !== undefined && (
                  <span aria-hidden className="flex w-4 shrink-0 justify-center text-primary-strong">
                    {it.checked && <Check size={15} strokeWidth={2.4} />}
                  </span>
                )}
                {it.icon && <it.icon size={16} className={it.danger ? '' : 'text-ink-2'} />}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-[0.75rem] text-ink-3">{it.hint}</span>}
              </Menu.Item>
            ),
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tip.Root delayDuration={250}>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content side={side} sideOffset={6} className="pop-in glass-pop z-[80] rounded-[12px] px-2.5 py-1.5 text-[0.8125rem] text-ink">
          {content}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <Tip.Provider>{children}</Tip.Provider>
}

/* ---------- Confirm ---------- */

/**
 * Yes / no question on top of Modal.
 *
 *   <ConfirmModal open={open} onOpenChange={setOpen} title={t("Loyihani o'chirasizmi?")} text={t('Buni qaytarib bo\'lmaydi')}
 *                 confirmLabel={t("O'chirish")} danger onConfirm={remove} />
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  text,
  children,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  text?: ReactNode
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** red confirm button (destructive) */
  danger?: boolean
  /** confirm in progress: buttons disabled */
  busy?: boolean
  onConfirm: () => void
}) {
  const { t } = useT()
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !busy && onOpenChange(v)}
      title={title}
      subtitle={text}
      width={460}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="pressable inline-flex min-h-[40px] items-center rounded-full px-4 text-[0.9375rem] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {cancelLabel ?? t('Bekor qilish')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cx(
              'pressable inline-flex min-h-[40px] items-center rounded-full px-4 text-[0.9375rem] font-semibold text-white disabled:opacity-50',
              danger ? 'bg-danger' : 'bg-primary-fill',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children ?? null}
    </Modal>
  )
}

/* ---------- Toasts ---------- */

export type ToastTone = 'ok' | 'info' | 'warn' | 'error'

export interface ToastOptions {
  /** one button in the toast, e.g. { label: t('Qayta urinish'), onClick: retry } */
  action?: { label: string; onClick: () => void }
  /** ms on screen (default 3200; 6000 with an action) */
  duration?: number
}

interface ToastItem {
  id: number
  text: string
  tone: ToastTone
  action?: ToastOptions['action']
}

/** toast(text, tone?, options?) — existing toast(text) / toast(text, 'info') calls keep working */
export type ToastFn = (text: string, tone?: ToastTone, options?: ToastOptions) => void

const ToastCtx = createContext<ToastFn>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

let nextId = 1

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  ok: <CheckCircle2 aria-hidden size={18} className="shrink-0 text-good" />,
  info: <Info aria-hidden size={18} className="shrink-0 text-primary-strong" />,
  warn: <TriangleAlert aria-hidden size={18} className="shrink-0 text-warm" />,
  error: <CircleX aria-hidden size={18} className="shrink-0 text-danger" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback<ToastFn>(
    (text, tone = 'ok', options) => {
      const id = nextId++
      setItems((xs) => [...xs.filter((x) => x.text !== text), { id, text, tone, action: options?.action }])
      setTimeout(() => dismiss(id), options?.duration ?? (options?.action ? 6000 : 3200))
    },
    [dismiss],
  )
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-bottom,1rem)] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-[var(--toast-bottom,1.5rem)]">
        {items.map((it) => (
          <div
            key={it.id}
            role={it.tone === 'error' ? 'alert' : undefined}
            className="toast-in glass-pop pointer-events-auto flex max-w-[min(560px,100%)] items-center gap-2.5 rounded-full py-2.5 ps-3 pe-4 text-[0.875rem] font-medium text-ink"
          >
            {TOAST_ICON[it.tone]}
            <span className="min-w-0">{it.text}</span>
            {it.action && (
              <button
                type="button"
                onClick={() => {
                  it.action!.onClick()
                  dismiss(it.id)
                }}
                className="pressable -me-1.5 ms-1 shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[0.8125rem] font-semibold text-primary-strong"
              >
                {it.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
