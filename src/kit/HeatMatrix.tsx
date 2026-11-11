import { useContext, useMemo, type ReactNode } from 'react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'
import { fmtNum } from '@/lib/format'
import { DataTable, type Column } from './DataTable'
import { heatAlpha, matrixColumns, matrixMax } from './matrix'
import { BlockChartCtx } from '@/features/blockedit/context'

/**
 * Rows × columns count matrix with heat tint (Mas'ul × bosqich, Mas'ul × sabab), drawn by the standard table
 * (kit/DataTable, columns from matrix.ts): inside a dashboard block its stages can be dragged left / right, sized, hidden,
 * renamed, coloured and given bars + rank like any table's columns, and the zoomed editor lists them as chips. The row
 * name stays first; the total column moves like a stage. `wrap`: the stage headers wrap onto two lines (all eight lead
 * stages fit a desktop card).
 */
export function HeatMatrix({
  rows,
  cols,
  get,
  rowLabel,
  totalLabel,
  onCell,
  renderRow,
  wrap,
}: {
  rows: string[]
  cols: string[]
  get: (row: string, col: string) => number
  rowLabel: string
  totalLabel: string
  onCell?: (row: string, col: string | null) => void
  /** the row name's own look (e.g. with an avatar); default its (translated) name */
  renderRow?: (row: string) => ReactNode
  wrap?: boolean
}) {
  const { t, lang } = useT()
  const max = matrixMax({ rows, cols, get })
  // the heat tint is the table's first style: a column given bars, a line or its own colour (Jadval uslubi) drops it
  const table = useContext(BlockChartCtx)?.table
  const styled = JSON.stringify([table?.colRules ?? null, table?.colColors ?? null])
  const num = (v: number) => fmtNum(v, 0, lang)
  const columns = useMemo<Column<string>[]>(
    () =>
      matrixColumns({ rows, cols, get, rowLabel, totalLabel }).map((m): Column<string> => {
        if (m.kind === 'row') return { key: m.key, label: m.label, value: m.value, render: (r) => (renderRow ? renderRow(r) : t(r)) }
        const head = wrap ? '!whitespace-normal !px-1.5 align-bottom leading-tight min-w-[64px]' : 'whitespace-nowrap'
        if (m.kind === 'total')
          return {
            key: m.key,
            label: m.label,
            align: 'end',
            value: m.value,
            total: m.total,
            format: num,
            headClass: head,
            cellClass: 'font-bold !px-1.5',
            onCell: onCell ? (r) => onCell(r, null) : undefined,
            render: (r) => (
              <button type="button" disabled={!onCell} onClick={() => onCell?.(r, null)} className="rounded-[6px] px-1 hover:bg-primary-soft">
                {num(Number(m.value(r)))}
              </button>
            ),
          }
        return {
          key: m.key,
          label: m.label,
          align: 'end',
          value: m.value,
          total: m.total,
          format: num,
          headClass: cx(head, wrap && 'max-w-[104px]'),
          cellClass: '!px-1 !py-1',
          heat: true,
          onCell: onCell ? (r) => onCell(r, m.col!) : undefined,
          render: (r) => {
            const v = Number(m.value(r))
            const heat = !!v && !table?.colRules?.[m.key] && !table?.colColors?.[m.key]
            return (
              <button
                type="button"
                disabled={!v || !onCell}
                onClick={() => onCell?.(r, m.col!)}
                className={cx('relative w-full rounded-[8px] px-2 py-1 text-end', v ? 'text-ink hover:ring-1 hover:ring-[var(--primary)]' : 'text-ink-3')}
                style={{ background: heat ? `rgb(var(--accent-rgb) / calc(${heatAlpha(v, max)} * var(--heat-boost, 1)))` : undefined }}
              >
                {v ? num(v) : '·'}
              </button>
            )
          },
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `styled` is the table's column looks
    [rows, cols, max, rowLabel, totalLabel, wrap, lang, t, get, onCell, renderRow, styled],
  )
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r} numbered />
}
