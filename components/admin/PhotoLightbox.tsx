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

export type LightboxPhoto = { src: string; name: string }

type PhotoLightboxProps = {
  open: boolean
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  theme?: ThemeTokens
}

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
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)

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
    (nextScale: number, nextOffset = offset) => {
      const value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(nextScale * 100) / 100))
      if (value === MIN_SCALE) {
        setScale(MIN_SCALE)
        setOffset({ x: 0, y: 0 })
        return
      }
      setScale(value)
      setOffset(clampOffset(nextOffset.x, nextOffset.y, value))
    },
    [clampOffset, offset]
  )

  useEffect(() => {
    if (!open) return
    setScale(MIN_SCALE)
    setOffset({ x: 0, y: 0 })
    dragRef.current = null
    setDragging(false)
  }, [open, index, photo?.src])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
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
    if (scale <= MIN_SCALE) return
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: offset.x,
      startY: offset.y,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setOffset(
      clampOffset(
        drag.startX + event.clientX - drag.x,
        drag.startY + event.clientY - drag.y,
        scale
      )
    )
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const controlClass = `inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
    theme?.pillSurface || 'border-[#D08080]/35 bg-white text-[#221A1B]'
  }`

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto rekam medis"
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${theme?.solidPanel || 'border-[#D08080]/35 bg-[#FFFDFC] text-[#221A1B]'}`}
      >
        <div className="min-w-0">
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={controlClass}
            aria-label="Perkecil foto"
            onClick={() => applyScale(scale - 0.25)}
            disabled={scale <= MIN_SCALE}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className={`min-w-16 text-center text-xs font-semibold tabular-nums ${theme?.text || ''}`}>
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
            className={controlClass}
            aria-label="Reset zoom ke 100%"
            onClick={() => applyScale(MIN_SCALE)}
          >
            <RotateCcw className="h-4 w-4" />
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
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden p-4"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => applyScale(scale > MIN_SCALE ? MIN_SCALE : 2)}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
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
              className={`absolute left-3 inline-flex h-10 w-10 items-center justify-center rounded-full border ${controlClass}`}
              onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              className={`absolute right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border ${controlClass}`}
              onClick={() => onIndexChange((index + 1) % photos.length)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 bg-black/40 px-4 py-2 text-[11px] text-white/70">
        <ZoomIn className="h-3.5 w-3.5" />
        <span>Scroll atau klik ganda untuk zoom · Geser saat diperbesar · ESC untuk tutup</span>
      </div>
    </div>
  )
}
