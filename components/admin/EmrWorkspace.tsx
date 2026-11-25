'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import PhotoLightbox, { type LightboxPhoto } from '@/components/admin/PhotoLightbox'
import {
  DangerConfirmModal,
  SolidModal,
  type DangerConfirmState,
} from '@/components/ui/sanctuary'
import {
  DEFAULT_LEGEND,
  DEFAULT_TEETH_QUADRANTS,
  embedOdontogram,
  formatDateID,
  formatQueueNumber,
  parseOdontogram,
  stripOdontogram,
  type ThemeTokens,
  type ToothMark,
} from '@/lib/ui-theme'
import {
  QUEUE_STATUS_LABEL,
  type PatientItem,
  type QueueItem,
  type VisitItem,
} from '@/lib/dashboard-types'

const PROCEDURE_CHIPS = [
  'Scaling & Polishing',
  'Tambal Komposit',
  'Perawatan Saluran Akar',
  'Pencabutan Gigi',
  'Bleaching',
]

type LegendItem = { id: string; label: string; color: string }
type QueueOption = { id: number; label: string }

type EmrWorkspaceProps = {
  theme: ThemeTokens
  queues: QueueItem[]
  initialPatient?: PatientItem | null
  initialQueueId?: number | null
  activeOperator: string
  onSaved?: () => void
  onUnauthorized?: () => void
}

function emptyForm(doctor = 'drg. Salsabila') {
  return {
    queueId: 0,
    followUp: '',
    complaint: '',
    diagnosis: '',
    procedure: 'Scaling & Polishing',
    doctor,
    prescription: '',
    notes: '',
  }
}

