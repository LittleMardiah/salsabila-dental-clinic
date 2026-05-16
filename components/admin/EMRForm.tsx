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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6 md:space-y-8">
      {/* Grid utama: 1 kolom di mobile, 2 kolom di tablet, 3 kolom di desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Kolom kiri: Informasi Kunjungan (span 2 di lg) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person_search</span>
              </div>
              <h3 className="text-lg font-bold">Informasi Kunjungan</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Antrian Selesai *</label>
                <select
                  {...register('queueId', { valueAsNumber: true })}
                  className="w-full rounded-xl border border-gray-200 p-3 bg-white/80 focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Pilih antrian selesai</option>
                  {completedQueues.map(q => (
                    <option key={q.id} value={q.id}>{getQueueLabel(q)}</option>
                  ))}
                </select>
                {errors.queueId && <p className="text-red-500 text-xs mt-1">{errors.queueId.message}</p>}
                {fetchingQueues && <p className="text-gray-500 text-xs mt-1">Memuat daftar antrian...</p>}
                {!fetchingQueues && completedQueues.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Belum ada antrian selesai untuk pasien ini.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Follow Up</label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('followUpDate')}
                    className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
                    ref={dateInputRef}
                  />
                  <span
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={handleCalendarClick}
                  >
                    calendar_today
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Keluhan Utama</label>
                <textarea
                  {...register('keluhanUtama')}
                  className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
                  rows={4}
                  placeholder="Deskripsikan keluhan utama pasien..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kolom kanan: Diagnosa & Tindakan, Dokter PJ */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">stethoscope</span>
              </div>
              <h3 className="text-lg font-bold">Diagnosa & Tindakan</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Diagnosa *</label>
                <input
                  {...register('diagnosa')}
                  className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
                  placeholder="Contoh: Pulpitis Irreversibel"
                />
                {errors.diagnosa && <p className="text-red-500 text-xs mt-1">{errors.diagnosa.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tindakan *</label>
                <input
                  {...register('tindakan')}
                  className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
                  placeholder="Contoh: Root Canal Treatment"
                />
                {errors.tindakan && <p className="text-red-500 text-xs mt-1">{errors.tindakan.message}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <h3 className="text-lg font-bold">Dokter Penanggung Jawab</h3>
            </div>
            <div>
              <input
                {...register('dokterPenanggungJawab')}
                className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
                placeholder="Nama dokter"
              />
              {errors.dokterPenanggungJawab && <p className="text-red-500 text-xs mt-1">{errors.dokterPenanggungJawab.message}</p>}
            </div>
          </div>
        </div>

        {/* Resep Obat dan Catatan Tambahan dalam grid 2 kolom (1 di mobile) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">prescriptions</span>
              </div>
              <h3 className="text-lg font-bold">Resep Obat</h3>
            </div>
            <textarea
              {...register('resepObat')}
              className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
              rows={5}
              placeholder="Tuliskan detail resep obat..."
            />
          </div>
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-outline/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">note_alt</span>
              </div>
              <h3 className="text-lg font-bold">Catatan Tambahan</h3>
            </div>
            <textarea
              {...register('catatanTambahan')}
              className="w-full rounded-xl border border-gray-200 p-3 bg-white/80"
              rows={5}
              placeholder="Catatan internal atau instruksi khusus..."
            />
          </div>
        </div>

        {/* Dokumentasi Foto */}
        <div className="lg:col-span-3">
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">add_a_photo</span>
              </div>
              <h3 className="text-lg font-bold">Dokumentasi Foto</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm ring-2 ring-white">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => removeFile(idx)} className="bg-white rounded-full p-2 text-red-500 hover:scale-110">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              <label className="relative aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-white/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/50 transition-colors">
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="material-symbols-outlined text-gray-400 text-3xl">cloud_upload</span>
                <span className="text-xs text-gray-500">Unggah</span>
              </label>
              {Array.from({ length: Math.max(0, 4 - previews.length - 1) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-white/20"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center mt-8">
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/50">
          {onHistoryClick && (
            <button
              type="button"
              onClick={onHistoryClick}
              className="px-6 py-2 rounded-full bg-white/60 border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-white transition-colors"
            >
              Riwayat Kunjungan
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-[#DCA1A1] to-[#663a3b] text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : (visitId ? 'Update EMR' : 'Simpan EMR')}
          </button>
        </div>
      </div>
    </form>
  )
}