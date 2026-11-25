type SavedBodyStyle = {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  width: string
  scrollY: number
}

let lockCount = 0
let saved: SavedBodyStyle | null = null
let restoreFrame: number | null = null

function applyLockStyle(scrollY: number) {
  const body = document.body
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.dataset.scrollLock = 'true'
}

function restoreBodyStyle() {
  if (!saved) return
  const body = document.body
  body.style.overflow = saved.overflow
  body.style.position = saved.position
  body.style.top = saved.top
  body.style.left = saved.left
  body.style.right = saved.right
  body.style.width = saved.width
  delete body.dataset.scrollLock
}

export function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  if (restoreFrame !== null) {
    cancelAnimationFrame(restoreFrame)
    restoreFrame = null
    if (saved) applyLockStyle(saved.scrollY)
    lockCount += 1
    return
  }

  if (lockCount === 0) {
    const body = document.body
    saved = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      scrollY: window.scrollY || window.pageYOffset || 0,
    }
    applyLockStyle(saved.scrollY)
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined' || lockCount === 0) return

  lockCount -= 1
  if (lockCount > 0 || !saved) return

  restoreBodyStyle()
  const restoreY = saved.scrollY
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = null
    if (lockCount === 0) {
      window.scrollTo(0, restoreY)
      saved = null
    }
  })
}
