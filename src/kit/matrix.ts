/**
 * A rows × columns count matrix (Mas'ul × bosqich, Mas'ul × sabab) as the columns of the standard table (kit/DataTable):
 * the row name first (it stays first), then the row's total, then one column per stage / reason. So the matrix gets what
 * every dashboard table has — header drag left / right and edge resize (coldrag.ts), the editor's column chips, hide /
 * rename / order / widths / colours / bars + rank in the block's table patch, sorting by a header, the chart pencil.
 * The total column is an ordinary column: it can be moved and hidden like a stage. The keys are stable across periods:
 * a stage's key is its own (Uzbek) name, so an order saved for "Lokatsiya yuborildi" still holds next month.
 */

/** the row-name column's key (always the first column) */
export const MATRIX_ROW = 'row'
/** the row-total column's key */
export const MATRIX_TOTAL = 'total'

export type MatrixKind = 'row' | 'total' | 'cell'

export interface MatrixCol {
  key: string
  /** an Uzbek key (the table translates it) */
  label: string
  kind: MatrixKind
  /** the column's stage / reason (cells only) */
  col?: string
  value: (row: string) => string | number
  total?: (rows: string[]) => number
}

export interface MatrixInput {
  rows: string[]
  cols: string[]
  get: (row: string, col: string) => number
  rowLabel: string
  totalLabel: string
}

/** the matrix's columns: row name, total, then the stages / reasons in the page's own order */
export function matrixColumns({ cols, get, rowLabel, totalLabel }: MatrixInput): MatrixCol[] {
  const rowTotal = (r: string) => cols.reduce((s, c) => s + get(r, c), 0)
  // a stage that happens to be called "row" / "total" must not take the fixed columns' keys
  const keyOf = (c: string) => (c === MATRIX_ROW || c === MATRIX_TOTAL ? `col:${c}` : c)
  return [
    { key: MATRIX_ROW, label: rowLabel, kind: 'row', value: (r) => r },
    { key: MATRIX_TOTAL, label: totalLabel, kind: 'total', value: rowTotal, total: (rows) => rows.reduce((s, r) => s + rowTotal(r), 0) },
    ...cols.map<MatrixCol>((c) => ({
      key: keyOf(c),
      label: c,
      kind: 'cell',
      col: c,
      value: (r) => get(r, c),
      total: (rows) => rows.reduce((s, r) => s + get(r, c), 0),
    })),
  ]
}

/** the biggest cell (at least 1), the heat tint's top */
export const matrixMax = ({ rows, cols, get }: Pick<MatrixInput, 'rows' | 'cols' | 'get'>) => Math.max(1, ...rows.flatMap((r) => cols.map((c) => get(r, c))))

/** a cell's heat tint strength (0 = no tint for an empty cell), as before: 0.06 … 0.46 */
export const heatAlpha = (v: number, max: number) => (v > 0 ? 0.06 + (Math.min(v, max) / Math.max(1, max)) * 0.4 : 0)
