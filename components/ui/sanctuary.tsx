'use client'

import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  ArrowUpRight,
  Check,
  Copy,
  MessageCircle,
  Moon,
  Phone,
  Sun,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  getTheme,
  WA_DISPLAY,
  WA_LINK,
  type ThemeTokens,
} from '@/lib/ui-theme'
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scroll-lock'

export function useDarkMode() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const darkMode = mounted && resolvedTheme === 'dark'

  const toggle = () => setTheme(darkMode ? 'light' : 'dark')

  return { darkMode, toggle, theme: getTheme(darkMode) }
}

/**
 * Cursor- and touch-reactive soft Dusty Rose shimmer.
 */
export function SanctuaryShimmerSpan({
  darkMode,
  children,
}: {
  darkMode: boolean
  children: React.ReactNode
}) {
  const spanRef = useRef<HTMLSpanElement | null>(null)
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50, active: false })

  const updatePointer = (clientX: number, clientY: number) => {
    if (!spanRef.current) return
    const rect = spanRef.current.getBoundingClientRect()
    const px = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const py = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setGlowPos({ x: px, y: py, active: true })
  }

  return (
    <span
      ref={spanRef}
      onMouseMove={(e) => updatePointer(e.clientX, e.clientY)}
      onMouseEnter={(e) => updatePointer(e.clientX, e.clientY)}
      onMouseLeave={() => setGlowPos((prev) => ({ ...prev, active: false }))}
      onTouchStart={(e) => {
        const touch = e.touches?.[0]
        if (touch) updatePointer(touch.clientX, touch.clientY)
      }}
      onTouchMove={(e) => {
        const touch = e.touches?.[0]
        if (touch) updatePointer(touch.clientX, touch.clientY)
      }}
      onTouchEnd={() =>
        setTimeout(() => setGlowPos((prev) => ({ ...prev, active: false })), 900)
      }
      style={{
        backgroundImage: darkMode
          ? `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, #FFE1E1 0%, #E5A6A6 34%, #C47373 100%)`
          : `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, #E89999 0%, #9E5656 38%, #6E3737 100%)`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        textShadow: glowPos.active
          ? darkMode
            ? '0 0 24px rgba(229, 166, 166, 0.42)'
            : '0 0 22px rgba(208, 128, 128, 0.36)'
          : 'none',
      }}
      className="relative inline-block italic transition-[text-shadow] duration-300 ease-out cursor-default select-none"
    >
      {children}
    </span>
  )
}

/**
 * Smooth accordion panel using CSS grid-template-rows transition.
 */
export function SmoothFaqBody({
  isOpen,
  textClass,
  children,
}: {
  isOpen: boolean
  textClass: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        opacity: isOpen ? 1 : 0,
        transition:
          'grid-template-rows 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.34s ease',
      }}
    >
      <div className="overflow-hidden">
        <p
          className={`pt-3.5 pl-9 sm:pl-12 pr-2 sm:pr-4 text-xs sm:text-sm font-light leading-[1.85] ${textClass}`}
        >
          {children}
        </p>
      </div>
    </div>
  )
}

export function MagneticSanctuaryButton({
  onClick,
  darkMode,
  children,
}: {
  onClick: () => void
  darkMode: boolean
  children: React.ReactNode
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    setOffset({ x: relX * 0.14, y: relY * 0.2 })
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        background: darkMode
          ? 'linear-gradient(135deg, #E5A6A6 0%, #D08080 55%, #8B4F4F 100%)'
          : 'linear-gradient(135deg, #DC9696 0%, #D08080 55%, #8B4F4F 100%)',
      }}
      className={`group relative inline-flex items-center gap-3.5 sm:gap-4 px-7 sm:px-10 py-3.5 sm:py-4 rounded-full text-xs sm:text-sm font-medium tracking-[0.015em] overflow-hidden transition-[box-shadow,transform] duration-300 ease-out cursor-pointer select-none ${
        darkMode
          ? 'text-[#120E0F] shadow-[0_14px_40px_-14px_rgba(208,128,128,0.5)] hover:shadow-[0_18px_48px_-12px_rgba(229,166,166,0.62)]'
          : 'text-white shadow-[0_14px_38px_-14px_rgba(139,79,79,0.42)] hover:shadow-[0_18px_46px_-12px_rgba(139,79,79,0.54)]'
      }`}
    >
      <span className="pointer-events-none absolute inset-[1px] rounded-full border border-white/30" />
      <span className="relative z-10">{children}</span>
      <span
        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
          darkMode ? 'bg-[#120E0F]/10' : 'bg-white/20'
        }`}
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </button>
  )
}

export function SanctuaryBrand({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center group cursor-pointer text-left shrink-0 min-w-0"
    >
      <span className="font-editorial italic text-xl sm:text-2xl lg:text-[28px] font-medium tracking-[-0.015em] whitespace-nowrap">
        Salsa <span className="not-italic font-normal text-[#8B4F4F]">Dental</span>
      </span>
    </Link>
  )
}

export function ThemeToggle({ theme }: { theme: ThemeTokens }) {
  const { darkMode, toggle } = useDarkMode()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={darkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
      title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
      className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full border inline-flex items-center justify-center transition-all duration-300 hover:border-[#D08080] hover:scale-105 cursor-pointer shrink-0 ${theme.pillSurface}`}
    >
      {darkMode ? (
        <Sun className="w-4 h-4 text-[#E5A6A6]" />
      ) : (
        <Moon className="w-4 h-4 text-[#8B4F4F]" />
      )}
    </button>
  )
}

