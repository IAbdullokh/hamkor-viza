import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Check, ClipboardPaste, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useT } from '@/i18n'

/**
 * Form kit for the project flow. Field wires label / hint / error to its single child control (id, aria-describedby,
 * aria-invalid), so every input below can be used bare or inside a Field.
 *
 *   <Field label={t('Loyiha nomi')} hint={t('Keyin o\'zgartirsa bo\'ladi')} error={err}>
 *     <TextInput value={name} onChange={(e) => setName(e.target.value)} icon={PencilLine} />
 *   </Field>
 *   <SecretInput value={url} onChange={(e) => setUrl(e.target.value)} onPaste={(text) => validate(text)} />
 *   <RadioCard name="mode" checked={mode === 'api'} onChange={() => setMode('api')} title="API" description="…" />
 *   <ChoiceChip pressed={on} onClick={toggle}>Instagram</ChoiceChip>
 */

const CONTROL =
  'field w-full min-h-[44px] rounded-[14px] px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none disabled:opacity-60'
const INVALID = 'border-danger! focus:shadow-[0_0_0_3px_var(--danger-soft)]'

interface ControlAria {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label?: ReactNode
  hint?: ReactNode
  /** shown instead of the hint, red, announced */
  error?: ReactNode
  /** adds "(ixtiyoriy)" after the label */
  optional?: boolean
  /** exactly one control (TextInput, SecretInput, Textarea, select …) */
  children: ReactElement<ControlAria>
  className?: string
}) {
  const { t } = useT()
  const id = useId()
  const hintId = `${id}-hint`
  const describedBy = error || hint ? hintId : undefined
  const control = isValidElement(children)
    ? cloneElement(children, { id: children.props.id ?? id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
    : children
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={children.props.id ?? id} className="text-[0.8125rem] font-semibold text-ink-2">
          {label}
          {optional && <span className="ms-1 font-normal text-ink-3">({t('ixtiyoriy')})</span>}
        </label>
      )}
      {control}
      {error ? (
        <p id={hintId} role="alert" className="rise-in text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[0.75rem] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** leading lucide icon */
  icon?: LucideIcon
  /** red border (Field sets aria-invalid; this is for bare use) */
  invalid?: boolean
  /** element at the end (unit, button) */
  trailing?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ icon: Icon, invalid, trailing, className, ...rest }, ref) {
  const bad = invalid || rest['aria-invalid'] === true
  return (
    <div className={cx('relative flex items-center', className)}>
      {Icon && <Icon aria-hidden size={17} className="pointer-events-none absolute start-3.5 text-ink-3" />}
      <input ref={ref} className={cx(CONTROL, Icon && 'ps-10', trailing ? 'pe-24' : undefined, bad && INVALID)} {...rest} aria-invalid={bad || undefined} />
      {trailing && <div className="absolute end-1.5 flex items-center gap-1">{trailing}</div>}
    </div>
  )
})

export interface SecretInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onPaste'> {
  icon?: LucideIcon
  invalid?: boolean
  /** called with the clipboard text after the paste button (or Ctrl/⌘+V) fills the field */
  onPaste?: (text: string) => void
  /** the field writes through onChange; the paste button needs the setter */
  onValue?: (text: string) => void
}

const MASK_BY_CSS = typeof CSS !== 'undefined' && CSS.supports?.('-webkit-text-security', 'disc') === true

