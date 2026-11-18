/**
 * Formula language (DataLens style). Examples:
 *
 *   COUNT_IF([Bosqich] = "won") / COUNT([ID])
 *   SUM([Summa]) / NULLIF(COUNTD([Mas'ul]), 0)
 *   IF([Manba] IN ("Instagram", "Facebook"), "Meta", "Organik")
 *   DATETRUNC([Sana], "month")
 *
 * Positions (s, e) are character offsets into the source, used for editor squiggles.
 */
export type ValueType = 'number' | 'string' | 'boolean' | 'date' | 'datetime' | 'null' | 'any'

export type BinOp = '+' | '-' | '*' | '/' | '%' | '=' | '!=' | '<' | '<=' | '>' | '>=' | 'AND' | 'OR'

export type Node =
  | { k: 'num'; v: number; s: number; e: number }
  | { k: 'str'; v: string; s: number; e: number }
  | { k: 'bool'; v: boolean; s: number; e: number }
  | { k: 'null'; s: number; e: number }
  | { k: 'date'; v: string; s: number; e: number }
  | { k: 'field'; name: string; s: number; e: number }
  | { k: 'unary'; op: '-' | 'NOT'; x: Node; s: number; e: number }
  | { k: 'bin'; op: BinOp; a: Node; b: Node; s: number; e: number }
  | { k: 'call'; fn: string; args: Node[]; s: number; e: number }
  | { k: 'in'; x: Node; list: Node[]; not: boolean; s: number; e: number }
  | { k: 'case'; whens: [Node, Node][]; else: Node | null; s: number; e: number }

export class FormulaError extends Error {
  s: number
  e: number
  /** values for {placeholders} in the message */
  vars: Record<string, string | number>
  /** `message` is Uzbek; the UI passes it through t() with `vars`. */
  constructor(message: string, s: number, e: number, vars: Record<string, string | number> = {}) {
    super(message)
    this.s = s
    this.e = e
    this.vars = vars
  }
}
