import { useLayoutEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { cx } from '@/lib/cx'

/**
 * Whole rows only (owner, 2026-11-14: a ranked list showed a 6th row cut mid-glyph at the card's bottom): a list or a
 * table in a fixed box shows the rows that fit in full, and a small «+N» line for the rest — never a half row. Rows mark
 * themselves with `data-row`; the ones that do not fit get `data-cut` (the box hides them, so the layout never moves and
 * they can be measured again when the box grows).
 */

/** room kept under the whole rows for the «+N» line */
export const MORE_H = 24

/**
 * How many rows fit whole in `avail` px: `bottoms` are the rows' bottom edges measured from the box's top, in order.
 * All of them when the last one fits; else the ones that fit above the «+N» line.
 */
export function fitRows(avail: number, bottoms: number[], moreH = MORE_H): number {
  if (!bottoms.length || bottoms[bottoms.length - 1]! <= avail + 0.5) return bottoms.length
  let n = 0
  while (n < bottoms.length && bottoms[n]! <= avail - moreH + 0.5) n++
  return n
}

/** an element's top inside `box` (layout px, so a transform on the page around does not change it) */
function topIn(el: HTMLElement, box: HTMLElement): number {
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== box) {
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return n === box ? y - box.scrollTop : el.getBoundingClientRect().top - box.getBoundingClientRect().top
}

/**
 * Measures the box's `[data-row]` rows after every render and on resize, cuts the ones that do not fit whole, and says
 * how many were cut. The box needs `position: relative` (so the rows' offsets count from it) and a fixed height.
 * Off (`on` false: a list opened to scroll) every row shows.
 */
export function useWholeRows(on: boolean) {
  const box = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const rows = [...el.querySelectorAll<HTMLElement>('[data-row]')]
      const fit = on ? fitRows(el.clientHeight, rows.map((r) => topIn(r, el) + r.offsetHeight)) : rows.length
      rows.forEach((r, i) => (i < fit ? r.removeAttribute('data-cut') : r.setAttribute('data-cut', '')))
      setHidden(rows.length - fit)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  })
  return { box, hidden }
}

/** the box's classes: relative for the measuring, the cut rows hidden (they keep their place) */
export const WHOLE_ROWS_BOX = 'relative [&_[data-cut]]:invisible'

/** «+N» under the whole rows: a plain line in a preview, a button that opens the whole list on the dashboard */
export function MoreRows({ n, onClick }: { n: number; onClick?: () => void }) {
  const { t } = useT()
  if (n <= 0) return null
  const cls = 'absolute inset-x-0 bottom-0 flex items-center justify-center text-[0.75rem] font-medium text-ink-3'
  const style = { height: MORE_H }
  const label = t('+{n} ta yana', { n })
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(cls, 'pressable hover:text-ink')} style={style}>
      {label}
    </button>
  ) : (
    <p className={cls} style={style}>
      {label}
    </p>
  )
}