export default function EmrWorkspace({
  theme,
  queues,
  initialPatient,
  initialQueueId,
  activeOperator,
  onSaved,
  onUnauthorized,
}: EmrWorkspaceProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialPatient ? 'form' : 'list')
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(initialPatient || null)
  const [queueOptions, setQueueOptions] = useState<QueueOption[]>([])
  const [form, setForm] = useState(emptyForm())
  const [visits, setVisits] = useState<VisitItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState('')
  const [loadingContext, setLoadingContext] = useState(false)

  // Odontogram
  const [odontoMode, setOdontoMode] = useState<'blank' | 'interactive' | 'scan'>('interactive')
  const [editTeethStructure, setEditTeethStructure] = useState(false)
  const [teethQuadrants, setTeethQuadrants] = useState(DEFAULT_TEETH_QUADRANTS)
  const [toothMarks, setToothMarks] = useState<Record<string, ToothMark>>({})
  const [legendItems, setLegendItems] = useState<LegendItem[]>(DEFAULT_LEGEND)
  const [activeBrush, setActiveBrush] = useState<LegendItem | null>(DEFAULT_LEGEND[0])
  const [editingLegend, setEditingLegend] = useState<LegendItem | null>(null)
  const [legendDraft, setLegendDraft] = useState({ label: '', color: '#D08080' })
  const [newToothInput, setNewToothInput] = useState('')
  const [newToothQuadrant, setNewToothQuadrant] = useState<'ur' | 'ul' | 'lr' | 'll'>('ur')
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagColor, setNewTagColor] = useState('#D08080')

  // Documentation
  const [existingPhotos, setExistingPhotos] = useState<VisitItem['photos']>([])
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([])
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([])
  const [jawScanFile, setJawScanFile] = useState<File | null>(null)
  const [jawScanPreview, setJawScanPreview] = useState<string | null>(null)
  const [dangerConfirm, setDangerConfirm] = useState<DangerConfirmState>(null)
  const [photoViewer, setPhotoViewer] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null)

  const topRef = useRef<HTMLDivElement | null>(null)
  const initialApplied = useRef(false)

  const handleAuthFailure = useCallback(() => {
    if (onUnauthorized) onUnauthorized()
    else router.replace('/admin/login')
  }, [onUnauthorized, router])

  const fetchPatients = useCallback(async () => {
    setLoadingPatients(true)
    try {
      const res = await fetch('/api/patients?limit=100')
      if (res.status === 401) return handleAuthFailure()
      const data = await res.json()
      if (res.ok) setPatients(data.patients || [])
    } catch {
      toast.error('Gagal memuat daftar pasien')
    } finally {
      setLoadingPatients(false)
    }
  }, [handleAuthFailure])

  const loadHistory = useCallback(
    async (patientId: number): Promise<VisitItem[]> => {
      try {
        const res = await fetch(`/api/patient/${patientId}/emr`)
        if (res.status === 401) {
          handleAuthFailure()
          return []
        }
        const data = await res.json()
        if (res.ok) {
          const list = (data.data || []) as VisitItem[]
          setVisits(list)
          return list
        }
      } catch {
        toast.error('Gagal memuat riwayat kunjungan')
      }
      return []
    },
    [handleAuthFailure]
  )

  const loadQueueOptions = useCallback(
    async (patientId: number) => {
      const options = new Map<number, string>()

      queues
        .filter((q) => q.patientId === patientId)
        .forEach((q) => {
          options.set(
            q.id,
            `${formatQueueNumber(q.queueNumber)} — ${QUEUE_STATUS_LABEL[q.status] || q.status}`
          )
        })

      try {
        const res = await fetch(`/api/patient/${patientId}/completed-queues`)
        if (res.status === 401) {
          handleAuthFailure()
        } else {
          const data = await res.json()
          if (res.ok && Array.isArray(data.queues)) {
            data.queues.forEach((q: { id: number; label: string }) => {
              if (!options.has(q.id)) options.set(q.id, q.label)
            })
          }
        }
      } catch {
        // Today's queues above remain available.
      }

      return Array.from(options.entries()).map(([id, label]) => ({ id, label }))
    },
    [queues, handleAuthFailure]
  )

  const resetOdontogram = () => {
    setOdontoMode('interactive')
    setEditTeethStructure(false)
    setTeethQuadrants(DEFAULT_TEETH_QUADRANTS)
    setToothMarks({})
    setLegendItems(DEFAULT_LEGEND)
    setActiveBrush(DEFAULT_LEGEND[0])
    setEditingLegend(null)
    setNewToothInput('')
    setNewToothQuadrant('ur')
    setNewTagLabel('')
    setNewTagColor('#D08080')
    setJawScanFile(null)
    setJawScanPreview(null)
  }

  const toLightboxPhotos = (photos: VisitItem['photos']): LightboxPhoto[] =>
    photos
      .map((photo, idx) => ({
        src: photo.url || (photo.fileId ? `/api/drive/image/${photo.fileId}` : ''),
        name: photo.fileName || `Foto ${idx + 1}`,
      }))
      .filter((photo) => photo.src.length > 0)

  const openPhotoViewer = (photos: VisitItem['photos'], index: number) => {
    const selected = photos[index]
    const selectedSrc = selected?.url || (selected?.fileId ? `/api/drive/image/${selected.fileId}` : '')
    const list = toLightboxPhotos(photos)
    if (list.length === 0) {
      toast.warning('Tidak ada foto yang bisa ditampilkan')
      return
    }
    const selectedIndex = Math.max(
      0,
      list.findIndex((photo) => photo.src === selectedSrc)
    )
    setPhotoViewer({ photos: list, index: selectedIndex })
  }

  const openSinglePhotoViewer = (src: string, name: string) => {
    if (!src) return
    setPhotoViewer({ photos: [{ src, name }], index: 0 })
  }

  const openPatient = useCallback(
    async (patient: PatientItem, queueId?: number | null, editVisit?: VisitItem) => {
      setSelectedPatient(patient)
      setViewMode('form')
      setLoadingContext(true)
      setEditingVisitId(null)
      setExistingPhotos([])
      setDeletedPhotoIds([])
      setNewPhotoFiles([])
      setNewPhotoPreviews([])
      setPhotoViewer(null)
      setSavedToast('')
      resetOdontogram()

      const currentQueue = queueId ? queues.find((q) => q.id === queueId) : undefined
      setForm({
        ...emptyForm('drg. Salsabila'),
        queueId: 0,
        complaint: currentQueue?.keluhan || '',
      })

      try {
        const [options, history] = await Promise.all([
          loadQueueOptions(patient.id),
          loadHistory(patient.id),
        ])

        let finalOptions = options
        if (!editVisit) {
          // A queue can only own one EMR record (unique constraint in the API).
          const usedQueueIds = new Set(history.map((visit) => visit.queueId))
          finalOptions = options.filter((option) => !usedQueueIds.has(option.id))
        }
        if (editVisit && !finalOptions.some((o) => o.id === editVisit.queueId)) {
          finalOptions = [
            ...finalOptions,
            {
              id: editVisit.queueId,
              label: editVisit.queueNumber
                ? `${formatQueueNumber(editVisit.queueNumber)} — ${formatDateID(editVisit.queueDate)}`
                : `Kunjungan #${editVisit.queueId}`,
            },
          ]
        }
        setQueueOptions(finalOptions)

        if (editVisit) {
          const parsed = parseOdontogram(editVisit.catatanTambahan)
          setEditingVisitId(editVisit.id)
          setForm({
            queueId: editVisit.queueId,
            followUp: editVisit.followUpDate ? editVisit.followUpDate.slice(0, 10) : '',
            complaint: editVisit.keluhanUtama || '',
            diagnosis: editVisit.diagnosa || '',
            procedure: editVisit.tindakan || '',
            doctor: editVisit.dokterPenanggungJawab || 'drg. Salsabila',
            prescription: editVisit.resepObat || '',
            notes: stripOdontogram(editVisit.catatanTambahan),
          })
          if (parsed) {
            setToothMarks(parsed.marks)
            setTeethQuadrants(parsed.quadrants)
            setLegendItems(parsed.legend)
            setActiveBrush(parsed.legend[0] || null)
          }
          setExistingPhotos(editVisit.photos || [])
        } else {
          const target =
            finalOptions.find((o) => o.id === queueId)?.id ||
            finalOptions[0]?.id ||
            0
          setForm((prev) => ({ ...prev, queueId: target }))
        }
      } catch {
        toast.error('Gagal memuat data rekam medis pasien')
      } finally {
        setLoadingContext(false)
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    },
    [activeOperator, queues, loadQueueOptions, loadHistory]
  )

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  useEffect(() => {
    if (initialPatient && !initialApplied.current) {
      initialApplied.current = true
      openPatient(initialPatient, initialQueueId ?? null)
    }
  }, [initialPatient, initialQueueId, openPatient])

  const handleToothClick = (toothId: string) => {
    if (!activeBrush) {
      toast.info('Tambahkan template tanda terlebih dahulu sebelum memetakan gigi.')
      return
    }
    const existing = toothMarks[toothId]
    if (existing && existing.label === activeBrush.label && existing.color === activeBrush.color) {
      setDangerConfirm({
        title: `Hapus Tanda Gigi ${toothId}?`,
        message: `Tanda "${existing.label}" pada nomor gigi ${toothId} akan dihapus dari peta odontogram.`,
        confirmLabel: 'Hapus Tanda',
        onConfirm: () => {
          setToothMarks((prev) => {
            const next = { ...prev }
            delete next[toothId]
            return next
          })
          setDangerConfirm(null)
        },
      })
      return
    }
    setToothMarks((prev) => ({
      ...prev,
      [toothId]: { color: activeBrush.color, label: activeBrush.label },
    }))
  }

  const handleAddToothNumber = () => {
    const cleaned = newToothInput.trim().replace(/\D/g, '')
    if (!cleaned) return
    const allExisting = [
      ...teethQuadrants.ur,
      ...teethQuadrants.ul,
      ...teethQuadrants.lr,
      ...teethQuadrants.ll,
    ]
    if (allExisting.includes(cleaned)) {
      toast.info(`Nomor gigi ${cleaned} sudah ada pada susunan.`)
      setNewToothInput('')
      return
    }
    setTeethQuadrants((prev) => {
      const updated = [...prev[newToothQuadrant], cleaned]
      updated.sort((a, b) => {
        const na = parseInt(a, 10)
        const nb = parseInt(b, 10)
        return newToothQuadrant === 'ur' || newToothQuadrant === 'lr' ? nb - na : na - nb
      })
      return { ...prev, [newToothQuadrant]: updated }
    })
    setNewToothInput('')
  }

  const requestRemoveToothNumber = (quadrantKey: 'ur' | 'ul' | 'lr' | 'll', toothId: string) => {
    setDangerConfirm({
      title: `Hapus Nomor Gigi ${toothId}?`,
      message: `Nomor gigi ${toothId} beserta penanda kondisinya akan dihapus dari susunan odontogram ini.`,
      confirmLabel: 'Hapus Nomor Gigi',
      onConfirm: () => {
        setTeethQuadrants((prev) => ({
          ...prev,
          [quadrantKey]: prev[quadrantKey].filter((t) => t !== toothId),
        }))
        setToothMarks((prev) => {
          const next = { ...prev }
          delete next[toothId]
          return next
        })
        setDangerConfirm(null)
      },
    })
  }

  const handleAddCustomLegend = () => {
    if (!newTagLabel.trim()) {
      toast.error('Nama template tanda wajib diisi.')
      return
    }
    const item = { id: `tag-${Date.now()}`, label: newTagLabel.trim(), color: newTagColor }
    setLegendItems((prev) => [...prev, item])
    setActiveBrush(item)
    setNewTagLabel('')
  }

  const openLegendEditor = (item: LegendItem) => {
    setEditingLegend(item)
    setLegendDraft({ label: item.label, color: item.color })
  }

  const saveLegendEdit = () => {
    if (!editingLegend) return
    const label = legendDraft.label.trim()
    if (!label) {
      toast.error('Nama template tanda wajib diisi.')
      return
    }
    const updated: LegendItem = { ...editingLegend, label, color: legendDraft.color }
    setLegendItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    setActiveBrush((prev) => (prev?.id === updated.id ? updated : prev))
    setToothMarks((prev) => {
      const next = { ...prev }
      Object.entries(next).forEach(([tooth, mark]) => {
        if (mark.label === editingLegend.label && mark.color === editingLegend.color) {
          next[tooth] = { label: updated.label, color: updated.color }
        }
      })
      return next
    })
    setEditingLegend(null)
    toast.success('Template tanda diperbarui')
  }

  const requestRemoveLegend = (item: LegendItem) => {
    setDangerConfirm({
      title: `Hapus Template "${item.label}"?`,
      message:
        'Template ini akan dihapus dari daftar. Tanda gigi yang memakai template ini juga akan dibersihkan.',
      confirmLabel: 'Hapus Template',
      onConfirm: () => {
        const remaining = legendItems.filter((legend) => legend.id !== item.id)
        setLegendItems(remaining)
        setToothMarks((prev) => {
          const next = { ...prev }
          Object.entries(next).forEach(([tooth, mark]) => {
            if (mark.label === item.label && mark.color === item.color) delete next[tooth]
          })
          return next
        })
        setActiveBrush((prev) => (prev?.id === item.id ? remaining[0] || null : prev))
        if (editingLegend?.id === item.id) setEditingLegend(null)
        setDangerConfirm(null)
      },
    })
  }

  const requestClearLegends = () => {
    setDangerConfirm({
      title: 'Hapus Semua Template Tanda?',
      message:
        'Semua template odontogram akan dihapus dan peta gigi dikosongkan. Anda bisa menambahkan template baru sesuai kebutuhan dokter.',
      confirmLabel: 'Hapus Semua',
      onConfirm: () => {
        setLegendItems([])
        setToothMarks({})
        setActiveBrush(null)
        setEditingLegend(null)
        setDangerConfirm(null)
        toast.success('Semua template tanda dihapus')
      },
    })
  }

  const copyFindingsToDiagnosis = () => {
    const entries = Object.entries(toothMarks)
    if (entries.length === 0) {
      toast.info('Belum ada temuan gigi untuk disalin.')
      return
    }
    const summary = entries.map(([tooth, info]) => `Gigi ${tooth} (${info.label})`).join(', ')
    setForm((prev) => ({
      ...prev,
      diagnosis: prev.diagnosis ? `${prev.diagnosis}; ${summary}` : summary,
    }))
  }

  const handleSaveEmr = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return
    if (!form.queueId) {
      toast.error('Pilih referensi antrean terlebih dahulu.')
      return
    }
    if (!form.diagnosis.trim() || !form.procedure.trim() || !form.doctor.trim()) {
      toast.error('Diagnosa, tindakan, dan dokter penanggung jawab wajib diisi.')
      return
    }

    setSaving(true)
    const body = new FormData()
    body.append('queueId', String(form.queueId))
    body.append('keluhanUtama', form.complaint)
    body.append('diagnosa', form.diagnosis.trim())
    body.append('tindakan', form.procedure.trim())
    body.append('resepObat', form.prescription)
    body.append(
      'catatanTambahan',
      embedOdontogram(form.notes, {
        marks: toothMarks,
        quadrants: teethQuadrants,
        legend: legendItems,
      })
    )
    body.append('dokterPenanggungJawab', form.doctor.trim())
    if (form.followUp) body.append('followUpDate', form.followUp)
    if (deletedPhotoIds.length > 0) body.append('deletePhotoIds', deletedPhotoIds.join(','))
    newPhotoFiles.forEach((file) => body.append('photos', file))
    if (jawScanFile) body.append('photos', jawScanFile)

    const url = editingVisitId
      ? `/api/patient/${selectedPatient.id}/emr?visitId=${editingVisitId}`
      : `/api/patient/${selectedPatient.id}/emr`

    try {
      const res = await fetch(url, { method: editingVisitId ? 'PUT' : 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleAuthFailure()
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan rekam medis')
        return
      }

      const message = editingVisitId
        ? 'Rekam medis kunjungan berhasil diperbarui.'
        : 'EMR baru tersimpan ke riwayat kunjungan pasien.'
      setSavedToast(message)
      toast.success(message)
      if (onSaved) onSaved()

      if (!editingVisitId && data.visit_id) {
        setEditingVisitId(Number(data.visit_id))
      }

      const [refreshedHistory] = await Promise.all([
        loadHistory(selectedPatient.id),
        loadQueueOptions(selectedPatient.id),
      ])

      const savedVisitId = editingVisitId || Number(data.visit_id)
      const savedVisit = refreshedHistory.find((visit) => visit.id === savedVisitId)
      setExistingPhotos(savedVisit?.photos || [])
      setDeletedPhotoIds([])
      setNewPhotoFiles([])
      setNewPhotoPreviews([])
      setJawScanFile(null)
      setJawScanPreview(null)
      setTimeout(() => setSavedToast(''), 3600)
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan EMR')
    } finally {
      setSaving(false)
    }
  }

  const filteredPatients = patients.filter((p) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      p.name.toLowerCase().includes(term) ||
      (p.phone || '').toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
    )
  })

  /* ------------------------------------------------------------------ LIST */
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div>
          <span className={`text-xs font-medium ${theme.roseLabel}`}>Electronic Medical Record</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
            Pilih Pasien untuk EMR
          </h2>
        </div>

        <div className="relative">
          <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSubtle}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor HP, atau email..."
            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
          />
        </div>

        <div className={`rounded-3xl border overflow-hidden ${theme.elevatedCard}`}>
          <table className="w-full table-fixed text-left border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-10 sm:w-12" />
              <col />
              <col className="w-20 sm:w-28" />
              <col className="hidden lg:table-column lg:w-44" />
              <col className="w-20 sm:w-24" />
            </colgroup>
            <thead>
              <tr className={`border-b ${theme.hairline} text-[10px] sm:text-xs font-medium ${theme.textSubtle}`}>
                <th className="py-3 px-2 sm:px-4">No</th>
                <th className="py-3 px-2 sm:px-4">Nama Lengkap</th>
                <th className="py-3 px-2 sm:px-4">No. HP</th>
                <th className="hidden lg:table-cell py-3 px-2 sm:px-4">Email</th>
                <th className="py-3 px-2 sm:px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.divideHairline} text-sm`}>
              {loadingPatients ? (
                <tr>
                  <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                    Memuat data pasien...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                    Tidak ada pasien ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, index) => (
                  <tr key={patient.id} className="transition-colors hover:bg-[#D08080]/[0.04]">
                    <td className={`py-3 px-2 sm:px-4 text-[10px] sm:text-xs font-semibold ${theme.roseLabel}`}>
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-2 sm:px-4 font-medium break-words">{patient.name}</td>
                    <td className={`py-3 px-2 sm:px-4 text-[10px] sm:text-xs break-words ${theme.textMuted}`}>
                      {patient.phone || '-'}
                    </td>
                    <td className={`hidden lg:table-cell py-3 px-2 sm:px-4 text-xs break-all ${theme.textSubtle}`}>
                      {patient.email || '-'}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPatient(patient)}
                        className={`min-h-10 w-full px-2 sm:w-auto sm:px-3 rounded-full border text-[10px] sm:text-xs font-medium hover:border-[#D08080] transition-colors cursor-pointer ${theme.pillSurface}`}
                      >
                        Kelola EMR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ FORM */
  const quadrantCards: { key: 'ur' | 'ul' | 'lr' | 'll'; title: string }[] = [
    { key: 'ur', title: 'Rahang Atas Kanan' },
    { key: 'ul', title: 'Rahang Atas Kiri' },
    { key: 'lr', title: 'Rahang Bawah Kanan' },
    { key: 'll', title: 'Rahang Bawah Kiri' },
  ]

  return (
    <div ref={topRef} className="min-w-0 space-y-5 sm:space-y-8">
      <form onSubmit={handleSaveEmr} className="min-w-0 space-y-5 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('list')
                setEditingVisitId(null)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${theme.textSubtle} hover:text-[#D08080] mb-1.5 cursor-pointer`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar Pasien EMR</span>
            </button>
            <h2 className="text-xl sm:text-3xl font-semibold tracking-tight break-words">
              {editingVisitId ? 'Edit EMR' : 'EMR'} —{' '}
              <span className={theme.roseAccent}>{selectedPatient?.name}</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {editingVisitId && (
              <button
                type="button"
                onClick={() => {
                  setEditingVisitId(null)
                  setExistingPhotos([])
                  setDeletedPhotoIds([])
                  resetOdontogram()
                  setForm({ ...emptyForm('drg. Salsabila'), queueId: queueOptions[0]?.id || 0 })
                }}
                className={`min-h-11 px-4 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        {/* ODONTOGRAM */}
        <div className={`min-w-0 rounded-3xl border p-4 sm:p-7 space-y-4 sm:space-y-5 ${theme.elevatedCard}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className={`text-xs font-medium ${theme.roseLabel}`}>
                Standar FDI (32 Gigi Dewasa) &amp; Kustomisasi
              </span>
              <h3 className="mt-0.5 text-base font-semibold">
                Peta Gigi Interaktif / Upload Scan Rahang
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'blank', label: 'Kosongkan' },
                { id: 'interactive', label: 'Odontogram FDI' },
                { id: 'scan', label: 'Upload Scan Rahang' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    if (mode.id === 'blank') {
                      if (Object.keys(toothMarks).length > 0) {
                        setDangerConfirm({
                          title: 'Kosongkan Semua Tanda Gigi?',
                          message: 'Seluruh penanda kondisi pada peta odontogram saat ini akan dibersihkan.',
                          confirmLabel: 'Ya, Kosongkan',
                          onConfirm: () => {
                            setToothMarks({})
                            setOdontoMode('blank')
                            setDangerConfirm(null)
                          },
                        })
                      } else {
                        setOdontoMode('blank')
                      }
                    } else {
                      setOdontoMode(mode.id as 'interactive' | 'scan')
                    }
                  }}
                  className={`min-h-10 px-3.5 py-2 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    odontoMode === mode.id
                      ? 'bg-[#D08080] border-[#D08080] text-white'
                      : theme.pillSurface
                  }`}
                >
                  {mode.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setEditTeethStructure((prev) => !prev)}
                className={`inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                  editTeethStructure
                    ? 'bg-[#8B4F4F] border-[#8B4F4F] text-white'
                    : `${theme.pillSurface} hover:border-[#D08080]`
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{editTeethStructure ? 'Selesai Edit Gigi' : 'Edit Susunan Gigi'}</span>
              </button>
            </div>
          </div>

          {editTeethStructure && (
            <div className={`rounded-2xl border p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 ${theme.inputBg}`}>
              <div className="min-w-0 text-xs max-w-lg">
                <span className="font-semibold text-[#D08080]">Mode Edit Susunan Gigi Aktif:</span>{' '}
                Tambah nomor gigi baru (misal: 19, 29, atau gigi susu 51–85) atau klik tanda{' '}
                <strong>×</strong> pada kotak gigi untuk menghapus.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newToothQuadrant}
                  onChange={(e) => setNewToothQuadrant(e.target.value as typeof newToothQuadrant)}
                  className={`min-h-10 max-w-full min-w-0 flex-1 px-3 py-2 rounded-xl border text-xs sm:flex-none ${theme.inputBg}`}
                  aria-label="Pilih kuadran gigi"
                >
                  <option value="ur">Rahang Atas Kanan (11–18)</option>
                  <option value="ul">Rahang Atas Kiri (21–28)</option>
                  <option value="lr">Rahang Bawah Kanan (41–48)</option>
                  <option value="ll">Rahang Bawah Kiri (31–38)</option>
                </select>
                <input
                  type="text"
                  maxLength={2}
                  value={newToothInput}
                  onChange={(e) => setNewToothInput(e.target.value)}
                  placeholder="No. Gigi"
                  className={`w-full min-w-0 px-3 py-2 rounded-xl border text-xs sm:w-28 ${theme.inputBg}`}
                />
                <button
                  type="button"
                  onClick={handleAddToothNumber}
                  className="min-h-10 px-3.5 py-2 rounded-xl bg-[#D08080] text-white text-xs font-medium cursor-pointer"
                >
                  + Tambah Gigi
                </button>
              </div>
            </div>
          )}

          {odontoMode === 'scan' && (
            <div className="space-y-4">
              <label className="flex min-h-32 flex-col items-center justify-center py-7 px-6 rounded-2xl border border-dashed border-[#D08080]/50 cursor-pointer hover:bg-[#D08080]/5 transition-colors">
                <Upload className="w-6 h-6 text-[#D08080]" />
                <span className="mt-2 text-xs font-medium">
                  Unggah Foto Intraoral / Scan Rontgen Rahang
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setJawScanFile(file)
                      setJawScanPreview(URL.createObjectURL(file))
                    }
                  }}
                />
              </label>
              {jawScanPreview && (
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => openSinglePhotoViewer(jawScanPreview, 'Scan Rahang')}
                    aria-label="Perbesar scan rahang"
                    className="group relative block cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={jawScanPreview}
                      alt="Scan Rahang"
                      className="max-h-56 rounded-2xl border border-[#D08080]/40 transition group-hover:border-[#D08080]"
                    />
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                      <ZoomIn className="h-3 w-3" />
                      Perbesar
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDangerConfirm({
                        title: 'Hapus Foto Scan Rahang?',
                        message: 'Gambar scan rontgen/rahang yang diunggah akan dihapus dari lembar EMR ini.',
                        confirmLabel: 'Hapus Gambar',
                        onConfirm: () => {
                          setJawScanFile(null)
                          setJawScanPreview(null)
                          setDangerConfirm(null)
                        },
                      })
                    }
                    className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow cursor-pointer"
                    aria-label="Hapus scan rahang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className={`text-xs font-medium ${theme.roseLabel}`}>
                  Template Tanda Odontogram
                </span>
                <span className={`ml-2 text-[11px] ${theme.textSubtle}`}>
                  {legendItems.length} template aktif
                </span>
              </div>
              {legendItems.length > 0 && (
                <button
                  type="button"
                  onClick={requestClearLegends}
                  className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-full border border-rose-500/40 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Template</span>
                </button>
              )}
            </div>

            <div className="max-h-48 sm:max-h-44 overflow-y-auto overscroll-contain pr-1 space-y-2">
              {legendItems.length === 0 ? (
                <p className={`text-xs py-2 ${theme.textSubtle}`}>
                  Belum ada template. Tambahkan tanda baru untuk mulai memetakan kondisi gigi.
                </p>
              ) : (
                legendItems.map((leg) => (
                  <div
                    key={leg.id}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                      activeBrush?.id === leg.id
                        ? 'border-[#D08080] bg-[#D08080]/10'
                        : theme.pillSurface
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveBrush(leg)}
                      aria-pressed={activeBrush?.id === leg.id}
                      className="flex-1 min-w-0 inline-flex items-center gap-2 text-left text-xs cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: leg.color }}
                      />
                      <span className="truncate font-medium">{leg.label}</span>
                      {activeBrush?.id === leg.id && (
                        <span className="text-[10px] font-semibold text-[#D08080] shrink-0">
                          AKTIF
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openLegendEditor(leg)}
                      aria-label={`Edit template ${leg.label}`}
                      title={`Edit nama/warna ${leg.label}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#D08080] hover:bg-[#D08080]/15 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestRemoveLegend(leg)}
                      aria-label={`Hapus template ${leg.label}`}
                      title={`Hapus ${leg.label}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-10 w-10 shrink-0 rounded-full border-0 bg-transparent cursor-pointer"
                aria-label="Warna tanda baru"
              />
              <input
                type="text"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="Nama template tanda baru..."
                className={`min-h-10 min-w-0 flex-1 px-3 py-2 rounded-full border text-xs focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
              <button
                type="button"
                onClick={handleAddCustomLegend}
                className="min-h-10 px-3.5 py-2 rounded-full bg-[#D08080] text-white text-xs font-medium cursor-pointer"
              >
                + Tambah Tanda
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quadrantCards.map((quadrant) => (
                <div key={quadrant.key} className={`min-w-0 rounded-2xl border p-3 ${theme.inputBg}`}>
                  <div className={`mb-2 text-[11px] font-medium ${theme.textSubtle}`}>
                    {quadrant.title}
                  </div>
                  <div className="grid grid-cols-4 justify-items-center gap-2">
                    {teethQuadrants[quadrant.key].map((t) => {
                      const mark = toothMarks[t]
                      return (
                        <div key={t} className="relative">
                          <button
                            type="button"
                            onClick={() => handleToothClick(t)}
                            style={
                              mark
                                ? {
                                    backgroundColor: `${mark.color}28`,
                                    borderColor: mark.color,
                                  }
                                : undefined
                            }
                            className={`flex h-11 w-10 flex-col items-center justify-center rounded-xl border text-xs font-medium transition-transform hover:-translate-y-0.5 cursor-pointer sm:w-9 ${
                              mark ? 'font-semibold' : theme.pillSurface
                            }`}
                            aria-label={`Gigi ${t}${mark ? `, ${mark.label}` : ''}`}
                          >
                            <span>{t}</span>
                            {mark && (
                              <span
                                className="mt-1 h-2 w-2 rounded-full"
                                style={{ backgroundColor: mark.color }}
                              />
                            )}
                          </button>
                          {editTeethStructure && (
                            <button
                              type="button"
                              onClick={() => requestRemoveToothNumber(quadrant.key, t)}
                              className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-sm text-white shadow cursor-pointer"
                              aria-label={`Hapus gigi ${t}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <span className={theme.textSubtle}>
                Total gigi dipetakan:{' '}
                {teethQuadrants.ur.length +
                  teethQuadrants.ul.length +
                  teethQuadrants.lr.length +
                  teethQuadrants.ll.length}{' '}
                • Temuan aktif: {Object.keys(toothMarks).length} gigi
              </span>
              <button
                type="button"
                onClick={copyFindingsToDiagnosis}
                className="inline-flex min-h-10 items-center gap-1.5 text-[#D08080] font-medium hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Salin Temuan ke Diagnosa</span>
              </button>
            </div>
          </div>
        </div>

        {/* VISIT DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className={`min-w-0 rounded-3xl border p-4 sm:p-6 space-y-3 sm:space-y-4 ${theme.elevatedCard}`}>
            <h3 className="font-semibold text-sm text-[#D08080]">Informasi Kunjungan</h3>

            <div>
              <label htmlFor="emr-queue" className="block text-xs font-medium mb-1.5">
                Referensi Antrean *
              </label>
              <select
                id="emr-queue"
                value={form.queueId || ''}
                onChange={(e) => setForm({ ...form, queueId: Number(e.target.value) })}
                disabled={!!editingVisitId}
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] disabled:opacity-60 disabled:cursor-not-allowed ${theme.inputBg}`}
                required
              >
                <option value="">Pilih antrean pasien</option>
                {queueOptions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
              {editingVisitId ? (
                <p className={`mt-1.5 text-[11px] ${theme.textSubtle}`}>
                  Referensi antrean dikunci saat memperbarui EMR agar riwayat tetap utuh.
                </p>
              ) : queueOptions.length === 0 ? (
                <p className={`mt-1.5 text-[11px] ${theme.textSubtle}`}>
                  Pasien ini belum memiliki antrean. Daftarkan antrean terlebih dahulu pada modul Antrian.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="emr-followup" className="block text-xs font-medium mb-1.5">
                Tanggal Follow Up
              </label>
              <input
                id="emr-followup"
                type="date"
                value={form.followUp}
                onChange={(e) => setForm({ ...form, followUp: e.target.value })}
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
            </div>

            <div>
              <label htmlFor="emr-complaint" className="block text-xs font-medium mb-1.5">
                Keluhan Utama
              </label>
              <textarea
                id="emr-complaint"
                rows={3}
                value={form.complaint}
                onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                placeholder="Deskripsikan keluhan utama pasien..."
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
            </div>
          </div>

          <div className={`min-w-0 rounded-3xl border p-4 sm:p-6 space-y-3 sm:space-y-4 ${theme.elevatedCard}`}>
            <h3 className="font-semibold text-sm text-[#D08080]">Diagnosa, Tindakan &amp; Dokter</h3>

            <div>
              <label htmlFor="emr-diagnosis" className="block text-xs font-medium mb-1.5">
                Diagnosa *
              </label>
              <input
                id="emr-diagnosis"
                type="text"
                required
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Contoh: Pulpitis Irreversibel"
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
            </div>

            <div>
              <label htmlFor="emr-procedure" className="block text-xs font-medium mb-1.5">
                Tindakan *
              </label>
              <input
                id="emr-procedure"
                type="text"
                required
                value={form.procedure}
                onChange={(e) => setForm({ ...form, procedure: e.target.value })}
                placeholder="Contoh: Root Canal Treatment"
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PROCEDURE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setForm({ ...form, procedure: chip })}
                    className={`min-h-9 px-3 py-1.5 rounded-full border text-xs hover:border-[#D08080] transition-colors cursor-pointer ${theme.pillSurface}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="emr-doctor" className="block text-xs font-medium mb-1.5">
                Dokter Penanggung Jawab *
              </label>
              <input
                id="emr-doctor"
                type="text"
                value={form.doctor}
                onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                placeholder="Nama dokter"
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
            </div>
          </div>
        </div>

        {/* PRESCRIPTION / NOTES / PHOTOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <div className={`min-w-0 rounded-3xl border p-4 sm:p-6 space-y-3 ${theme.elevatedCard}`}>
            <label htmlFor="emr-prescription" className="block font-semibold text-sm text-[#D08080]">
              Resep Obat
            </label>
            <textarea
              id="emr-prescription"
              rows={3}
              value={form.prescription}
              onChange={(e) => setForm({ ...form, prescription: e.target.value })}
              placeholder="Tuliskan detail resep obat..."
              className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
            />
          </div>

          <div className={`min-w-0 rounded-3xl border p-4 sm:p-6 space-y-3 ${theme.elevatedCard}`}>
            <label htmlFor="emr-notes" className="block font-semibold text-sm text-[#D08080]">
              Catatan Tambahan
            </label>
            <textarea
              id="emr-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Catatan internal atau instruksi khusus..."
              className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
            />
          </div>

          <div className={`min-w-0 rounded-3xl border p-4 sm:p-6 space-y-3 ${theme.elevatedCard}`}>
            <span className="block font-semibold text-sm text-[#D08080]">Dokumentasi Foto</span>
            <label className="flex min-h-28 flex-col items-center justify-center py-5 px-3 rounded-2xl border border-dashed border-[#D08080]/50 text-xs cursor-pointer hover:bg-[#D08080]/5 transition-colors">
              <Upload className="w-4 h-4 text-[#D08080]" />
              <span className="mt-1.5 font-medium">Unggah Foto Klinis</span>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  setNewPhotoFiles((prev) => [...prev, ...files])
                  setNewPhotoPreviews((prev) => [
                    ...prev,
                    ...files.map((file) => URL.createObjectURL(file)),
                  ])
                }}
              />
            </label>
            {(existingPhotos.length > 0 || newPhotoPreviews.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {existingPhotos.map((photo, idx) => (
                  <div key={`existing-${photo.id}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => openPhotoViewer(existingPhotos, idx)}
                      aria-label={`Perbesar ${photo.fileName || `Foto ${idx + 1}`}`}
                      className="block h-20 w-20 overflow-hidden rounded-xl border border-[#D08080]/40 cursor-zoom-in transition hover:border-[#D08080] hover:shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.fileName || `Foto ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDangerConfirm({
                          title: `Hapus Dokumentasi Foto #${idx + 1}?`,
                          message:
                            'Foto klinis ini akan dihapus dari dokumentasi kunjungan saat EMR disimpan.',
                          confirmLabel: 'Hapus Foto',
                          onConfirm: () => {
                            setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                            setDeletedPhotoIds((prev) => [...prev, photo.id])
                            setDangerConfirm(null)
                          },
                        })
                      }
                      className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow cursor-pointer"
                      aria-label="Hapus foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {newPhotoPreviews.map((src, idx) => (
                  <div key={`new-${src}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => openSinglePhotoViewer(src, `Foto baru ${idx + 1}`)}
                      aria-label={`Perbesar foto baru ${idx + 1}`}
                      className="block h-20 w-20 overflow-hidden rounded-xl border border-[#D08080]/40 cursor-zoom-in transition hover:border-[#D08080] hover:shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Foto baru ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDangerConfirm({
                          title: `Hapus Foto Baru #${idx + 1}?`,
                          message: 'Foto yang belum diunggah akan dihapus dari daftar unggahan.',
                          confirmLabel: 'Hapus Foto',
                          onConfirm: () => {
                            setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx))
                            setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== idx))
                            setDangerConfirm(null)
                          },
                        })
                      }
                      className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow cursor-pointer"
                      aria-label="Hapus foto baru"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {deletedPhotoIds.length > 0 && (
              <p className={`text-[11px] ${theme.textSubtle}`}>
                {deletedPhotoIds.length} foto akan dihapus saat EMR disimpan.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
          {savedToast ? (
            <span className="inline-flex items-center gap-2 text-xs text-emerald-500 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedToast}</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono-tech uppercase tracking-[0.14em] text-[#D08080]">
              Operator: {activeOperator}
            </span>
          )}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className={`min-h-11 w-full px-5 py-3 rounded-full border text-xs font-medium hover:border-[#D08080] transition-colors cursor-pointer sm:w-auto sm:px-6 sm:py-3.5 ${theme.pillSurface}`}
            >
              Riwayat Kunjungan
            </button>
            <button
              type="submit"
              disabled={saving || loadingContext || !form.queueId}
              className="min-h-11 w-full px-7 py-3 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium shadow-[0_12px_28px_-10px_rgba(139,79,79,0.5)] hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:px-8 sm:py-3.5"
            >
              {saving ? 'Menyimpan...' : editingVisitId ? 'Update EMR' : 'Simpan EMR'}
            </button>
          </div>
        </div>
      </form>

      {/* HISTORY MODAL */}
      <SolidModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        theme={theme}
        className="max-w-xl p-5 sm:p-8 space-y-5 sm:space-y-6"
      >
        <div className="sticky top-0 z-20 -mx-5 -mt-5 flex items-start justify-between gap-3 border-b border-[#D08080]/20 bg-[#FFFDFC] px-5 pb-4 pt-5 dark:bg-[#1C1417] sm:-mx-8 sm:-mt-8 sm:gap-4 sm:px-8 sm:pt-8">
          <div className="min-w-0">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D08080]/15 text-xs font-medium text-[#D08080]">
              Arsip Rekam Medis Terpadu
            </span>
            <h3 className="mt-2 break-words text-base sm:text-2xl font-semibold tracking-tight">
              Riwayat Kunjungan — {selectedPatient?.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup Riwayat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative pl-6 pr-1 pb-2 space-y-5">
          <div
            aria-hidden="true"
            className="absolute left-2 top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#D08080] via-[#8B4F4F]/50 to-[#D08080]/20"
          />

          {visits.length === 0 ? (
            <p className={`py-8 text-center text-xs ${theme.textMuted}`}>
              Belum ada riwayat kunjungan untuk pasien ini.
            </p>
          ) : (
            visits.map((visit) => (
              <div
                key={visit.id}
                className={`relative rounded-2xl border p-4 sm:p-5 space-y-3 transition-all hover:border-[#D08080] ${theme.elevatedCard}`}
              >
                <span className="absolute -left-[21px] top-6 w-3 h-3 rounded-full bg-[#D08080] ring-4 ring-[#D08080]/25" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#D08080]">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateID(visit.createdAt)}</span>
                    {visit.queueNumber && (
                      <span className={`text-[11px] font-normal ${theme.textSubtle}`}>
                        {formatQueueNumber(visit.queueNumber)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryOpen(false)
                      openPatient(
                        selectedPatient as PatientItem,
                        visit.queueId,
                        visit
                      )
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className={`px-3.5 py-2.5 rounded-xl border ${theme.inputBg}`}>
                    <span className={`block font-medium ${theme.textSubtle}`}>Diagnosa</span>
                    <span className="mt-0.5 block font-semibold">{visit.diagnosa}</span>
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-xl border ${theme.inputBg}`}>
                    <span className={`block font-medium ${theme.textSubtle}`}>Tindakan</span>
                    <span className="mt-0.5 block font-semibold">{visit.tindakan}</span>
                  </div>
                </div>

                <div className={`flex flex-wrap items-center justify-between gap-2 text-xs ${theme.textMuted}`}>
                  <span>
                    Dokter: <strong className={theme.text}>{visit.dokterPenanggungJawab}</strong>
                  </span>
                  {visit.resepObat && (
                    <span className="truncate max-w-xs">Resep: {visit.resepObat}</span>
                  )}
                </div>

                {visit.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {visit.photos.map((photo, photoIdx) => (
                      <button
                        key={`history-${photo.id}`}
                        type="button"
                        onClick={() => openPhotoViewer(visit.photos, photoIdx)}
                        aria-label={`Perbesar foto ${photo.fileName || photoIdx + 1}`}
                        className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[#D08080]/40 cursor-zoom-in transition hover:border-[#D08080] hover:shadow-md"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.fileName || `Foto ${photoIdx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <ZoomIn className="h-4 w-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SolidModal>

      {/* LEGEND EDITOR */}
      <SolidModal
        open={!!editingLegend}
        onClose={() => setEditingLegend(null)}
        theme={theme}
        className="max-w-sm p-5 sm:p-7 space-y-5"
      >
        <div>
          <span className={`text-xs font-medium ${theme.roseLabel}`}>Edit Template Tanda</span>
          <h3 className="mt-1 text-lg font-semibold">
            {editingLegend?.label || 'Template'}
          </h3>
        </div>

        <div className="space-y-2">
          <label htmlFor="legend-label" className={`block text-xs font-medium ${theme.textSubtle}`}>
            Nama Template
          </label>
          <input
            id="legend-label"
            type="text"
            value={legendDraft.label}
            onChange={(e) => setLegendDraft((prev) => ({ ...prev, label: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveLegendEdit()
            }}
            className={`w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="legend-color" className={`block text-xs font-medium ${theme.textSubtle}`}>
            Warna Tanda
          </label>
          <div className="flex items-center gap-3">
            <input
              id="legend-color"
              type="color"
              value={legendDraft.color}
              onChange={(e) => setLegendDraft((prev) => ({ ...prev, color: e.target.value }))}
              className="w-10 h-10 rounded-xl border-0 bg-transparent cursor-pointer"
            />
            <span className={`font-mono-tech text-xs ${theme.textMuted}`}>
              {legendDraft.color.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
          <button
            type="button"
            onClick={() => setEditingLegend(null)}
            className={`min-h-11 flex-1 py-3 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={saveLegendEdit}
            className="min-h-11 flex-1 py-3 rounded-full bg-[#D08080] text-white text-xs font-medium cursor-pointer"
          >
            Simpan Perubahan
          </button>
        </div>
      </SolidModal>

      <DangerConfirmModal
        state={dangerConfirm}
        onClose={() => setDangerConfirm(null)}
        theme={theme}
      />

      <PhotoLightbox
        open={!!photoViewer}
        photos={photoViewer?.photos || []}
        index={photoViewer?.index || 0}
        onIndexChange={(index) =>
          setPhotoViewer((prev) => (prev ? { ...prev, index } : prev))
        }
        onClose={() => setPhotoViewer(null)}
        theme={theme}
      />
    </div>
  )
}
