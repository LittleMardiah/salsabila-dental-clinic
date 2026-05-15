// components/admin/EMRForm.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const emrSchema = z.object({
  queueId: z.number().min(1, 'Antrian harus dipilih'),
  keluhanUtama: z.string().optional(),
  diagnosa: z.string().min(1, 'Diagnosa wajib diisi'),
  tindakan: z.string().min(1, 'Tindakan wajib diisi'),
  resepObat: z.string().optional(),
  catatanTambahan: z.string().optional(),
  dokterPenanggungJawab: z.string().min(1, 'Dokter wajib diisi'),
  followUpDate: z.string().optional(),
})

type EMRFormData = z.infer<typeof emrSchema>

interface EMRFormProps {
  patientId: number
  initialData?: any
  visitId?: number
  onSuccess: () => void
  onHistoryClick?: () => void
}

export default function EMRForm({ patientId, initialData, visitId, onSuccess, onHistoryClick }: EMRFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [completedQueues, setCompletedQueues] = useState<{ id: number; label: string }[]>([])
  const [fetchingQueues, setFetchingQueues] = useState(true)

  const dateInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<EMRFormData>({
    resolver: zodResolver(emrSchema),
    defaultValues: initialData || {},
    mode: 'onChange',
  })

  useEffect(() => {
    const fetchCompletedQueues = async () => {
      try {
        const res = await fetch(`/api/patient/${patientId}/completed-queues`)
        if (res.ok) {
          const data = await res.json()
          setCompletedQueues(data.queues)
          if (initialData?.queueId) {
            setValue('queueId', initialData.queueId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch completed queues', error)
      } finally {
        setFetchingQueues(false)
      }
    }
    fetchCompletedQueues()
  }, [patientId, initialData, setValue])

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      if (dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker()
      } else {
        dateInputRef.current.click()
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
    const urls = selected.map(file => URL.createObjectURL(file))
    setPreviews(urls)
  }

  const removeFile = (index: number) => {
    const newFiles = [...files]
    const newPreviews = [...previews]
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const onSubmit = async (data: EMRFormData) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('queueId', data.queueId.toString())
    formData.append('keluhanUtama', data.keluhanUtama || '')
    formData.append('diagnosa', data.diagnosa)
    formData.append('tindakan', data.tindakan)
    formData.append('resepObat', data.resepObat || '')
    formData.append('catatanTambahan', data.catatanTambahan || '')
    formData.append('dokterPenanggungJawab', data.dokterPenanggungJawab)
    if (data.followUpDate) formData.append('followUpDate', data.followUpDate)
    files.forEach(file => formData.append('photos', file))

    const url = visitId
      ? `/api/patient/${patientId}/emr?visitId=${visitId}`
      : `/api/patient/${patientId}/emr`
    const method = visitId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, { method, body: formData })
      const result = await res.json()
      if (res.ok) {
        toast.success('Sukses', { description: result.message || 'EMR berhasil disimpan' })
        reset()
        setFiles([])
        setPreviews([])
        onSuccess()
      } else {
        toast.error('Error', { description: result.error || 'Gagal menyimpan EMR' })
      }
    } catch (error) {
      toast.error('Error', { description: 'Terjadi kesalahan' })
    } finally {
      setLoading(false)
    }
  }

  const getQueueLabel = (q: { id: number; label: string }) => q.label

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Section 1: Informasi Kunjungan */}
        <div className="lg:col-span-8 tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-10">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-xl md:text-2xl">person_search</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">Informasi Kunjungan</h3>
          </div>
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline-variant uppercase tracking-[0.2em] ml-2">Pilih Antrian Selesai</label>
                <div className="relative">
                  <select
                    {...register('queueId', { valueAsNumber: true })}
                    className="w-full glass-input rounded-2xl py-3 md:py-4 px-4 md:px-5 text-on-surface appearance-none cursor-pointer font-medium"
                    required
                  >
                    <option value="">Pilih antrian selesai</option>
                    {completedQueues.map(q => (
                      <option key={q.id} value={q.id}>{getQueueLabel(q)}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">expand_more</span>
                </div>
                {errors.queueId && <p className="text-red-500 text-sm mt-1">{errors.queueId.message}</p>}
                {fetchingQueues && <p className="text-sm text-gray-500 mt-1">Memuat daftar antrian...</p>}
                {!fetchingQueues && completedQueues.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Belum ada antrian selesai untuk pasien ini.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline-variant uppercase tracking-[0.2em] ml-2">Tanggal Follow Up</label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('followUpDate')}
                    className="w-full glass-input rounded-2xl py-3 md:py-4 px-4 md:px-5 text-on-surface font-medium"
                    ref={dateInputRef}
                  />
                  <span
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant cursor-pointer hover:text-primary transition-colors"
                    onClick={handleCalendarClick}
                  >
                    calendar_today
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-outline-variant uppercase tracking-[0.2em] ml-2">Keluhan Utama</label>
              <textarea
                {...register('keluhanUtama')}
                className="w-full glass-input rounded-2xl py-4 md:py-5 px-5 md:px-6 text-on-surface placeholder:text-outline-variant/50 leading-relaxed font-medium"
                placeholder="Deskripsikan keluhan utama pasien secara detail..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Diagnosa & Tindakan, Dokter PJ */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-8">
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-lg md:text-xl">stethoscope</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold tracking-tight">Diagnosa &amp; Tindakan</h3>
            </div>
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline-variant uppercase tracking-[0.2em] ml-1">Diagnosa</label>
                <input
                  {...register('diagnosa')}
                  className="w-full glass-input rounded-xl py-2.5 md:py-3.5 px-3 md:px-4 text-on-surface font-semibold border-l-[6px] border-l-error"
                  placeholder="Contoh: Pulpitis Irreversibel"
                />
                {errors.diagnosa && (
                  <p className="mt-1 text-xs text-error flex items-center gap-1 font-bold uppercase tracking-wider ml-1">
                    <span className="material-symbols-outlined text-sm">error</span> Diagnosa wajib diisi
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline-variant uppercase tracking-[0.2em] ml-1">Tindakan</label>
                <input
                  {...register('tindakan')}
                  className="w-full glass-input rounded-xl py-2.5 md:py-3.5 px-3 md:px-4 text-on-surface font-medium"
                  placeholder="Contoh: Root Canal Treatment"
                />
                {errors.tindakan && <p className="text-red-500 text-sm mt-1">{errors.tindakan.message}</p>}
              </div>
            </div>
          </div>
          <div className="tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-8">
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-lg md:text-xl">person</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold tracking-tight">Dokter PJ</h3>
            </div>
            <div className="relative">
              <input
                {...register('dokterPenanggungJawab')}
                className="w-full glass-input rounded-xl py-3 md:py-4 px-4 md:px-5 text-on-surface font-bold"
                placeholder="Nama dokter penanggung jawab"
              />
              {errors.dokterPenanggungJawab && <p className="text-red-500 text-sm mt-1">{errors.dokterPenanggungJawab.message}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Resep Obat & Catatan Tambahan */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-10">
            <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-xl md:text-2xl">prescriptions</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Resep Obat</h3>
            </div>
            <textarea
              {...register('resepObat')}
              className="w-full glass-input rounded-2xl md:rounded-[2.5rem] py-5 md:py-6 px-5 md:px-7 text-on-surface placeholder:text-outline-variant/50 leading-relaxed font-medium"
              placeholder="Tuliskan detail resep obat (Nama obat, Dosis, Aturan pakai)..."
              rows={5}
            />
          </div>
          <div className="tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-10">
            <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-outline-variant/10 text-outline flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-xl md:text-2xl">note_alt</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Catatan Tambahan</h3>
            </div>
            <textarea
              {...register('catatanTambahan')}
              className="w-full glass-input rounded-2xl md:rounded-[2.5rem] py-5 md:py-6 px-5 md:px-7 text-on-surface placeholder:text-outline-variant/50 leading-relaxed font-medium"
              placeholder="Catatan internal atau instruksi khusus untuk kunjungan berikutnya..."
              rows={5}
            />
          </div>
        </div>

        {/* Section 4: Dokumentasi Foto */}
        <div className="col-span-12 tactile-card rounded-2xl md:rounded-[3rem] p-6 md:p-10">
          <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-xl md:text-2xl">add_a_photo</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">Dokumentasi Foto</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
            {previews.map((src, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl md:rounded-[2rem] overflow-hidden group shadow-md ring-2 ring-white">
                <img src={src} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => removeFile(idx)} className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-full text-error shadow-xl flex items-center justify-center hover:scale-110">
                    <span className="material-symbols-outlined text-lg md:text-2xl">delete</span>
                  </button>
                </div>
              </div>
            ))}
            <label className="relative aspect-square rounded-xl md:rounded-[2rem] border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-2 md:gap-4 cursor-pointer hover:bg-primary/10 transition-all group shadow-inner">
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-2xl md:text-4xl">cloud_upload</span>
              </div>
              <span className="text-xs md:text-sm font-extrabold text-primary/60 uppercase tracking-widest">Unggah Foto</span>
            </label>
            {Array.from({ length: Math.max(0, 4 - previews.length - 1) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="relative aspect-square rounded-xl md:rounded-[2rem] border-4 border-dashed border-outline-variant/10 bg-surface-container-low/20"></div>
            ))}
          </div>
        </div>
      </div>

       {/* Bottom Actions */}
      <div className="flex justify-center mt-30"> 
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 md:gap-8 bg-white/80 backdrop-blur-2xl px-4 py-3 sm:px-6 md:px-10 sm:py-4 md:py-5 rounded-2xl md:rounded-[2.5rem] border border-white shadow-lg">
          {onHistoryClick && (
            <button
              type="button"
              onClick={onHistoryClick}
              className="w-full sm:w-auto px-6 md:px-8 py-2 md:py-3.5 rounded-full bg-white/60 border border-white text-on-surface-variant font-bold hover:bg-white transition-all shadow-sm text-xs md:text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg md:text-xl">history</span>
              Riwayat Kunjungan
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 md:px-10 py-2 md:py-3.5 rounded-full cta-gradient text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs md:text-sm shadow-lg disabled:opacity-70"
          >
            <span className="material-symbols-outlined text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
            {loading ? 'Menyimpan...' : (visitId ? 'Update EMR' : 'Simpan EMR')}
          </button>
        </div>
      </div>
    </form>
  )
}