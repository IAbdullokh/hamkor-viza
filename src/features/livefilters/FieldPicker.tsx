import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, EyeOff, LoaderCircle, RotateCcw, Search, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { Button } from '@/ui/controls'
import { Checkbox } from '@/ui/form'
import { useLiveFilters } from './ctx'
import { isBuiltin, type FieldDef } from './fields'
import { allSelected, columnsFor, pickerSections, planApply, selectAll, standardTicks, toColumns, type Entities, type PickerRow } from './picker'
import { fillErrorText, inFlight, missingRows, type MissingRow, type PortalField } from './portal'

/**
 * «Filtr maydonlari» (owner, 2026-11-09, Bitrix's «Настройка полей фильтра» as the model): a wide solid window — the search
 * at the top left, the «Lid» / «Sdelka» chips at the top right (each shows or hides its section), then every field the
 * page can be filtered by as columns of checkboxes (4 on a desktop, 2 on a tablet, 1 on a phone), full names. The page's
 * filters come ticked. A field the data does not hold yet carries a quiet ⬇; ticked, «Qo'llash» starts reading it and it
 * becomes a filter once its data is in (FilterScope). Picker logic: picker.ts.
 */
export function FieldPicker() {
  const lf = useLiveFilters()!
  const { t } = useT()
  return (
    <Dialog.Root open={lf.picker} onOpenChange={lf.setPicker}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[60] bg-[rgb(12_14_20/0.4)]" />
        <Dialog.Content
          data-field-picker
          aria-describedby={undefined}
          className="modal-in fixed start-1/2 top-1/2 z-[61] flex max-h-[min(860px,92dvh)] w-[calc(100vw-16px)] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-line bg-surface-solid shadow-[var(--shadow-pop)] focus:outline-none sm:w-[calc(100vw-32px)]"
          onOpenAutoFocus={(e) => {
            // the search, not the close button
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
          }}
        >
          {lf.picker && <Body onClose={() => lf.setPicker(false)} />}
          <Dialog.Close className="pressable absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={t('Yopish')}>
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** the window's columns at this width (picker.ts columnsFor) */
function useColumns(): number {
  const [n, setN] = useState(() => (typeof window === 'undefined' ? 4 : columnsFor(window.innerWidth)))
  useEffect(() => {
    const on = () => setN(columnsFor(window.innerWidth))
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return n
}

function Body({ onClose }: { onClose: () => void }) {
  const lf = useLiveFilters()!
  const { t } = useT()
  const label = (f: FieldDef) => (f.literal ? f.label : t(f.label))
  const shown = lf.items.map((i) => i.field)
  const hiddenNow = lf.hidden.map((i) => i.field)
  const waitingKeys = lf.waiting.map((w) => w.key)
  const [q, setQ] = useState('')
  const [entities, setEntities] = useState<Entities>({ lead: true, deal: true })
  const [ticked, setTicked] = useState<string[]>(() => [...new Set([...shown, ...hiddenNow, ...waitingKeys])])
  const [asHidden, setAsHidden] = useState(false)
  const cols = useColumns()

  const portal = lf.portal
  const have = useMemo(() => new Set(lf.fields.map((f) => f.key)), [lf.fields])
  const missing = useMemo(
    () => (portal?.data?.available ? missingRows(portal.data.fields, portal.known, have, portal.jobs, portal.refused) : []),
    [portal?.data, portal?.known, portal?.jobs, portal?.refused, have],
  )
  // a field waiting for its data that the server no longer lists (read, the reload not in yet) still shows ticked
  const rows = useMemo(() => {
    const seen = new Set(missing.map((m) => m.key))
    const extra: MissingRow[] = lf.waiting
      .filter((w) => !seen.has(w.key) && !have.has(w.key))
      .map((w) => ({ key: w.key, field: w.field, state: 'ready', progress: 1 }))
    return [...missing, ...extra]
  }, [missing, lf.waiting, have])
  const sections = pickerSections(lf.fields, q, label, rows, entities)
  const hasEntity = { lead: lf.fields.some((f) => f.group === 'lead') || rows.some((m) => m.field.entity === 'lead'), deal: lf.fields.some((f) => f.group === 'deal') || rows.some((m) => m.field.entity === 'deal') }

  // rows this person cannot change here: the page's own filters, hidden ones outside a Studio editor's reach
  const taken = new Set([...shown, ...hiddenNow])
  const builtin = (k: string) => !taken.has(k) && isBuiltin(lf.page, k)
  const locked = new Set<string>([
    ...sections.flatMap((s) => s.rows.map((r) => r.key)).filter(builtin),
    ...(lf.hideable ? [] : hiddenNow),
  ])
  const lockedOn = lf.hideable ? [] : hiddenNow
  const toggle = (k: string) => setTicked((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))
  const everyone = allSelected(ticked, sections, locked)

  const missingByKey = useMemo(() => new Map<string, PortalField>(rows.map((m) => [m.key, m.field])), [rows])
  const plan = planApply({
    shown,
    hidden: hiddenNow,
    waiting: waitingKeys,
    ticked,
    asHidden,
    hideable: lf.hideable,
    missing: missingByKey,
    reading: inFlight(rows),
  })
  const standard = standardTicks(lf.defaultSet, lockedOn)
  const atStandard = standard.length === ticked.length && standard.every((k) => ticked.includes(k))
  const apply = () => {
    onClose()
    void lf.applyPicker(plan)
  }

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-line px-4 pt-4 pb-3 sm:px-5">
        <Dialog.Title className="pe-10 text-[1.125rem] font-bold tracking-[-0.01em] text-ink">{t('Filtr maydonlari')}</Dialog.Title>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 basis-[260px] items-center gap-2 rounded-[10px] border border-line bg-surface-solid px-3 focus-within:ring-2 focus-within:ring-[rgb(var(--accent-rgb)/0.35)] sm:max-w-[420px]">
            <Search size={15} className="shrink-0 text-ink-3" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Maydonni qidirish')}
              aria-label={t('Maydonni qidirish')}
              className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <div className="ms-auto flex items-center gap-1.5" role="group" aria-label={t("Bo'limlar")}>
            {(['lead', 'deal'] as const)
              .filter((e) => hasEntity[e])
              .map((e) => (
                <button
                  key={e}
                  type="button"
                  data-entity-chip={e}
                  aria-pressed={entities[e]}
                  onClick={() => setEntities((x) => ({ ...x, [e]: !x[e] }))}
                  className={cx(
                    'pressable inline-flex min-h-[34px] items-center rounded-full border px-3.5 text-[0.875rem] font-semibold',
                    entities[e] ? 'border-transparent bg-primary-fill text-white' : 'border-line text-ink-2 hover:bg-surface-2',
                  )}
                >
                  {e === 'lead' ? t('Lid') : t('Sdelka')}
                </button>
              ))}
          </div>
        </div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5" role="group" aria-label={t('Filtr maydonlari')}>
        {sections.map((s) => (
          <section key={s.id} data-section={s.id} className="pb-4">
            <h3 className="mb-1.5 flex items-baseline gap-2 border-b border-line pb-1.5 text-[0.8125rem] font-semibold text-ink-2">
              {t(s.label)}
              <span className="num text-[0.75rem] font-medium text-ink-3">{s.rows.length}</span>
            </h3>
            <div className="grid gap-x-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {toColumns(s.rows, cols).map((col, i) => (
                <div key={i} className="flex min-w-0 flex-col">
                  {col.map((r) => (
                    <FieldRow
                      key={r.key}
                      row={r}
                      on={ticked.includes(r.key)}
                      builtin={builtin(r.key)}
                      hidden={hiddenNow.includes(r.key)}
                      locked={locked.has(r.key)}
                      onToggle={() => toggle(r.key)}
                      onRetry={r.missing ? () => lf.retryFill(r.missing!.field) : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
        {!sections.length && <p className="py-6 text-center text-[0.875rem] text-ink-3">{t('Hech narsa topilmadi')}</p>}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
        <Button size="sm" variant="ghost" data-select-all onClick={() => setTicked((x) => selectAll(x, sections, locked))} disabled={!sections.length}>
          {everyone ? t('Tanlovni olib tashlash') : t('Hammasini tanlash')}
        </Button>
        <div className="order-last flex w-full items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-1">
          <Button size="sm" variant="primary" data-apply onClick={apply}>
            {t("Qo'llash")}
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            {t('Bekor qilish')}
          </Button>
        </div>
        <div className="ms-auto flex items-center gap-1 sm:ms-0">
          {lf.hideable && (
            <button
              type="button"
              role="switch"
              aria-checked={asHidden}
              onClick={() => setAsHidden((h) => !h)}
              title={t("Yashirin filtr — mijozlar ko'rmaydi")}
              className={cx(
                'pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium',
                asHidden ? 'bg-primary-soft text-primary-strong' : 'text-ink-2 hover:bg-surface-2',
              )}
            >
              <EyeOff size={15} aria-hidden />
              {t('Yashirin')}
            </button>
          )}
          <Button size="sm" variant="ghost" icon={RotateCcw} data-standard disabled={atStandard} onClick={() => setTicked(standard)}>
            {t('Standart')}
          </Button>
        </div>
      </footer>
    </>
  )
}

/**
 * One field: its checkbox and full name (wrapping, never cut; the name in a tooltip too) and quiet marks — ⬇ not read
 * yet, «Qiymatsiz», 👁 hidden, «Sahifada bor» — and, for one being read, its state (a failed read with its reason and ↻).
 */
function FieldRow({
  row,
  on,
  builtin,
  hidden,
  locked,
  onToggle,
  onRetry,
}: {
  row: PickerRow
  on: boolean
  builtin: boolean
  hidden: boolean
  locked: boolean
  onToggle: () => void
  onRetry?: () => void
}) {
  const { t } = useT()
  const m = row.missing
  const note = builtin ? t('Sahifada bor') : m ? <MissingNote m={m} /> : row.empty ? t('Qiymatsiz') : null
  return (
    <div data-field={row.key} data-state={m?.state} title={row.label} className="flex min-w-0 items-start gap-1 rounded-[8px] px-1.5 hover:bg-surface-2">
      <Checkbox
        checked={on}
        disabled={locked}
        onChange={onToggle}
        className="min-w-0 flex-1 [overflow-wrap:anywhere]"
        label={
          <span className={cx('inline', (builtin || (m && m.state !== 'failed')) && 'text-ink-2')}>
            {row.label}
            {/* a no-break space keeps a mark with the name's last word */}
            {((m && m.state === 'idle') || hidden) && (
              <span className="whitespace-nowrap">
                {'\u00a0'}
                {m && m.state === 'idle' && <Download size={13} role="img" aria-label={t("Ma'lumoti olinmagan")} className="ms-1 inline-block align-[-1px] text-ink-3" />}
                {hidden && <EyeOff size={13} role="img" aria-label={t('Yashirin')} className="ms-1 inline-block align-[-1px] text-ink-3" />}
              </span>
            )}
          </span>
        }
        description={note ?? undefined}
      />
      {m?.state === 'failed' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t('Qayta urinish')}
          title={t('Qayta urinish')}
          className="pressable mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-primary-strong hover:bg-primary-soft"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  )
}

function MissingNote({ m }: { m: MissingRow }) {
  const { t } = useT()
  if (m.state === 'waiting') return <span data-note="waiting">{t('Yangilanish tugagach olinadi')}</span>
  if (m.state === 'filling')
    return (
      <span className="num inline-flex items-center gap-1">
        <LoaderCircle size={12} className="animate-spin" aria-hidden />
        {t('Olinmoqda')} {Math.round(m.progress * 100)}%
      </span>
    )
  if (m.state === 'ready')
    return (
      <span className="inline-flex items-center gap-1">
        <LoaderCircle size={12} className="animate-spin" aria-hidden />
        {t('Yangilanmoqda')}
      </span>
    )
  if (m.state === 'failed') return <span className="text-danger">{t(fillErrorText(m.error))}</span>
  return null
}
