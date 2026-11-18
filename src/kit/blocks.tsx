import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { fmtNum, fmtPct } from '@/lib/format'
import { Card } from '@/ui/controls'
import { Segmented, type TileColor } from '@/ui/glass'
import { Sheet } from '@/ui/overlay'
import { DataTable, type Column } from './DataTable'
import { HeatMatrix } from './HeatMatrix'
import { crmUrl, openCrm, type CrmKind } from '@/data/crmLink'
import { useMeta } from '@/data/source'
import { useBlockViews, VIEW_KEEP } from '@/features/blockedit/views'

/** Card with switchable tabs in the header (e.g. "Lid va konversiya": Mas'ul | Manba | Bosqich | Sana). */
export function TabsCard<T extends string>({
  title,
  subtitle,
  icon,
  tile,
  tabs,
  children,
  initial,
  flush = true,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  tile?: TileColor
  tabs: { value: T; label: string }[]
  initial?: T
  children: (tab: T) => ReactNode
  flush?: boolean
}) {
  const { t } = useT()
  const [tab, setTab] = useState<T>(initial ?? tabs[0]!.value)
  const own = { value: tab, set: setTab }
  return (
    <Card title={t(title)} uz={title} subtitle={subtitle ? t(subtitle) : undefined} icon={icon} tile={tile} flush={flush} dense actions={<TabsSeg title={title} tabs={tabs} own={own} />}>
      <TabsBody tabs={tabs} own={own} render={children} />
    </Card>
  )
}

/** a TabsCard's switcher as the block's edit shows its views (blockedit/views.ts); it keeps working in edit mode */
function TabsSeg<T extends string>({ title, tabs, own }: { title: string; tabs: { value: T; label: string }[]; own: { value: T; set: (v: T) => void } }) {
  const { t } = useT()
  const v = useBlockViews(tabs.map((x) => ({ value: x.value, label: t(x.label) })), own)
  if (v.options.length < 2) return null
  return (
    <div {...VIEW_KEEP}>
      <Segmented<T> size="xs" label={t(title)} value={v.value} onChange={v.setValue} options={v.options} />
    </div>
  )
}

function TabsBody<T extends string>({ tabs, own, render }: { tabs: { value: T; label: string }[]; own: { value: T; set: (v: T) => void }; render: (tab: T) => ReactNode }) {
  const { t } = useT()
  const v = useBlockViews(tabs.map((x) => ({ value: x.value, label: t(x.label) })), own)
  return <>{render(v.value)}</>
}

/** Rows × columns count matrix with heat tint (e.g. "Lid mas'ullar kesimida": Mas'ul × bosqich), drawn by the standard
 * table (HeatMatrix): its stages move, size, hide and rename like any dashboard table's columns. */
export function Matrix({
  rows,
  cols,
  get,
  rowLabel,
  onCell,
  totalLabel = 'Umumiy',
}: {
  rows: string[]
  cols: string[]
  get: (row: string, col: string) => number
  rowLabel: string
  onCell?: (row: string, col: string | null) => void
  totalLabel?: string
}) {
  return <HeatMatrix rows={rows} cols={cols} get={get} rowLabel={rowLabel} totalLabel={totalLabel} onCell={onCell} renderRow={(r) => r} />
}

/** "# | SABAB | SONI | ULUSHI" with share bars (Bekor bo'lish / Sifatsiz sabablari). */
export function ReasonList({ items, onItem }: { items: { reason: string; count: number }[]; onItem?: (reason: string) => void }) {
  const { t, lang } = useT()
  const total = items.reduce((s, x) => s + x.count, 0)
  const sorted = [...items].sort((a, b) => b.count - a.count)
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2 text-[0.75rem] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        <span>{t('Sabab')}</span>
        <span>
          {t('Jami')}: <span className="num text-ink">{fmtNum(total, 0, lang)}</span>
        </span>
      </div>
      {sorted.map((x, i) => (
        <button key={x.reason} type="button" disabled={!onItem} onClick={() => onItem?.(x.reason)} className="group flex items-center gap-3 rounded-[12px] px-1 py-2 text-start hover:bg-surface-2">
          <span className="num w-5 text-[0.75rem] text-ink-3">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 text-[0.875rem]">
              <span className="truncate text-ink">{t(x.reason)}</span>
              <span className="num shrink-0 font-semibold text-ink">
                {fmtNum(x.count, 0, lang)} <span className="ms-1 font-normal text-ink-3">{fmtPct(total ? x.count / total : 0, 1, lang)}</span>
              </span>
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-[var(--primary)] transition-[width] duration-700" style={{ width: `${total ? (x.count / sorted[0]!.count) * 100 : 0}%` }} />
            </span>
          </span>
        </button>
      ))}
      {!sorted.length && <p className="py-6 text-center text-[0.875rem] text-ink-3">{t("Tanlangan davrda ma'lumot yo'q")}</p>}
    </div>
  )
}

/** Drill-down: the records behind any number, in a side sheet. */
export interface Drill<R> {
  title: string
  subtitle?: string
  rows: R[]
  columns: Column<R>[]
  rowKey: (r: R, i: number) => string
  /** rows are leads or deals: a click opens the record in the portal (live projects only) */
  crm?: { kind: CrmKind; id: (r: R) => number | string | null | undefined }
}

export function DrillSheet<R>({ drill, onClose }: { drill: Drill<R> | null; onClose: () => void }) {
  const { t, lang } = useT()
  const portal = useMeta().portalUrl
  const crm = drill?.crm && portal ? drill.crm : null
  return (
    <Sheet open={!!drill} onOpenChange={(v) => !v && onClose()} width={820} title={drill ? t(drill.title) : ''} subtitle={drill ? `${drill.subtitle ? `${t(drill.subtitle)} · ` : ''}${t('{n} ta yozuv', { n: fmtNum(drill.rows.length, 0, lang) })}` : undefined}>
      {drill && (
        <div className="px-2 pb-4">
          <DataTable
            columns={drill.columns}
            rows={drill.rows.slice(0, 300)}
            rowKey={drill.rowKey}
            totals={false}
            numbered
            onRow={crm ? (r) => openCrm(crmUrl(portal, crm.kind, crm.id(r))) : undefined}
          />
        </div>
      )}
    </Sheet>
  )
}

/** Small helper to show a ratio as a %. */
export const ratio = (a: number, b: number) => (b ? a / b : 0)
