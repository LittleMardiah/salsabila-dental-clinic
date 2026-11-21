/**
 * Reference-counted body scroll lock for stacked dialogs (history modal +
 * photo lightbox). The page scroll is restored only after the last layer closes.
 */
let lockCount = 0
let previousOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = previousOverflow
}