/** Secret (webhook link, token, API key): hidden by default, reveal toggle, one-tap paste. Never stored by the kit. */
export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(function SecretInput({ onPaste, onValue, ...rest }, ref) {
  const { t } = useT()
  const [shown, setShown] = useState(false)
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) return
      onValue?.(text)
      onPaste?.(text)
    } catch {
      // permission denied: the user can still paste with the keyboard
    }
  }
  // a key is not a site password: dots drawn by CSS on a text field keep Safari / password managers from offering to
  // save it on every submit; a browser without -webkit-text-security still gets a password field
  const dots = !shown && MASK_BY_CSS
  return (
    <TextInput
      ref={ref}
      {...rest}
      type={shown || MASK_BY_CSS ? 'text' : 'password'}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      data-1p-ignore=""
      data-lpignore="true"
      data-bwignore=""
      data-form-type="other"
      style={dots ? ({ ...rest.style, WebkitTextSecurity: 'disc' } as CSSProperties) : rest.style}
      className={cx('font-mono', rest.className)}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text').trim()
        if (text && onPaste) queueMicrotask(() => onPaste(text))
      }}
      trailing={
        <>
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? t('Yashirish') : t("Ko'rsatish")}
            aria-pressed={shown}
            className="pressable grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            {shown ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
          </button>
          {canPaste && (onValue || onPaste) && (
            <button
              type="button"
              onClick={() => void paste()}
              className="pressable inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[0.75rem] font-semibold text-ink-2 hover:text-ink"
            >
              <ClipboardPaste aria-hidden size={14} />
              {t('Joylash')}
            </button>
          )}
        </>
      }
    />
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref,
) {
  const bad = invalid || rest['aria-invalid'] === true
  return <textarea ref={ref} rows={rows} className={cx(CONTROL, 'resize-y py-2.5 leading-relaxed', bad && INVALID, className)} {...rest} aria-invalid={bad || undefined} />
})

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-3 py-1', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="relative mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span
          aria-hidden
          className={cx(
            'grid h-[22px] w-[22px] place-items-center rounded-[7px] border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]',
            checked ? 'border-transparent bg-primary-fill text-white' : 'border-line-strong bg-surface',
          )}
        >
          {checked && <Check size={14} strokeWidth={3} className="pop" />}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-medium text-ink">{label}</span>
        {description && <span className="block text-[0.8125rem] text-ink-3">{description}</span>}
      </span>
    </label>
  )
}

/** A large selectable card for a single choice (native radio inside: arrows move within the same `name`). */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  badge,
  disabled,
  children,
  className,
}: {
  name: string
  value?: string
  checked: boolean
  onChange: () => void
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  disabled?: boolean
  /** extra content under the description (e.g. an estimate) */
  children?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cx(
        'panel pressable relative flex cursor-pointer gap-3 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]',
        checked && 'shadow-[inset_0_0_0_2px_var(--primary)]',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input id={id} type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      {Icon && (
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[13px]', checked ? 'bg-primary-fill text-white' : 'bg-surface-2 text-ink-2')}>
          <Icon aria-hidden size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[1rem] font-semibold text-ink">{title}</span>
          {badge}
        </span>
        {description && <span className="mt-0.5 block text-[0.875rem] text-ink-2">{description}</span>}
        {children && <span className="mt-2 block">{children}</span>}
      </span>
      <span
        aria-hidden
        className={cx('mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border', checked ? 'border-transparent bg-primary-fill text-white' : 'border-line-strong')}
      >
        {checked && <Check size={13} strokeWidth={3} className="pop" />}
      </span>
    </label>
  )
}

/** Toggle chip (multi choice) — aria-pressed; or a radio-like chip when `role="radio"` is passed with aria-checked. */
export function ChoiceChip({
  pressed,
  onClick,
  children,
  icon: Icon,
  count,
  disabled,
  className,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  icon?: LucideIcon
  /** a small number at the end (e.g. leads in this stage) */
  count?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-medium disabled:opacity-50',
        pressed ? 'bg-primary-fill text-white shadow-[0_6px_14px_-8px_var(--primary)]' : 'bg-surface-2 text-ink-2 hover:text-ink',
        className,
      )}
    >
      {pressed ? <Check aria-hidden size={14} strokeWidth={2.8} className="pop" /> : Icon ? <Icon aria-hidden size={15} /> : null}
      {children}
      {count !== undefined && <span className={cx('tabular-nums text-[0.75rem]', pressed ? 'text-white/80' : 'text-ink-3')}>{count}</span>}
    </button>
  )
}
