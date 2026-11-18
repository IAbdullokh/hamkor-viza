/** says a block move / removal to screen readers (one polite live region for the whole page, made on first use) */
export function announce(text: string): void {
  let el = document.getElementById('block-edit-live')
  if (!el) {
    el = document.createElement('div')
    el.id = 'block-edit-live'
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('role', 'status')
    el.className = 'sr-only'
    document.body.appendChild(el)
  }
  // a fresh text node each time, so the same words said twice are read twice
  el.textContent = ''
  const node = el
  window.setTimeout(() => {
    node.textContent = text
  }, 30)
}
