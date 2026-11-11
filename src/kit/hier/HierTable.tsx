import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, ListTree } from 'lucide-react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { BlockChartCtx } from '@/features/blockedit/context'
import { DataTable, type Column } from '@/kit/DataTable'
import { buildTree, cleanLevels, openablePaths, topOf, visibleNodes, type HierDim, type HierNode } from './tree'

/**
 * A page table that can be nested (DataLens style): flat as the page made it until its block gets a hierarchy
 * (table.levels — the zoomed editor's "Ierarxiya" or Nova), then the page's records are grouped level by level and each
 * group's row is made by the page's own row maker (`make`), so the page's columns (counts, rates) work on every level
 * unchanged. Rows with children open with › ; "Hammasini ochish / yopish"; Jami stays the grand total (top rows only).
 * The table sorts by its top-level values, so children always stay right under their parent.
 */
export interface HierRow<R> {
  node: HierNode<R>
}

export function HierTable<T, R extends object>({
  records,
  dims,
  make,
  rows: flatRows,
  columns,
  rowKey,
  onRow,
  numbered,
  maxHeight,
}: {
  records: T[]
  /** the breakdowns, the table's own first (it is always level 1) */
  dims: HierDim<T>[]
  /** a row from a group's records — the same maker the flat table's rows come from */
  make: (key: string, records: T[], dim: HierDim<T>) => R
  /** the table as the page shows it without a hierarchy */
  rows: R[]
  columns: Column<R>[]
  rowKey: (row: R, i: number) => string
  /** a click on a row without children (a flat row, or the last level) */
  onRow?: (row: R, path: string[]) => void
  numbered?: boolean
  maxHeight?: number
}) {
  const { t } = useT()
  const block = useContext(BlockChartCtx)
  const reportHier = block?.reportHier
  const base = dims[0]!.key
  const dimKeys = dims.map((d) => d.key).join(',')
  const dimInfo = JSON.stringify({ base, dims: dims.map((d) => ({ key: d.key, label: t(d.label) })) })
  useEffect(() => {
    if (reportHier) reportHier(JSON.parse(dimInfo) as { base: string; dims: { key: string; label: string }[] })
  }, [reportHier, dimInfo])

  const levels = useMemo(() => cleanLevels(block?.table?.levels, base, dimKeys.split(',')), [block?.table?.levels, base, dimKeys])
  const levelDims = useMemo(() => levels.map((k) => dims.find((d) => d.key === k)!), [levels, dims])
  const tops = useMemo(() => (levels.length ? buildTree(records, levelDims, make) : []), [levels, records, levelDims, make])
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  // a new hierarchy starts closed
  const levelsKey = levels.join('>')
  useEffect(() => setOpen(new Set()), [levelsKey])
  const openable = useMemo(() => openablePaths(tops), [tops])
  const allOpen = openable.length > 0 && openable.every((p) => open.has(p))
  const shown = useMemo(() => visibleNodes(tops, open), [tops, open])

  // node rows: the page's row plus the node; columns read the row, sort by the top-level row
  type N = R & HierRow<R>
  const nodeRows = useMemo<N[]>(() => shown.map((n) => ({ ...n.row, node: n }) as N), [shown])
  const hierColumns = useMemo<Column<N>[]>(() => {
    if (!levels.length) return []
    return columns.map((c, i) => {
      const own = (r: N) => c.value(r)
      const text = (r: N) => {
        const v = own(r)
        return v === null ? '—' : typeof v === 'number' && c.format ? c.format(v) : String(v)
      }
      if (i === 0)
        return {
          ...c,
          value: (r: N) => c.value(topOf(r.node).row),
          total: undefined,
          render: (r: N) => {
            const n = r.node
            const dim = levelDims[n.depth]!
            const name: ReactNode = n.depth === 0 && c.render ? c.render(r) : dim.title ? dim.title(n.key) : t(n.key)
            return (
              <span className={cx('flex items-center gap-1.5 whitespace-nowrap', n.depth > 0 && 'text-[0.8125rem] font-normal text-ink-2')} style={{ paddingInlineStart: n.depth * 20 }}>
                {n.kids.length ? (
                  <ChevronRight size={14} className={cx('shrink-0 text-ink-3 transition-transform rtl:rotate-180', open.has(n.path) && '!rotate-90')} />
                ) : (
                  <span className="inline-block w-[14px] shrink-0" />
                )}
                {name}
              </span>
            )
          },
        } as Column<N>
      return {
        ...c,
        value: (r: N) => c.value(topOf(r.node).row),
        own,
        total: c.total ? (rows: N[]) => c.total!(rows.filter((r) => r.node.depth === 0)) : undefined,
        render: (r: N) => {
          const v = own(r)
          const sub = r.node.depth > 0
          if (c.onCell && typeof v === 'number' && v > 0)
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  c.onCell!(r)
                }}
                className={cx('rounded-[6px] px-1 underline-offset-2 hover:bg-primary-soft hover:underline', sub ? 'font-medium text-ink-2' : 'font-semibold text-primary-strong')}
              >
                {text(r)}
              </button>
            )
          return <span className={sub ? 'text-ink-2' : undefined}>{text(r)}</span>
        },
      } as Column<N>
    })
  }, [columns, levels, levelDims, open, t])

  if (!levels.length) return <DataTable columns={columns} rows={flatRows} rowKey={rowKey} numbered={numbered} maxHeight={maxHeight} onRow={onRow ? (r) => onRow(r, []) : undefined} />

  const toggle = (p: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(p)) {
        // closing a row closes everything under it
        for (const k of [...n]) if (k === p || k.startsWith(`${p}|`)) n.delete(k)
      } else n.add(p)
      return n
    })
  const path = levels.map((k) => t(dims.find((d) => d.key === k)!.label)).join(' → ')
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 sm:px-5" data-hier={levels.join('>')}>
        <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-ink-3">
          <ListTree aria-hidden size={14} className="shrink-0" />
          <span className="truncate">{path}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(openable))}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.75rem] font-medium text-primary-strong hover:bg-primary-soft"
        >
          {allOpen ? <ChevronsDownUp aria-hidden size={13} /> : <ChevronsUpDown aria-hidden size={13} />}
          {t(allOpen ? 'Hammasini yopish' : 'Hammasini ochish')}
        </button>
      </div>
      <DataTable
        columns={hierColumns}
        rows={nodeRows}
        rowKey={(r) => r.node.path}
        // comparison bars / ranks compare rows of the same level only
        level={(r) => r.node.depth}
        numbered={numbered}
        maxHeight={maxHeight ?? 640}
        onRow={(r) => {
          if (r.node.kids.length) toggle(r.node.path)
          else onRow?.(r, r.node.path.split('|'))
        }}
      />
    </>
  )
}