export function SolidModal({
  open,
  onClose,
  theme,
  className = '',
  children,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  theme: ThemeTokens
  className?: string
  children: React.ReactNode
  labelledBy?: string
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Only `open` may re-trigger the effect: an inline `onClose` would otherwise
  // unlock and re-lock the body on every parent render (scroll jumps, stuck page).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-photo-lightbox="true"]')) return
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      unlockBodyScroll()
    }
  }, [open])

  if (!open || !mounted) return null

  // Rendered through a portal so ancestors with transforms/filters (the animated
  // dashboard tab wrapper) can never trap the fixed overlay inside the content box.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-6 animate-view-enter"
      data-modal-root="true"
    >
      <div
        onClick={() => onCloseRef.current()}
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        data-modal-backdrop="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative z-10 w-full min-w-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl border sm:max-h-[min(90dvh,900px)] sm:rounded-3xl ${theme.solidPanel} ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y pinch-zoom',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export type DangerConfirmState = {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
} | null

export function DangerConfirmModal({
  state,
  onClose,
  theme,
}: {
  state: DangerConfirmState
  onClose: () => void
  theme: ThemeTokens
}) {
  return (
    <SolidModal open={!!state} onClose={onClose} theme={theme} className="max-w-sm p-5 sm:p-7 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-500">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold break-words">{state?.title}</h3>
      <p className={`text-xs leading-relaxed ${theme.textMuted}`}>{state?.message}</p>
      <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className={`flex-1 min-h-11 py-3 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => state?.onConfirm()}
          className="flex-1 min-h-11 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
        >
          {state?.confirmLabel || 'Hapus'}
        </button>
      </div>
    </SolidModal>
  )
}

export function WhatsAppHelpFab({
  theme,
  open,
  setOpen,
}: {
  theme: ThemeTokens
  open: boolean
  setOpen: (value: boolean) => void
}) {
  const [copiedWa, setCopiedWa] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 flex flex-col items-end">
      {open && (
        <div className={`mb-3 w-[min(20rem,calc(100vw-2.5rem))] sm:w-80 rounded-3xl border p-5 ${theme.solidPanel}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-[#D08080]">WhatsApp Clinic</span>
              <h3 className="mt-0.5 text-lg font-semibold">Bantuan Resepsionis</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup bantuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`mt-2 text-xs font-light leading-relaxed ${theme.textMuted}`}>
            Hubungi nomor resmi Salsabila Dental Clinic untuk bantuan kode token antrean
            atau jadwal kunjungan:
          </p>

          <div className={`mt-3.5 px-3.5 py-2.5 rounded-2xl border flex items-center justify-between ${theme.inputBg}`}>
            <div className="flex items-center gap-2 text-xs font-medium tabular-nums">
              <Phone className="w-3.5 h-3.5 text-[#D08080]" />
              <span>{WA_DISPLAY}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText('081387530407')
                setCopiedWa(true)
                setTimeout(() => setCopiedWa(false), 1800)
              }}
              className="min-h-11 px-2 text-xs font-medium text-[#D08080] inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedWa ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>

          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium hover:opacity-95 transition-opacity"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat WhatsApp Sekarang</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`inline-flex min-h-11 items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full border text-xs font-medium tracking-[0.02em] transition-all hover:border-[#D08080] cursor-pointer ${theme.pillSurface}`}
      >
        <MessageCircle className="w-4 h-4 text-[#D08080]" />
        <span>Butuh Bantuan?</span>
      </button>
    </div>
  )
}
