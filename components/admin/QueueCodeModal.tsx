// components/admin/QueueCodeModal.tsx
'use client'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface QueueCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queueNumber: number
  patientCode: string | null
  patientName?: string
}

export default function QueueCodeModal({ open, onOpenChange, queueNumber, patientCode, patientName }: QueueCodeModalProps) {
  if (!patientCode) return null

  const formattedQueueNumber = `A-${queueNumber.toString().padStart(2, '0')}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-transparent">
        <div className="bg-white/95 w-full rounded-3xl modal-3d overflow-hidden border border-white/80">
          <div className="p-8 flex flex-col items-center text-center">
            {/* Success Icon */}
            <div className="mb-6 relative">
              <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center shadow-xl border border-white/40">
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center icon-emboss">
                  <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1", filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>check_circle</span>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-6 font-poppins tracking-tight">Pendaftaran Berhasil</h2>

            {/* Queue Number */}
            <div className="w-full mb-8">
              <p className="text-[11px] font-bold text-primary opacity-60 font-poppins tracking-[0.2em] mb-3">NOMOR ANTRIAN</p>
              <div className="py-2">
                <span className="text-6xl leading-none font-bold text-primary-container font-poppins tracking-tighter drop-shadow-sm">{formattedQueueNumber}</span>
              </div>
            </div>

            {/* Token Akses - Inset Etched Style */}
            <div className="w-full p-6 bg-zinc-50 inset-etch border border-white/50 rounded-2xl mb-8 relative overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-400 font-poppins tracking-[0.25em] mb-2">TOKEN AKSES</p>
              <p className="text-3xl font-mono font-black text-on-primary-fixed-variant tracking-[0.3em] pl-2 drop-shadow-sm">{patientCode}</p>
            </div>

            {/* Selesai Button - 3D Gradient */}
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-4 button-3d-gradient hover:opacity-95 text-on-primary-container font-poppins font-bold text-lg rounded-full transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
            >
              Selesai
            </button>

            {/* Footer Note */}
            <p className="mt-6 text-xs text-zinc-500 font-rethink max-w-[260px] leading-relaxed">
              Berikan kode ini kepada pasien untuk pelacakan status secara mandiri
            </p>
          </div>
          {/* Bottom Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary-container/20 via-primary-container to-primary-container/20"></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}