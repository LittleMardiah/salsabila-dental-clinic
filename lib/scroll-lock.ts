type SavedBodyStyle = {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  width: string
  paddingRight: string
  scrollY: number
}

let lockCount = 0
let saved: SavedBodyStyle | null = null

function currentScrollY() {
  return window.scrollY || window.pageYOffset || 0
}

function applyLock() {
  const body = document.body
  const html = document.documentElement
  const scrollY = currentScrollY()
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth)

  saved = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
    scrollY,
  }

  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.dataset.scrollLock = 'true'
}

function restoreLock() {
  if (!saved) return
  const body = document.body
  const { scrollY } = saved

  body.style.overflow = saved.overflow
  body.style.position = saved.position
  body.style.top = saved.top
  body.style.left = saved.left
  body.style.right = saved.right
  body.style.width = saved.width
  body.style.paddingRight = saved.paddingRight
  delete body.dataset.scrollLock

  saved = null
  window.scrollTo(0, scrollY)
}

/**
 * Locks document scrolling. Safe to call from nested overlays: each call must be
 * paired with one `unlockBodyScroll` and the page is only restored when the last
 * overlay closes. Position is restored synchronously so mobile browsers never
 * end up with a frozen viewport.
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  if (lockCount === 0 && !saved) applyLock()
  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (lockCount === 0) return

  lockCount -= 1
  if (lockCount > 0) return

  restoreLock()
}

/** Force-release any leftovers (used when a full overlay tree unmounts). */
export function resetBodyScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  lockCount = 0
  restoreLock()
}
