import { createContext, useContext, useMemo } from 'react'
import { sourceName, sourcesOfTables, type SourceRef, type TableSources } from '@/features/livefilters/sources'
import type { TableName } from '@/features/livefilters/fields'
import { cx } from '@/lib/cx'
import { getSource } from '@/features/projects/sources'
import type { SourceId } from '@/features/projects/types'
import { Tooltip } from '@/ui/overlay'

/**
 * The connected systems a dashboard block's numbers come from (owner, 2026-11-11: "the source should be cited"): each KPI
 * card, chart and table shows the systems' small marks in its corner, the name on hover. A page names the tables its blocks
 * read (PAGE_TABLES, set once by PageBody); a block that reads others passes its own `tables` (Card / StatCard).
 */
export interface BlockSourcesValue {
  ts: TableSources
  tables: readonly TableName[]
}

export const BlockSourcesCtx = createContext<BlockSourcesValue | null>(null)

/** the tables each dashboard page's blocks read, unless a block says otherwise */
export const PAGE_TABLES: Readonly<Record<string, readonly TableName[]>> = {
  lead: ['leads'],
  deal: ['deals'],
  calls: ['calls'],
  kampaniyalar: ['ads', 'campaigns'],
  hisobot: ['leads', 'deals', 'ads'],
  reja: ['deals'],
  taqsimot: ['leads'],
  chatlar: ['conversations'],
  savdo: ['orders'],
}

/** the systems of a block: its own tables, else its page's; nothing outside a dashboard page */
export function useBlockSources(tables?: readonly TableName[]): SourceRef[] {
  const ctx = useContext(BlockSourcesCtx)
  return useMemo(() => (ctx ? sourcesOfTables(ctx.ts, tables ?? ctx.tables) : []), [ctx, tables])
}

const MAX = 3

/**
 * A system's flat mark at text size: its colour and white sign. Not ConnectorGlyph's `.icon-tile`, which the KPI looks
 * resize and wiggle (looks.css / blockedit.css style every `.icon-tile` inside a KPI card).
 */
export function SourceGlyph({ kind, size = 16, className }: { kind: SourceId; size?: number; className?: string }) {
  const s = getSource(kind)
  return (
    <span
      aria-hidden
      className={cx('inline-grid shrink-0 place-items-center leading-none font-extrabold', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: s.color,
        color: s.ink ?? '#fff',
        fontSize: s.mark.kind === 'text' ? size * (s.mark.text.length > 2 ? 0.34 : 0.46) : undefined,
        letterSpacing: '-0.04em',
      }}
    >
      {s.mark.kind === 'icon' ? <s.mark.icon size={Math.round(size * 0.62)} strokeWidth={2.4} /> : s.mark.text}
    </span>
  )
}

/** the systems' marks in a row (3 at most, then «+n»), each with its name on hover; nothing when there are none */
export function SourceMark({ sources, size = 16, className }: { sources: readonly SourceRef[]; size?: number; className?: string }) {
  if (!sources.length) return null
  const names = sources.map((s) => (s.name ? `${sourceName(s.kind)} · ${s.name}` : sourceName(s.kind)))
  const shown = sources.slice(0, MAX)
  const more = sources.length - shown.length
  return (
    <span data-source-mark role="img" aria-label={names.join(', ')} className={cx('inline-flex shrink-0 items-center gap-[3px]', className)}>
      {shown.map((s, i) => (
        <Tooltip key={s.kind} content={names[i]}>
          <span data-source={s.kind} className="inline-flex opacity-90 transition-opacity hover:opacity-100">
            <SourceGlyph kind={s.kind} size={size} />
          </span>
        </Tooltip>
      ))}
      {more > 0 && (
        <Tooltip content={names.slice(MAX).join(', ')}>
          <span className="num text-[0.6875rem] font-semibold text-ink-3">+{more}</span>
        </Tooltip>
      )}
    </span>
  )
}

/** a block's marks from its tables (or its page's) */
export function BlockSourceMark({ tables, className }: { tables?: readonly TableName[]; className?: string }) {
  const sources = useBlockSources(tables)
  return <SourceMark sources={sources} className={className} />
}
