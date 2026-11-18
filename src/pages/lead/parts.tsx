import { useState } from 'react'
import { Globe, Phone, Radio, Send, UserPlus, type LucideProps } from 'lucide-react'
import { useT } from '@/i18n'
import { fmtNum } from '@/lib/format'
import { Button } from '@/ui/controls'
import { Avatar } from '@/ui/glass'
import { Sheet } from '@/ui/overlay'
import { DataTable, type Column } from '@/kit/DataTable'
import { HeatMatrix } from '@/kit/HeatMatrix'
import type { Lead } from '@/data/types'
import { crmUrl, openCrm } from '@/data/crmLink'
import { useMeta } from '@/data/source'

/* ── Name with avatar (Mas'ul cells) ─────────────────────────────────────────────────────────────── */

export function NameCell({ name, hue, size = 24 }: { name: string; hue?: number; size?: number }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <Avatar name={name} size={size} hue={hue} />
      {name}
    </span>
  )
}

/* ── Per-channel source icon (data365 MANBA column) ──────────────────────────────────────────────── */

/** lucide 1.x has no brand glyphs, so Instagram / Facebook are drawn here in the same stroke style. */
function InstagramIcon({ size = 14, className }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}
function FacebookIcon({ size = 14, className }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
const SOURCE_ICON: Record<string, (p: LucideProps) => React.ReactNode> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  Telegram: Send,
  'Veb-sayt': Globe,
  Tavsiya: UserPlus,
  "Qo'ng'iroq": Phone,
}
export function SourceIcon({ source }: { source: string }) {
  const Icon = SOURCE_ICON[source] ?? Radio
  return <Icon size={14} className="shrink-0 text-ink-3" />
}

/* ── Matrix with wrapping headers + avatar names ─────────────────────────────────────────────────── */

/**
 * Rows × columns count matrix (kit HeatMatrix, the standard table underneath: stages dragged left / right, sized, hidden,
 * renamed like any dashboard table's columns), with the stage headers wrapping onto two lines so all eight lead stages
 * fit a desktop card, and the sticky row name can carry an avatar.
 */
export function LeadMatrix({
  rows,
  cols,
  get,
  rowLabel,
  totalLabel,
  onCell,
  hue,
}: {
  rows: string[]
  cols: string[]
  get: (row: string, col: string) => number
  rowLabel: string
  totalLabel: string
  onCell: (row: string, col: string | null) => void
  /** when given, the row names render with an avatar */
  hue?: Map<string, number>
}) {
  const { t } = useT()
  return (
    <HeatMatrix
      rows={rows}
      cols={cols}
      get={get}
      rowLabel={rowLabel}
      totalLabel={totalLabel}
      onCell={onCell}
      wrap
      renderRow={(r) => (hue ? <NameCell name={r} hue={hue.get(r)} /> : t(r))}
    />
  )
}

/* ── Lead drill sheet, paged ("Yana N ta yuklash", PG LeadsDrilldown) ─────────────────────────────── */

export interface LeadDrillState {
  /** Uzbek key, translated once here — unless `literal` (manager names, dates, UTM values) */
  title: string
  literal?: boolean
  subtitle?: string
  rows: Lead[]
  columns: Column<Lead>[]
}

const PAGE = 300

export function LeadDrill({ drill, onClose }: { drill: LeadDrillState | null; onClose: () => void }) {
  const { t, lang } = useT()
  const n = drill?.rows.length ?? 0
  return (
    <Sheet
      open={!!drill}
      onOpenChange={(v) => !v && onClose()}
      width={820}
      title={drill ? (drill.literal ? drill.title : t(drill.title)) : ''}
      subtitle={drill ? `${drill.subtitle ? `${t(drill.subtitle)} · ` : ''}${t('{n} ta yozuv', { n: fmtNum(n, 0, lang) })}` : undefined}
    >
      {drill && <DrillBody key={`${drill.title}|${drill.subtitle}|${n}`} drill={drill} />}
    </Sheet>
  )
}

function DrillBody({ drill }: { drill: LeadDrillState }) {
  const { t, lang } = useT()
  const portal = useMeta().portalUrl
  const [shown, setShown] = useState(PAGE)
  const n = drill.rows.length
  const rest = Math.max(0, n - shown)
  return (
    <div className="px-2 pb-4">
      <DataTable
        columns={drill.columns}
        rows={drill.rows.slice(0, shown)}
        rowKey={(l) => String(l.id)}
        totals={false}
        numbered
        onRow={portal ? (l) => openCrm(crmUrl(portal, 'lead', l.id)) : undefined}
      />
      {n > PAGE && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
          <span className="text-[0.8125rem] text-ink-3">{t("{a} / {b} ko'rsatildi", { a: fmtNum(Math.min(shown, n), 0, lang), b: fmtNum(n, 0, lang) })}</span>
          {rest > 0 && (
            <Button size="sm" onClick={() => setShown((s) => s + PAGE)}>
              {t('Yana {n} ta yuklash', { n: fmtNum(Math.min(PAGE, rest), 0, lang) })}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
