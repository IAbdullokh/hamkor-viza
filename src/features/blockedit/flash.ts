/**
 * "Take me to that card" (the change log, ChangesPanel): the block is scrolled into view and blinks; a block on another
 * page of the dashboard is remembered and blinks when that page has drawn it (EditableBlock asks takeFlash).
 */
let waiting: string | null = null

export function flashCell(el: HTMLElement): void {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.removeAttribute('data-block-flash')
  void el.offsetWidth
  el.setAttribute('data-block-flash', '')
  window.setTimeout(() => el.removeAttribute('data-block-flash'), 2200)
}

/** goes to the block now when it is on screen (true), else remembers it for its page */
export function goToBlock(id: string): boolean {
  const el = Array.from(document.querySelectorAll<HTMLElement>('[data-block-id]')).find((e) => e.getAttribute('data-block-id') === id)
  if (el) {
    waiting = null
    flashCell(el)
    return true
  }
  waiting = id
  return false
}

/** true once for the block that was asked for before its page drew it */
export function takeFlash(id: string): boolean {
  if (waiting !== id) return false
  waiting = null
  return true
}
