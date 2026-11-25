'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  X,
  ZoomIn,
} from 'lucide-react'
import type { ThemeTokens } from '@/lib/ui-theme'
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scroll-lock'

export type LightboxPhoto = { src: string; name: string }

type PhotoLightboxProps = {
  open: boolean
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  theme?: ThemeTokens
}

type Point = { x: number; y: number }

const MIN_SCALE = 1
const MAX_SCALE = 5

export default function PhotoLightbox({
  open,
  photos,
  index,
  onIndexChange,
  onClose,
  theme,
}: PhotoLightboxProps) {
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null)
  const dragRef = useRef<{ point: Point; startX: number; startY: number; moved: boolean } | null>(null)
  const tapTargetRef = useRef<'stage' | 'image' | null>(null)
  const skipTapRef = useRef(false)
  const lastTapRef = useRef(0)

  const photo = photos[index] || null

  const clampOffset = useCallback((x: number, y: number, nextScale: number) => {
    const stage = stageRef.current
    const image = imageRef.current
    if (!stage || !image) return { x, y }
    const stageRect = stage.getBoundingClientRect()
    const maxX = Math.max(0, (image.offsetWidth * nextScale - stageRect.width) / 2)
    const maxY = Math.max(0, (image.offsetHeight * nextScale - stageRect.height) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }, [])

  const applyScale = useCallback(
    (nextScale: number, nextOffset?: Point) => {
      const value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(nextScale * 100) / 100))
      if (value === MIN_SCALE) {
        setScale(MIN_SCALE)
        setOffset({ x: 0, y: 0 })
        return
      }
      setScale(value)
      setOffset((prev) => {
        const target = nextOffset || prev
        return clampOffset(target.x, target.y, value)
      })
    },
    [clampOffset]
  )

  const resetView = useCallback(() => {
    setScale(MIN_SCALE)
    setOffset({ x: 0, y: 0 })
    setDragging(false)
    pointersRef.current.clear()
    pinchRef.current = null
    dragRef.current = null
    tapTargetRef.current = null
    skipTapRef.current = false
    lastTapRef.current = 0
  }, [])

  useEffect(() => {
    if (!open) return
    resetView()
  }, [open, index, photo?.src, resetView])

  useEffect(() => {
    if (!open) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight' && photos.length > 1) {
        onIndexChange((index + 1) % photos.length)
      } else if (event.key === 'ArrowLeft' && photos.length > 1) {
        onIndexChange((index - 1 + photos.length) % photos.length)
      } else if (event.key === '+' || event.key === '=') {
        applyScale(scale + 0.25)
      } else if (event.key === '-') {
        applyScale(scale - 0.25)
      } else if (event.key === '0') {
        applyScale(MIN_SCALE)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [applyScale, index, onClose, onIndexChange, open, photos.length, scale])

  useEffect(() => {
    const stage = stageRef.current
    if (!open || !stage) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      applyScale(scale + (event.deltaY < 0 ? 0.2 : -0.2))
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [applyScale, open, scale])

  if (!open) return null

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    const point = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, point)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      pointersRef.current.set(event.pointerId, point)
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values())
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        scale,
      }
      dragRef.current = null
      tapTargetRef.current = null
      skipTapRef.current = true
      setDragging(false)
      return
    }

    if (pointersRef.current.size > 2) {
      skipTapRef.current = true
      return
    }

    tapTargetRef.current = event.target === event.currentTarget ? 'stage' : 'image'
    if (scale > MIN_SCALE) {
      dragRef.current = { point, startX: offset.x, startY: offset.y, moved: false }
      setDragging(true)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    const point = { x: event.clientX, y: event.clientY }
    pointersRef.current.set(event.pointerId, point)

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values())
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
      applyScale((pinchRef.current.scale * distance) / pinchRef.current.distance)
      return
    }

    const drag = dragRef.current
    if (!drag) return
    const dx = point.x - drag.point.x
    const dy = point.y - drag.point.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true
    setOffset(clampOffset(drag.startX + dx, drag.startY + dy, scale))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    const drag = dragRef.current
    pointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (pinchRef.current && pointersRef.current.size < 2) pinchRef.current = null
    if (drag) {
      dragRef.current = null
      setDragging(false)
    }
    if (pointersRef.current.size > 0) return

    const shouldSkipTap = skipTapRef.current || Boolean(drag?.moved)
    skipTapRef.current = false
    if (!shouldSkipTap) {
      if (tapTargetRef.current === 'stage') {
        tapTargetRef.current = null
        onClose()
        return
      }
      if (tapTargetRef.current === 'image' && event.pointerType === 'touch') {
        const now = Date.now()
        if (now - lastTapRef.current < 320) {
          lastTapRef.current = 0
          applyScale(scale > MIN_SCALE ? MIN_SCALE : 2)
        } else {
          lastTapRef.current = now
        }
      }
    }
    tapTargetRef.current = null
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (pointersRef.current.size < 2) pinchRef.current = null
    dragRef.current = null
    tapTargetRef.current = null
    skipTapRef.current = false
    setDragging(false)
  }

  const handleDoubleClick = () => {
    if (skipTapRef.current) return
    applyScale(scale > MIN_SCALE ? MIN_SCALE : 2)
  }

  const controlClass = `inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
    theme?.pillSurface || 'border-[#D08080]/35 bg-white text-[#221A1B]'
  }`

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto rekam medis"
      data-photo-lightbox="true"
      style={{ touchAction: 'none' }}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:gap-3 sm:px-6 sm:py-3 ${theme?.solidPanel || 'border-[#D08080]/35 bg-[#FFFDFC] text-[#221A1B]'}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D08080]">
            Pratinjau Foto
          </p>
          <p className={`truncate text-sm font-medium ${theme?.text || 'text-[#221A1B]'}`}>
            {photo?.name || 'Foto klinis'}
            {photos.length > 1 && (
              <span className={`ml-2 text-xs ${theme?.textSubtle || 'text-[#968082]'}`}>
                {index + 1} / {photos.length}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className={controlClass}
            aria-label="Perkecil foto"
            onClick={() => applyScale(scale - 0.25)}
            disabled={scale <= MIN_SCALE}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className={`min-w-12 text-center text-xs font-semibold tabular-nums sm:min-w-16 ${theme?.text || ''}`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className={controlClass}
            aria-label="Perbesar foto"
            onClick={() => applyScale(scale + 0.25)}
            disabled={scale >= MAX_SCALE}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={`${controlClass} w-auto gap-1 px-3 sm:px-3.5`}
            aria-label="Reset zoom ke 100%"
            onClick={() => applyScale(MIN_SCALE)}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden text-[11px] font-medium sm:inline">Reset 100%</span>
          </button>
          <button
            type="button"
            className={controlClass}
            aria-label="Tutup pratinjau"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden p-3 sm:p-4"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={photo.src}
            alt={photo.name}
            draggable={false}
            className="max-h-full max-w-full object-contain shadow-2xl"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              cursor: scale > MIN_SCALE ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
              touchAction: 'none',
            }}
          />
        ) : (
          <p className="text-sm text-white/70">Foto tidak tersedia</p>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              className={`absolute left-2 bottom-2 inline-flex h-11 w-11 items-center justify-center rounded-full border sm:left-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:h-10 sm:w-10 ${controlClass}`}
              onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              className={`absolute right-2 bottom-2 inline-flex h-11 w-11 items-center justify-center rounded-full border sm:right-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:h-10 sm:w-10 ${controlClass}`}
              onClick={() => onIndexChange((index + 1) % photos.length)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 bg-black/40 px-3 py-2 text-[10px] text-white/70 sm:px-4 sm:text-[11px]">
        <ZoomIn className="h-3.5 w-3.5 shrink-0" />
        <span className="text-center">
          Cubit / klik ganda untuk zoom · Geser saat diperbesar · Ketuk latar atau ESC untuk tutup
        </span>
      </div>
    </div>
  )
}
