// ============================================================================
// FILE: components/admin/EMRForm.tsx (PERBAIKAN - gunakan proxy)
// ============================================================================
// components/admin/EMRForm.tsx - FINAL dengan proxy image
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
  existingPhotos?: any[]
}

// FIX: Fungsi helper untuk membuat proxy URL dari fileId
function getProxyUrl(fileId: string): string {
  if (!fileId) return ''
  return `/api/drive/image/${fileId}`
}

export default function EMRForm({
  patientId,
  initialData,
  visitId,
  onSuccess,
  onHistoryClick,
  existingPhotos = [],
}: EMRFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [completedQueues, setCompletedQueues] = useState<{ id: number; label: string }[]>([])
  const [fetchingQueues, setFetchingQueues] = useState(true)

  // FIX: Inisialisasi dengan proxy URL
  const [existingPhotoList, setExistingPhotoList] = useState<any[]>(
    existingPhotos.map(p => ({
      ...p,
      // FIX: Gunakan proxy URL jika fileId tersedia
      url: p.fileId ? getProxyUrl(p.fileId) : (p.url || p.fileUrl || ''),
    }))
  )
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([])

  const dateInputRef = useRef<HTMLInputElement>(null)
  const initialDataSetRef = useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EMRFormData>({
    resolver: zodResolver(emrSchema),
    defaultValues: initialData || {},
    mode: 'onChange',
  })

  // FIX: Reset form hanya saat visitId berubah
  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) return
    const key = `${visitId || 'new'}_${initialData.queueId || ''}`
    if (initialDataSetRef.current !== key) {
      reset(initialData)
      initialDataSetRef.current = key
    }
  }, [initialData, visitId, reset])

  // FIX: Update existing photos dengan proxy URL
  useEffect(() => {
    const currentIds = existingPhotoList.map(p => p.id).join(',')
    const newIds = existingPhotos.map(p => p.id).join(',')
    if (currentIds !== newIds) {
      const converted = existingPhotos.map(p => ({
        ...p,
        url: p.fileId ? getProxyUrl(p.fileId) : (p.url || p.fileUrl || ''),
      }))
      setExistingPhotoList(converted)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPhotos])

  // FIX: Fetch completed queues
  useEffect(() => {
    let isMounted = true
    const fetchCompletedQueues = async () => {
      try {
        const res = await fetch(`/api/patient/${patientId}/completed-queues`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setCompletedQueues(data.queues)
            if (initialData?.queueId) {
              setValue('queueId', initialData.queueId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch completed queues', error)
      } finally {
        if (isMounted) setFetchingQueues(false)
      }
    }
    fetchCompletedQueues()
    return () => { isMounted = false }
  }, [patientId, setValue, initialData?.queueId])

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
    const urls = selected.map((file) => URL.createObjectURL(file))
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

  const removeExistingPhoto = (photoId: number) => {
    setExistingPhotoList((prev) => prev.filter((p) => p.id !== photoId))
    setDeletedPhotoIds((prev) => [...prev, photoId])
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
    files.forEach((file) => formData.append('photos', file))

    if (deletedPhotoIds.length > 0) {
      formData.append('deletePhotoIds', deletedPhotoIds.join(','))
    }

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
        setDeletedPhotoIds([])
        setExistingPhotoList([])
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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-8">
      {/* Grid utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom kiri: Informasi Kunjungan (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-primary">person_search</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Informasi Kunjungan</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-label font-bold text-on-surface/70 uppercase tracking-wider mb-2">
                  Pilih Antrian Selesai *
                </label>
                <select
                  {...register('queueId', { valueAsNumber: true })}
                  className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Pilih antrian selesai</option>
                  {completedQueues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {getQueueLabel(q)}
                    </option>
                  ))}
                </select>
                {errors.queueId && <p className="text-error text-xs mt-1">{errors.queueId.message}</p>}
                {fetchingQueues && <p className="text-on-surface-variant/60 text-xs mt-1">Memuat daftar antrian...</p>}
                {!fetchingQueues && completedQueues.length === 0 && (
                  <p className="text-error text-xs mt-1">Belum ada antrian selesai untuk pasien ini.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-on-surface/70 uppercase tracking-wider mb-2">
                  Tanggal Follow Up
                </label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('followUpDate')}
                    className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body pr-12"
                    ref={dateInputRef}
                  />
                  <span
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 cursor-pointer hover:text-primary transition"
                    onClick={handleCalendarClick}
                  >
                    calendar_today
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-label font-bold text-on-surface/70 uppercase tracking-wider mb-2">
                  Keluhan Utama
                </label>
                <textarea
                  {...register('keluhanUtama')}
                  className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body resize-none"
                  rows={4}
                  placeholder="Deskripsikan keluhan utama pasien..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kolom kanan: Diagnosa & Tindakan, Dokter PJ */}
        <div className="space-y-6">
          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-secondary">stethoscope</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Diagnosa & Tindakan</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-label font-bold text-on-surface/70 uppercase tracking-wider mb-2">
                  Diagnosa *
                </label>
                <input
                  {...register('diagnosa')}
                  className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body"
                  placeholder="Contoh: Pulpitis Irreversibel"
                />
                {errors.diagnosa && <p className="text-error text-xs mt-1">{errors.diagnosa.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-label font-bold text-on-surface/70 uppercase tracking-wider mb-2">
                  Tindakan *
                </label>
                <input
                  {...register('tindakan')}
                  className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body"
                  placeholder="Contoh: Root Canal Treatment"
                />
                {errors.tindakan && <p className="text-error text-xs mt-1">{errors.tindakan.message}</p>}
              </div>
            </div>
          </div>

          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Dokter Penanggung Jawab</h3>
            </div>
            <div>
              <input
                {...register('dokterPenanggungJawab')}
                className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body"
                placeholder="Nama dokter"
              />
              {errors.dokterPenanggungJawab && <p className="text-error text-xs mt-1">{errors.dokterPenanggungJawab.message}</p>}
            </div>
          </div>
        </div>

        {/* Resep Obat dan Catatan Tambahan */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-tertiary">prescriptions</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Resep Obat</h3>
            </div>
            <textarea
              {...register('resepObat')}
              className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body resize-none"
              rows={5}
              placeholder="Tuliskan detail resep obat..."
            />
          </div>
          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-outline/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-outline">note_alt</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Catatan Tambahan</h3>
            </div>
            <textarea
              {...register('catatanTambahan')}
              className="high-gloss-input w-full rounded-2xl px-5 py-3 font-body resize-none"
              rows={5}
              placeholder="Catatan internal atau instruksi khusus..."
            />
          </div>
        </div>

        {/* Dokumentasi Foto */}
        <div className="lg:col-span-3">
          <div className="diamond-glass rounded-3xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-secondary">add_a_photo</span>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">Dokumentasi Foto</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {existingPhotoList.map((photo) => {
                const imageUrl = photo.fileId ? getProxyUrl(photo.fileId) : (photo.url || photo.fileUrl || '')
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-2xl overflow-hidden group shadow-md ring-2 ring-white/50 transition-all hover:scale-105"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={photo.fileName || 'Foto EMR'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            const placeholder = document.createElement('div')
                            placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs'
                            placeholder.innerHTML = `
                              <div class="flex flex-col items-center gap-1">
                                <span class="material-symbols-outlined text-4xl">broken_image</span>
                                <span class="text-[10px]">${photo.fileName || 'gagal muat'}</span>
                              </div>
                            `
                            parent.appendChild(placeholder)
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <div className="flex flex-col items-center gap-1">
                          <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                          <span className="text-[10px]">{photo.fileName || 'No image'}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photo.id)}
                        className="bg-white rounded-full p-2 text-error hover:scale-110 transition"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                )
              })}
              {previews.map((src, idx) => (
                <div
                  key={`preview-${idx}`}
                  className="relative aspect-square rounded-2xl overflow-hidden group shadow-md ring-2 ring-white/50 transition-all hover:scale-105"
                >
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="bg-white rounded-full p-2 text-error hover:scale-110 transition"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              <label className="relative aspect-square rounded-2xl border-2 border-dashed border-outline-variant/50 bg-white/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/50 transition-all hover:shadow-md">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-on-surface-variant/60 text-3xl">cloud_upload</span>
                <span className="text-xs text-on-surface-variant/70 font-label">Unggah</span>
              </label>
            </div>
            {deletedPhotoIds.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-2">{deletedPhotoIds.length} foto akan dihapus saat disimpan.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center mt-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/60 backdrop-blur-md rounded-full px-6 py-2 shadow-xl border border-white/60">
          {onHistoryClick && (
            <button
              type="button"
              onClick={onHistoryClick}
              className="px-6 py-2 rounded-full border border-primary/30 text-primary font-label font-bold text-sm hover:bg-white/60 transition-all shadow-sm"
            >
              Riwayat Kunjungan
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-[#623738] text-white font-label font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : visitId ? 'Update EMR' : 'Simpan EMR'}
          </button>
        </div>
      </div>
    </form>
  )
}