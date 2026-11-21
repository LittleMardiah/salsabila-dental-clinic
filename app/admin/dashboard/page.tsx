'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Cloud,
  Copy,
  Download,
  Eye,
  FileText,
  HardDrive,
  Loader2,
  Lock,
  LogOut,
  RotateCcw,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DangerConfirmModal,
  SanctuaryBrand,
  SolidModal,
  ThemeToggle,
  useDarkMode,
  type DangerConfirmState,
} from '@/components/ui/sanctuary'
import EmrWorkspace from '@/components/admin/EmrWorkspace'
import { formatQueueNumber, formatRupiah, type ThemeTokens } from '@/lib/ui-theme'
import { clinicDateString } from '@/lib/clinic-date'
import {
  QUEUE_STATUS_LABEL,
  type AuditEntry,
  type PatientItem,
  type QueueItem,
  type TransactionItem,
} from '@/lib/dashboard-types'

const TABS = [
  { id: 'antrian', label: 'Antrian', icon: Users, pref: 'Queue' },
  { id: 'emr', label: 'EMR', icon: FileText, pref: 'EMR' },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet, pref: 'Finance' },
  { id: 'audit', label: 'Audit Log', icon: ShieldAlert, pref: 'AuditLog' },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, pref: 'Settings' },
] as const

type TabId = (typeof TABS)[number]['id']
type Operator = 'Drg. Salsabila' | 'Admin Resepsionis'

const OPERATORS: Operator[] = ['Drg. Salsabila', 'Admin Resepsionis']

const AUDIT_ACTIONS = [
  { value: 'ALL', label: 'Semua Aksi' },
  { value: 'CREATE_QUEUE', label: 'Registrasi Antrean' },
  { value: 'CALL_QUEUE', label: 'Panggil Antrean' },
  { value: 'COMPLETE_QUEUE', label: 'Selesaikan Antrean' },
  { value: 'CREATE_EMR', label: 'Simpan Rekam Medis' },
  { value: 'UPDATE_EMR', label: 'Update Rekam Medis' },
  { value: 'CONFIRM_TRANSACTION', label: 'Konfirmasi Pembayaran' },
  { value: 'RECONCILE', label: 'Rekonsiliasi Harian' },
  { value: 'SWITCH_OPERATOR', label: 'Ganti Operator' },
  { value: 'UPDATE_CLINIC_STATUS', label: 'Update Status Klinik' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
]

type ReconcileHistoryItem = {
  id: number
  date: string
  totalRecorded: number
  adminId: string
  notes?: string | null
  reconciledAt: string
}

type StorageInfo = {
  sizeMB: number
  fileCount: number
} | null

type PublicQueueStats = {
  servingNumber: string | null
  waitingCount: number
  totalToday: number
}

function todayInput() {
  return clinicDateString()
}

function formatTime(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} • ${d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}`
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { theme, darkMode } = useDarkMode()

  const [adminUsername, setAdminUsername] = useState('Admin')
  const [clinicOpen, setClinicOpen] = useState(true)
  const [savingClinicStatus, setSavingClinicStatus] = useState(false)
  const [activeOperator, setActiveOperator] = useState<Operator>('Drg. Salsabila')
  const [activeTab, setActiveTab] = useState<TabId>('antrian')
  const [hiddenMenus, setHiddenMenus] = useState<string[]>([])

  // Queues
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [publicStats, setPublicStats] = useState<PublicQueueStats>({
    servingNumber: null,
    waitingCount: 0,
    totalToday: 0,
  })
  const [loadingQueues, setLoadingQueues] = useState(true)
  const [queueError, setQueueError] = useState('')

  // Registration
  const [regType, setRegType] = useState<'manual' | 'online' | null>(null)
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', complaint: '' })
  const [registering, setRegistering] = useState(false)
  const [ticket, setTicket] = useState<{ queueNo: string; name: string; code?: string | null } | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)

  // EMR
  const [emrSeed, setEmrSeed] = useState<{
    patient: PatientItem
    queueId: number
    nonce: number
  } | null>(null)

  // Finance
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [financeLoading, setFinanceLoading] = useState(false)
  const [financeTab, setFinanceTab] = useState<'pending' | 'confirmed'>('pending')
  const [financeSubView, setFinanceSubView] = useState<'overview' | 'reconcile'>('overview')
  const [paymentTarget, setPaymentTarget] = useState<TransactionItem | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [payProof, setPayProof] = useState<File | null>(null)
  const [paying, setPaying] = useState(false)
  const [physicalCash, setPhysicalCash] = useState('')
  const [reconcileNotes, setReconcileNotes] = useState('')
  const [reconcileHistory, setReconcileHistory] = useState<ReconcileHistoryItem[]>([])
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false)
  const [reconciling, setReconciling] = useState(false)

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFrom, setAuditFrom] = useState('')
  const [auditTo, setAuditTo] = useState('')
  const [auditAction, setAuditAction] = useState('ALL')
  const [auditAdmin, setAuditAdmin] = useState('')
  const [auditNonce, setAuditNonce] = useState(0)

  // Settings
  const [draftPrefs, setDraftPrefs] = useState({
    antrian: true,
    emr: true,
    keuangan: true,
    audit: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [storage, setStorage] = useState<StorageInfo>(null)
  const [storageError, setStorageError] = useState(false)
  const [gdriveConnected, setGdriveConnected] = useState(false)
  const [zipBusy, setZipBusy] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreCode, setRestoreCode] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreStatus, setRestoreStatus] = useState('')
  const [restoring, setRestoring] = useState(false)

  const [dangerConfirm, setDangerConfirm] = useState<DangerConfirmState>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.id === 'pengaturan' || !hiddenMenus.includes(tab.pref)),
    [hiddenMenus]
  )

  const handleUnauthorized = useCallback(() => {
    router.replace('/admin/login')
  }, [router])

  /* --------------------------------------------------------------- BOOTSTRAP */
  useEffect(() => {
    const stored = localStorage.getItem('salsa_operator')
    if (stored === 'Drg. Salsabila' || stored === 'Admin Resepsionis') {
      setActiveOperator(stored)
    }

    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab as TabId)
    }
    if (params.get('connected') === 'true') {
      toast.success('Google Drive berhasil terhubung')
    } else if (params.get('error')) {
      toast.error('Gagal menghubungkan Google Drive')
    }
    if (tab || params.get('connected') || params.get('error')) {
      window.history.replaceState({}, '', '/admin/dashboard')
    }

    const bootstrap = async () => {
      try {
        const [adminRes, prefRes, statusRes] = await Promise.all([
          fetch('/api/auth/admin/check', { cache: 'no-store' }),
          fetch('/api/preferences', { cache: 'no-store' }),
          fetch('/api/clinic/status', { cache: 'no-store' }),
        ])
        if (adminRes.status === 401) {
          router.replace('/admin/login')
          return
        }
        if (adminRes.ok) {
          const data = await adminRes.json()
          setAdminUsername(data.username || 'Admin')
        }
        if (prefRes.ok) {
          const data = await prefRes.json()
          setHiddenMenus(data.hiddenMenus || [])
          setDraftPrefs({
            antrian: !(data.hiddenMenus || []).includes('Queue'),
            emr: !(data.hiddenMenus || []).includes('EMR'),
            keuangan: !(data.hiddenMenus || []).includes('Finance'),
            audit: !(data.hiddenMenus || []).includes('AuditLog'),
          })
          setGdriveConnected(!!data.googleConnected)
        }
        if (statusRes.ok) {
          const data = await statusRes.json().catch(() => ({}))
          setClinicOpen(data.isOpen !== false)
        }
      } catch {
        // Individual panels surface their own errors.
      }
    }
    bootstrap()
  }, [router])

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'pengaturan')
    }
  }, [visibleTabs, activeTab])

  /* ------------------------------------------------------------------ QUEUES */
  const fetchQueues = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingQueues(true)
      try {
        const res = await fetch('/api/queue', { cache: 'no-store' })
        if (res.status === 401) return handleUnauthorized()
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setQueueError(data.error || 'Gagal memuat antrean')
          return
        }
        setQueues(data.data || [])
        setQueueError('')
        try {
          const publicRes = await fetch('/api/queue/public', { cache: 'no-store' })
          if (publicRes.ok) {
            const publicData = await publicRes.json().catch(() => ({}))
            if (publicData.success) {
              setPublicStats({
                servingNumber: publicData.servingNumber,
                waitingCount: publicData.waitingCount || 0,
                totalToday: publicData.totalToday || 0,
              })
              setClinicOpen(publicData.isOpen !== false)
            }
          }
        } catch {
          // The queue table above remains available when the aggregate call fails.
        }
      } catch {
        setQueueError('Gagal memuat antrean. Periksa koneksi Anda.')
      } finally {
        setLoadingQueues(false)
      }
    },
    [handleUnauthorized]
  )

  useEffect(() => {
    fetchQueues()
    const interval = setInterval(() => fetchQueues(true), 6000)
    return () => clearInterval(interval)
  }, [fetchQueues])

  const playChimeAndVoice = (queueNo: string, name: string) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        audioRef.current = audioRef.current || new AudioCtx()
        const ctx = audioRef.current
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.55)
      }
    } catch {
      // Silent fallback.
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(
          `Nomor antrian ${queueNo}, atas nama ${name}, silakan menuju ruang pemeriksaan.`
        )
        utter.lang = 'id-ID'
        utter.rate = 0.94
        window.speechSynthesis.speak(utter)
      }
    } catch {
      // Silent fallback.
    }
  }

  const callQueue = async (queue: QueueItem) => {
    try {
      const res = await fetch('/api/queue/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: queue.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(data.error || 'Gagal memanggil antrean')
        return
      }
      toast.success(`${formatQueueNumber(queue.queueNumber)} dipanggil`)
      playChimeAndVoice(formatQueueNumber(queue.queueNumber), queue.patientName)
      fetchQueues(true)
    } catch {
      toast.error('Gagal memanggil antrean')
    }
  }

  const completeQueue = async (queue: QueueItem) => {
    try {
      const res = await fetch(`/api/queue/${queue.id}/complete`, { method: 'PATCH' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyelesaikan antrean')
        return
      }
      toast.success(`Antrean ${formatQueueNumber(queue.queueNumber)} selesai`)
      fetchQueues(true)
    } catch {
      toast.error('Gagal menyelesaikan antrean')
    }
  }

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regForm.name.trim()) {
      toast.error('Nama pasien wajib diisi')
      return
    }
    setRegistering(true)
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regForm.name.trim(),
          phone: regForm.phone.trim() || undefined,
          email: regForm.email.trim() || undefined,
          keluhan: regForm.complaint.trim() || undefined,
          mode: regType === 'online' ? 'ONLINE' : 'MANUAL',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(data.error || 'Gagal menambahkan antrean')
        return
      }

      const queueNo = formatQueueNumber(data.queue_number)
      setTicket({
        queueNo,
        name: regForm.name.trim(),
        code: data.patient_code || null,
      })
      setRegType(null)
      setRegForm({ name: '', phone: '', email: '', complaint: '' })
      toast.success(`Antrean ${queueNo} berhasil dibuat`)
      fetchQueues(true)
    } catch {
      toast.error('Gagal menambahkan antrean')
    } finally {
      setRegistering(false)
    }
  }

  const openEmrForQueue = (queue: QueueItem) => {
    setEmrSeed({
      patient: {
        id: queue.patientId,
        name: queue.patientName,
        phone: queue.phone,
        email: queue.email,
      },
      queueId: queue.id,
      nonce: Date.now(),
    })
    setActiveTab('emr')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateClinicStatus = async (isOpen: boolean) => {
    if (clinicOpen === isOpen || savingClinicStatus) return
    setSavingClinicStatus(true)
    try {
      const res = await fetch('/api/clinic/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen }),
      })
      if (res.status === 401) return handleUnauthorized()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Gagal memperbarui status klinik')
        return
      }
      setClinicOpen(data.isOpen !== false)
      toast.success(data.isOpen === false ? 'Klinik ditutup' : 'Klinik dibuka')
    } catch {
      toast.error('Gagal memperbarui status klinik')
    } finally {
      setSavingClinicStatus(false)
    }
  }

  /* --------------------------------------------------------------- OPERATOR */
  const switchOperator = async () => {
    const next: Operator =
      activeOperator === 'Drg. Salsabila' ? 'Admin Resepsionis' : 'Drg. Salsabila'
    setActiveOperator(next)
    localStorage.setItem('salsa_operator', next)
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: next }),
      })
      toast.success(`Operator aktif: ${next}`)
      setAuditNonce((value) => value + 1)
    } catch {
      toast.error('Operator diganti, tetapi log audit gagal dicatat')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' })
    } catch {
      // Redirect regardless; the cookie is expired server-side when possible.
    }
    router.push('/')
  }

  /* ------------------------------------------------------------------ FINANCE */
  const fetchTransactions = useCallback(async () => {
    setFinanceLoading(true)
    try {
      const res = await fetch(`/api/finance/transactions?date=${todayInput()}`, {
        cache: 'no-store',
      })
      if (res.status === 401) return handleUnauthorized()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Gagal memuat transaksi')
        return
      }
      setTransactions(data.data || [])
    } catch {
      toast.error('Gagal memuat transaksi')
    } finally {
      setFinanceLoading(false)
    }
  }, [handleUnauthorized])

  const confirmedTrx = transactions.filter((t) => t.status === 'CONFIRMED')
  const pendingTrx = transactions.filter((t) => t.status === 'PENDING')
  const confirmedRevenue = confirmedTrx.reduce((acc, t) => acc + (t.amount || 0), 0)
  const pendingRevenue = pendingTrx.reduce((acc, t) => acc + (t.amount || 0), 0)
  const cashSystemTotal = confirmedTrx
    .filter((t) => t.paymentMethod === 'CASH')
    .reduce((acc, t) => acc + (t.amount || 0), 0)
  const digitalSystemTotal = confirmedTrx
    .filter((t) => t.paymentMethod !== 'CASH')
    .reduce((acc, t) => acc + (t.amount || 0), 0)
  const systemTotal = cashSystemTotal + digitalSystemTotal
  const physicalTotal = parseInt(digitsOnly(physicalCash) || '0', 10)
  const variance = physicalTotal - systemTotal

  useEffect(() => {
    if (activeTab === 'keuangan') fetchTransactions()
  }, [activeTab, fetchTransactions])

  const fetchReconcileHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/reconcile?limit=30', { cache: 'no-store' })
      if (res.status === 401) return handleUnauthorized()
      const data = await res.json().catch(() => ({}))
      if (res.ok) setReconcileHistory(data.data || [])
    } catch {
      toast.error('Gagal memuat riwayat rekonsiliasi')
    }
  }, [handleUnauthorized])

  const openReconcile = () => {
    setFinanceSubView('reconcile')
    setPhysicalCash(String(systemTotal))
    setReconcileNotes('')
    fetchReconcileHistory()
  }

  const requestReconcile = () => {
    if (physicalTotal <= 0) {
      toast.error('Masukkan total pendapatan fisik terlebih dahulu')
      return
    }
    setReconcileConfirmOpen(true)
  }

  const commitReconcile = async () => {
    setReconciling(true)
    try {
      const res = await fetch('/api/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayInput(),
          totalRecorded: physicalTotal,
          notes: reconcileNotes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(
          res.status === 409
            ? 'Rekonsiliasi hari ini sudah tersimpan.'
            : data.error || 'Gagal menyimpan rekonsiliasi'
        )
        setReconcileConfirmOpen(false)
        return
      }
      toast.success('Rekonsiliasi harian tersimpan')
      setReconcileConfirmOpen(false)
      fetchReconcileHistory()
      fetchTransactions()
    } catch {
      toast.error('Gagal menyimpan rekonsiliasi')
    } finally {
      setReconciling(false)
    }
  }

  const openPayment = (trx: TransactionItem) => {
    setPaymentTarget(trx)
    setPayAmount(String(trx.amount || 0))
    setPayMethod(trx.paymentMethod || 'CASH')
    setPayProof(null)
  }

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentTarget) return
    const amount = parseInt(digitsOnly(payAmount) || '0', 10)
    if (amount <= 0) {
      toast.error('Jumlah pembayaran harus lebih dari 0')
      return
    }
    if (payMethod === 'TRANSFER' && !payProof) {
      toast.error('Unggah bukti transfer terlebih dahulu')
      return
    }
    setPaying(true)
    try {
      const body = new FormData()
      body.append('amount', String(amount))
      body.append('paymentMethod', payMethod)
      if (payMethod === 'TRANSFER' && payProof) body.append('proof', payProof)

      const res = await fetch(`/api/finance/transactions/${paymentTarget.id}/confirm`, {
        method: 'POST',
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengonfirmasi pembayaran')
        return
      }
      toast.success('Pembayaran berhasil dikonfirmasi')
      setPaymentTarget(null)
      fetchTransactions()
    } catch {
      toast.error('Gagal mengonfirmasi pembayaran')
    } finally {
      setPaying(false)
    }
  }

  /* -------------------------------------------------------------------- AUDIT */
  const loadAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const params = new URLSearchParams()
      if (auditFrom) params.set('from', auditFrom)
      if (auditTo) params.set('to', auditTo)
      if (auditAction !== 'ALL') params.set('action', auditAction)
      params.set('limit', '100')
      const res = await fetch(`/api/audit-log?${params.toString()}`, { cache: 'no-store' })
      if (res.status === 401) return handleUnauthorized()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Gagal memuat audit log')
        return
      }
      setAuditLogs(data.logs || [])
    } catch {
      toast.error('Gagal memuat audit log')
    } finally {
      setAuditLoading(false)
    }
  }, [auditFrom, auditTo, auditAction, handleUnauthorized])

  useEffect(() => {
    if (activeTab === 'audit') loadAudit()
  }, [activeTab, loadAudit, auditNonce])

  const filteredAudit = auditLogs.filter((log) => {
    const term = auditAdmin.trim().toLowerCase()
    if (!term) return true
    return log.admin.toLowerCase().includes(term)
  })

  /* ----------------------------------------------------------------- SETTINGS */
  const fetchStorage = useCallback(async () => {
    setStorageError(false)
    try {
      const res = await fetch('/api/storage/size', { cache: 'no-store' })
      if (res.status === 401) return handleUnauthorized()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStorageError(true)
        return
      }
      setStorage({ sizeMB: Number(data.sizeMB) || 0, fileCount: Number(data.fileCount) || 0 })
    } catch {
      setStorageError(true)
    }
  }, [handleUnauthorized])

  useEffect(() => {
    fetchStorage()
  }, [fetchStorage])

  const savePreferences = async () => {
    setSavingPrefs(true)
    const hidden: string[] = []
    if (!draftPrefs.antrian) hidden.push('Queue')
    if (!draftPrefs.emr) hidden.push('EMR')
    if (!draftPrefs.keuangan) hidden.push('Finance')
    if (!draftPrefs.audit) hidden.push('AuditLog')

    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenMenus: hidden }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan preferensi')
        return
      }
      setHiddenMenus(data.hiddenMenus || hidden)
      toast.success('Preferensi navigasi menu berhasil diperbarui')
    } catch {
      toast.error('Gagal menyimpan preferensi')
    } finally {
      setSavingPrefs(false)
    }
  }

  const downloadZip = async () => {
    setZipBusy(true)
    try {
      const res = await fetch('/api/backup/local')
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) throw new Error('Gagal membuat arsip ZIP')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `arsip-salsa-dental-${todayInput()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Arsip ZIP berhasil diunduh')
    } catch {
      toast.error('Gagal membuat arsip ZIP')
    } finally {
      setZipBusy(false)
    }
  }

  const disconnectDrive = () => {
    setDangerConfirm({
      title: 'Putuskan Google Drive?',
      message:
        'Sinkronisasi dan pencadangan otomatis ke Google Drive akan berhenti sampai Anda menghubungkannya kembali.',
      confirmLabel: 'Putuskan Drive',
      onConfirm: async () => {
        setDangerConfirm(null)
        try {
          const res = await fetch('/api/backup/disconnect', { method: 'POST' })
          if (!res.ok) {
            toast.error('Gagal memutuskan Google Drive')
            return
          }
          setGdriveConnected(false)
          toast.success('Akses Google Drive dicabut')
        } catch {
          toast.error('Gagal memutuskan Google Drive')
        }
      },
    })
  }

  const submitRestore = async () => {
    if (!restoreFile) {
      setRestoreStatus('Pilih file backup (.zip) terlebih dahulu.')
      return
    }
    if (restoreCode.length !== 8) {
      setRestoreStatus('Masukkan kode konfirmasi 8 digit.')
      return
    }
    setRestoring(true)
    setRestoreStatus('')
    try {
      const body = new FormData()
      body.append('code', restoreCode)
      body.append('backupFile', restoreFile)
      const res = await fetch('/api/backup/restore', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return handleUnauthorized()
      if (!res.ok) {
        setRestoreStatus(data.error || 'Restore gagal.')
        return
      }
      setRestoreStatus('Basis data berhasil dipulihkan. Memuat ulang...')
      toast.success('Restore berhasil')
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setRestoreStatus('Terjadi kesalahan saat restore.')
    } finally {
      setRestoring(false)
    }
  }

  const sizeMB = storage?.sizeMB || 0
  const storagePercent = Math.min(100, (sizeMB / 500) * 100)

  const tabButton = (tab: (typeof TABS)[number], compact: boolean) => {
    const Icon = tab.icon
    const active = activeTab === tab.id
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={
          compact
            ? `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-[#D08080] to-[#8B4F4F] border-transparent text-white shadow-sm'
                  : `${theme.pillSurface} hover:border-[#D08080]`
              }`
            : `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white shadow-sm'
                  : `${theme.textMuted} hover:text-[#D08080]`
              }`
        }
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{tab.label}</span>
      </button>
    )
  }

  const clinicStatusControl = (mobile: boolean) => (
    <div
      role="group"
      aria-label="Status operasional klinik"
      title={`Klinik sedang ${clinicOpen ? 'buka' : 'tutup'}`}
      className={`inline-flex items-center gap-1 p-1 rounded-full border ${theme.pillSurface} ${mobile ? 'sm:hidden' : 'hidden sm:inline-flex'}`}
    >
      <button
        type="button"
        onClick={() => updateClinicStatus(true)}
        disabled={savingClinicStatus}
        aria-pressed={clinicOpen}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          clinicOpen
            ? 'bg-emerald-700 text-white'
            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        <span>Buka</span>
      </button>
      <button
        type="button"
        onClick={() => updateClinicStatus(false)}
        disabled={savingClinicStatus}
        aria-pressed={!clinicOpen}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          clinicOpen
            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            : 'bg-rose-700 text-white'
        }`}
      >
        <X className="w-3.5 h-3.5" />
        <span>Tutup</span>
      </button>
    </div>
  )

  return (
    <div
      className={`min-h-screen w-full max-w-full ${theme.bg} ${theme.text} font-sans-clean relative overflow-x-hidden transition-colors duration-700 selection:bg-[#D08080]/25 flex flex-col`}
    >
      <div
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E\")",
        }}
        className="pointer-events-none fixed inset-0 z-0"
      />

      <header className={`relative z-30 w-full shrink-0 border-b ${theme.hairline}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <SanctuaryBrand href="/" />

          <nav
            aria-label="Navigasi Modul Admin"
            className={`hidden xl:flex items-center gap-1 p-1.5 rounded-full border shrink-0 ${theme.pillSurface}`}
          >
            {visibleTabs.map((tab) => tabButton(tab, false))}
          </nav>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
            {clinicStatusControl(false)}

            <button
              type="button"
              onClick={switchOperator}
              title={`Login sebagai ${adminUsername}. Klik untuk ganti operator aktif.`}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-medium transition-all hover:border-[#D08080] cursor-pointer shrink-0 ${theme.pillSurface}`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D08080] shrink-0" />
              <span className="hidden sm:inline max-w-[140px] truncate">{activeOperator}</span>
            </button>

            <ThemeToggle theme={theme} />

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar"
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-normal tracking-[0.02em] transition-all duration-300 hover:border-[#D08080] cursor-pointer shrink-0 whitespace-nowrap ${theme.pillSurface}`}
            >
              <LogOut className="w-3.5 h-3.5 text-[#D08080] shrink-0" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <div className="xl:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div className="sm:hidden mb-2 flex justify-end">{clinicStatusControl(true)}</div>
          <nav
            aria-label="Navigasi Modul Admin Responsif"
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5"
          >
            {visibleTabs.map((tab) => tabButton(tab, true))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div
          aria-hidden="true"
          style={{
            animation: 'silkAuroraBreath 18s ease-in-out infinite',
            background:
              'radial-gradient(ellipse 55% 40% at 80% 15%, rgba(208,128,128,0.12), transparent 70%)',
          }}
          className="pointer-events-none fixed inset-0 blur-3xl z-0"
        />

        <div key={activeTab} className="relative z-10 animate-view-enter space-y-6 sm:space-y-8">
          {/* ============================================================ ANTRIAN */}
          {activeTab === 'antrian' && (
            <div className="space-y-6 sm:space-y-7">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className={`text-xs font-medium ${theme.roseLabel}`}>
                    Operasional Harian • {activeOperator} •{' '}
                    <span className={clinicOpen ? 'text-emerald-500' : 'text-rose-500'}>
                      Klinik {clinicOpen ? 'Buka' : 'Tutup'}
                    </span>
                  </span>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
                    Antrian Pasien Hari Ini
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegType('manual')}
                    className={`px-4 py-2.5 rounded-full border text-xs font-medium hover:border-[#D08080] hover:-translate-y-0.5 transition-all cursor-pointer ${theme.pillSurface}`}
                  >
                    Manual Registrasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegType('online')}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium shadow-[0_8px_20px_-6px_rgba(139,79,79,0.45)] hover:-translate-y-0.5 hover:opacity-95 transition-all cursor-pointer"
                  >
                    Online Registrasi
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}>
                  <span className={`text-xs font-medium ${theme.textSubtle}`}>Total Antrian</span>
                  <div className={`mt-2 text-3xl sm:text-4xl font-semibold tabular-nums ${theme.roseAccent}`}>
                    {String(publicStats.totalToday).padStart(2, '0')}
                  </div>
                </div>
                <div className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D08080]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D08080]" />
                    <span>Menunggu</span>
                  </span>
                  <div className="mt-2 text-3xl sm:text-4xl font-semibold tabular-nums">
                    {String(publicStats.waitingCount).padStart(2, '0')}
                  </div>
                </div>
                <div className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sedang Dilayani</span>
                  </span>
                  <div className="mt-2 text-3xl sm:text-4xl font-semibold tabular-nums text-emerald-500">
                    {publicStats.servingNumber || '—'}
                  </div>
                </div>
              </div>

              <div className={`rounded-3xl border overflow-x-auto ${theme.elevatedCard}`}>
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className={`border-b ${theme.hairline} text-xs font-medium ${theme.textSubtle}`}>
                      <th className="py-4 px-5 sm:px-6">No. Antrian (Klik Tiket)</th>
                      <th className="py-4 px-4">Nama Pasien</th>
                      <th className="py-4 px-4">Kontak</th>
                      <th className="py-4 px-4">Waktu Daftar</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 sm:px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.divideHairline} text-sm`}>
                    {loadingQueues && queues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Memuat antrean hari ini...
                        </td>
                      </tr>
                    ) : queueError ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-xs text-[#D08080]">
                          {queueError}{' '}
                          <button type="button" onClick={() => fetchQueues()} className="underline">
                            Coba lagi
                          </button>
                        </td>
                      </tr>
                    ) : queues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Tidak ada antrian hari ini. Tambahkan pasien melalui registrasi manual atau online.
                        </td>
                      </tr>
                    ) : (
                      queues.map((item) => (
                        <tr key={item.id} className="transition-colors duration-200 hover:bg-[#D08080]/[0.05]">
                          <td className="py-4 px-5 sm:px-6">
                            <button
                              type="button"
                              onClick={() =>
                                setTicket({
                                  queueNo: formatQueueNumber(item.queueNumber),
                                  name: item.patientName,
                                  code: item.patientCode,
                                })
                              }
                              className={`text-lg font-semibold ${theme.roseAccent} hover:underline cursor-pointer`}
                              title="Buka tiket antrean"
                            >
                              {formatQueueNumber(item.queueNumber)}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium">{item.patientName}</div>
                            <div className={`text-xs ${theme.textSubtle}`}>{item.keluhan || 'Konsultasi umum'}</div>
                          </td>
                          <td className={`py-4 px-4 text-xs ${theme.textMuted}`}>{item.phone || '-'}</td>
                          <td className={`py-4 px-4 text-xs tabular-nums ${theme.textSubtle}`}>
                            {formatTime(item.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
                                item.status === 'CALLED'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : item.status === 'COMPLETED'
                                  ? 'bg-neutral-500/15 text-neutral-400'
                                  : 'bg-[#D08080]/15 text-[#D08080]'
                              }`}
                            >
                              {item.status === 'CALLED' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                              <span>{QUEUE_STATUS_LABEL[item.status]}</span>
                            </span>
                          </td>
                          <td className="py-4 px-5 sm:px-6 text-right space-x-2 whitespace-nowrap">
                            {item.status === 'WAITING' && (
                              <button
                                type="button"
                                onClick={() => callQueue(item)}
                                className={`px-3.5 py-1.5 rounded-full border text-xs font-medium hover:border-[#D08080] transition-colors cursor-pointer ${theme.pillSurface}`}
                              >
                                Panggil
                              </button>
                            )}
                            {item.status === 'CALLED' && (
                              <button
                                type="button"
                                onClick={() => completeQueue(item)}
                                className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                              >
                                Selesai
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEmrForQueue(item)}
                              className="px-3.5 py-1.5 rounded-full bg-[#D08080]/15 text-[#D08080] text-xs font-medium hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
                            >
                              EMR
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= EMR */}
          {activeTab === 'emr' && (
            <EmrWorkspace
              key={emrSeed ? `emr-${emrSeed.nonce}` : 'emr-list'}
              theme={theme}
              queues={queues}
              initialPatient={emrSeed?.patient}
              initialQueueId={emrSeed?.queueId}
              activeOperator={activeOperator}
              onSaved={() => {
                fetchQueues(true)
                setAuditNonce((value) => value + 1)
              }}
              onUnauthorized={handleUnauthorized}
            />
          )}

          {/* ============================================================= KEUANGAN */}
          {activeTab === 'keuangan' && financeSubView === 'overview' && (
            <div className="space-y-6 sm:space-y-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className={`text-xs font-medium ${theme.roseLabel}`}>Manajemen Finansial</span>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Keuangan Klinik</h2>
                </div>

                <button
                  type="button"
                  onClick={openReconcile}
                  className={`px-5 py-2.5 rounded-full border text-xs font-medium hover:border-[#D08080] transition-colors cursor-pointer ${theme.pillSurface}`}
                >
                  Rekonsiliasi Hari Ini
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.elevatedCard}`}>
                  <span className={`text-xs font-medium ${theme.textSubtle}`}>Total Pendapatan Hari Ini</span>
                  <div className={`mt-2 text-2xl sm:text-3xl font-semibold tabular-nums ${theme.roseAccent}`}>
                    {formatRupiah(confirmedRevenue)}
                  </div>
                </div>
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.elevatedCard}`}>
                  <span className={`text-xs font-medium ${theme.textSubtle}`}>Pending Transaksi</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums">
                    {formatRupiah(pendingRevenue)}
                  </div>
                </div>
                <div className={`rounded-3xl border p-5 sm:p-6 ${theme.elevatedCard}`}>
                  <span className={`text-xs font-medium ${theme.textSubtle}`}>Confirmed Transaksi</span>
                  <div className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-emerald-500">
                    {formatRupiah(confirmedRevenue)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {[
                  { id: 'pending', label: 'Pending' },
                  { id: 'confirmed', label: 'Confirmed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFinanceTab(tab.id as 'pending' | 'confirmed')}
                    className={`px-5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      financeTab === tab.id
                        ? 'bg-[#8B4F4F] text-white'
                        : `${theme.pillSurface} border`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fetchTransactions()}
                  className={`ml-auto px-4 py-2 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
                >
                  Muat Ulang
                </button>
              </div>

              <div className={`rounded-3xl border overflow-x-auto ${theme.elevatedCard}`}>
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className={`border-b ${theme.hairline} text-xs font-medium ${theme.textSubtle}`}>
                      <th className="py-4 px-5 sm:px-6">No Antrian</th>
                      <th className="py-4 px-4">Nama Pasien</th>
                      <th className="py-4 px-4">Tanggal</th>
                      <th className="py-4 px-4">Total Tagihan</th>
                      <th className="py-4 px-5 sm:px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.divideHairline} text-sm`}>
                    {financeLoading ? (
                      <tr>
                        <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Memuat transaksi...
                        </td>
                      </tr>
                    ) : (financeTab === 'pending' ? pendingTrx : confirmedTrx).length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Tidak ada transaksi {financeTab === 'pending' ? 'pending' : 'confirmed'} hari ini.
                        </td>
                      </tr>
                    ) : (
                      (financeTab === 'pending' ? pendingTrx : confirmedTrx).map((trx) => (
                        <tr key={trx.id} className="transition-colors hover:bg-[#D08080]/[0.04]">
                          <td className={`py-4 px-5 sm:px-6 text-xs font-semibold ${theme.roseLabel}`}>
                            {formatQueueNumber(trx.queue.queueNumber)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium">{trx.patient.name}</div>
                            <div className={`text-xs ${theme.textSubtle}`}>
                              {trx.paymentMethod === 'CASH' ? 'Cash' : trx.paymentMethod === 'TRANSFER' ? 'Digital / Transfer' : 'Metode belum dipilih'}
                            </div>
                          </td>
                          <td className={`py-4 px-4 text-xs tabular-nums ${theme.textSubtle}`}>
                            {formatDateTime(trx.createdAt)}
                          </td>
                          <td className="py-4 px-4 font-semibold tabular-nums">{formatRupiah(trx.amount)}</td>
                          <td className="py-4 px-5 sm:px-6 text-right">
                            {trx.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => openPayment(trx)}
                                className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                Konfirmasi Bayar
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-emerald-500">Lunas</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && !financeLoading && (
                <p className={`text-[11px] ${theme.textMuted}`}>
                  Transaksi dibuat otomatis saat antrean pasien diselesaikan. Selesaikan antrean pada modul
                  Antrian untuk memunculkan tagihan.
                </p>
              )}
            </div>
          )}

          {activeTab === 'keuangan' && financeSubView === 'reconcile' && (
            <div className="space-y-6 sm:space-y-7">
              <button
                type="button"
                onClick={() => setFinanceSubView('overview')}
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${theme.textSubtle} hover:text-[#D08080] cursor-pointer`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Keuangan</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
                <div className={`lg:col-span-7 rounded-3xl border p-5 sm:p-8 space-y-5 ${theme.elevatedCard}`}>
                  <div>
                    <span className={`text-xs font-medium ${theme.roseLabel}`}>Audit Kas Harian</span>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Rekonsiliasi Harian</h2>
                  </div>

                  <div>
                    <label htmlFor="physical-cash" className="block text-xs font-medium mb-1.5">
                      Laporan Pendapatan Fisik (Auto-Format Rupiah)
                    </label>
                    <input
                      id="physical-cash"
                      type="text"
                      inputMode="numeric"
                      value={formatRupiah(physicalCash || '0')}
                      onChange={(e) => setPhysicalCash(digitsOnly(e.target.value))}
                      className={`w-full px-4 sm:px-5 py-4 rounded-2xl border text-2xl sm:text-3xl font-semibold tabular-nums focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
                    />
                  </div>

                  <div>
                    <label htmlFor="reconcile-notes" className="block text-xs font-medium mb-1.5">
                      Catatan Rekonsiliasi
                    </label>
                    <textarea
                      id="reconcile-notes"
                      rows={3}
                      value={reconcileNotes}
                      onChange={(e) => setReconcileNotes(e.target.value)}
                      placeholder="Masukkan catatan rekonsiliasi hari ini..."
                      className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={requestReconcile}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium shadow-[0_10px_24px_-8px_rgba(139,79,79,0.45)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    Simpan Rekonsiliasi
                  </button>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className={`rounded-3xl border p-5 sm:p-6 space-y-3 ${theme.elevatedCard}`}>
                    <span className={`text-xs font-medium ${theme.roseLabel}`}>
                      Total Uang Diterima Sistem
                    </span>
                    <div className={`text-3xl sm:text-4xl font-semibold tabular-nums ${theme.roseAccent}`}>
                      {formatRupiah(systemTotal)}
                    </div>
                    <div
                      className={`pt-2.5 border-t ${theme.hairline} text-xs font-medium ${
                        variance === 0 ? 'text-emerald-500' : 'text-[#D08080]'
                      }`}
                    >
                      Selisih: {variance < 0 ? '-' : ''}
                      {formatRupiah(Math.abs(variance))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-2xl border p-4 ${theme.elevatedCard}`}>
                      <span className={`text-xs ${theme.textSubtle}`}>Cash</span>
                      <div className="mt-1 font-semibold text-base tabular-nums">
                        {formatRupiah(cashSystemTotal)}
                      </div>
                    </div>
                    <div className={`rounded-2xl border p-4 ${theme.elevatedCard}`}>
                      <span className={`text-xs ${theme.textSubtle}`}>Digital / Transfer</span>
                      <div className="mt-1 font-semibold text-base tabular-nums">
                        {formatRupiah(digitalSystemTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-3xl border overflow-x-auto ${theme.elevatedCard}`}>
                <table className="w-full text-left border-collapse min-w-[520px]">
                  <thead>
                    <tr className={`border-b ${theme.hairline} text-xs font-medium ${theme.textSubtle}`}>
                      <th className="py-4 px-5 sm:px-6">Tanggal</th>
                      <th className="py-4 px-4">Jumlah Rekonsiliasi</th>
                      <th className="py-4 px-4">Editor</th>
                      <th className="py-4 px-5 sm:px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.divideHairline} text-sm`}>
                    {reconcileHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Belum ada riwayat rekonsiliasi.
                        </td>
                      </tr>
                    ) : (
                      reconcileHistory.map((rec) => (
                        <tr key={rec.id}>
                          <td className="py-4 px-5 sm:px-6 text-xs tabular-nums">
                            {new Date(rec.date).toLocaleDateString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-4 px-4 font-semibold tabular-nums">
                            {formatRupiah(rec.totalRecorded)}
                          </td>
                          <td className="py-4 px-4 text-xs">{rec.adminId}</td>
                          <td className="py-4 px-5 sm:px-6 text-right">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-medium">
                              Tersimpan
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <span className={`text-xs font-medium ${theme.roseLabel}`}>Jejak Aktivitas Operasional</span>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Audit Log</h2>
              </div>

              <div className={`rounded-3xl border p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${theme.elevatedCard}`}>
                <div>
                  <label htmlFor="audit-from" className="block text-xs font-medium mb-1.5">Dari Tanggal</label>
                  <input
                    id="audit-from"
                    type="date"
                    value={auditFrom}
                    onChange={(e) => setAuditFrom(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${theme.inputBg}`}
                  />
                </div>
                <div>
                  <label htmlFor="audit-to" className="block text-xs font-medium mb-1.5">Sampai Tanggal</label>
                  <input
                    id="audit-to"
                    type="date"
                    value={auditTo}
                    onChange={(e) => setAuditTo(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${theme.inputBg}`}
                  />
                </div>
                <div>
                  <label htmlFor="audit-action" className="block text-xs font-medium mb-1.5">Filter Aksi</label>
                  <select
                    id="audit-action"
                    value={auditAction}
                    onChange={(e) => setAuditAction(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${theme.inputBg}`}
                  >
                    {AUDIT_ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="audit-admin" className="block text-xs font-medium mb-1.5">Filter Akun Staf</label>
                  <input
                    id="audit-admin"
                    type="text"
                    value={auditAdmin}
                    onChange={(e) => setAuditAdmin(e.target.value)}
                    placeholder="Cari username admin..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${theme.inputBg}`}
                  />
                </div>
              </div>

              <div className={`rounded-3xl border overflow-x-auto ${theme.elevatedCard}`}>
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className={`border-b ${theme.hairline} text-xs font-medium ${theme.textSubtle}`}>
                      <th className="py-4 px-5 sm:px-6">Waktu</th>
                      <th className="py-4 px-4">Akun</th>
                      <th className="py-4 px-4">Aksi</th>
                      <th className="py-4 px-4">Detail Aktivitas</th>
                      <th className="py-4 px-5 sm:px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.divideHairline} text-sm`}>
                    {auditLoading ? (
                      <tr>
                        <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Memuat audit log...
                        </td>
                      </tr>
                    ) : filteredAudit.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`py-10 text-center text-xs ${theme.textMuted}`}>
                          Tidak ada aktivitas yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAudit.map((log) => (
                        <tr key={log.id} className="transition-colors hover:bg-[#D08080]/[0.04]">
                          <td className={`py-4 px-5 sm:px-6 text-xs tabular-nums ${theme.textMuted}`}>
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="py-4 px-4 font-medium">{log.admin}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${
                                darkMode
                                  ? 'bg-[#D08080]/15 border-[#D08080]/30 text-[#E5A6A6]'
                                  : 'bg-[#F3DEDE]/75 border-[#D08080]/30 text-[#8B4F4F]'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className={`py-4 px-4 text-xs ${theme.textMuted}`}>{log.detail}</td>
                          <td className="py-4 px-5 sm:px-6 text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-500 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Sukses</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================== PENGATURAN */}
          {activeTab === 'pengaturan' && (
            <div className="space-y-6 sm:space-y-7">
              <div>
                <span className={`text-xs font-medium ${theme.roseLabel}`}>Konfigurasi Klinik</span>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Pengaturan</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
                <div className={`lg:col-span-5 rounded-3xl border p-5 sm:p-6 space-y-5 ${theme.elevatedCard}`}>
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-[#D08080]" />
                    <h3 className="font-semibold text-base">Preferensi Tampilan Menu</h3>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'antrian', label: 'Antrian' },
                      { key: 'emr', label: 'EMR' },
                      { key: 'keuangan', label: 'Keuangan' },
                      { key: 'audit', label: 'Audit Log' },
                    ].map((menu) => (
                      <label
                        key={menu.key}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-sm cursor-pointer ${theme.inputBg}`}
                      >
                        <span>{menu.label}</span>
                        <input
                          type="checkbox"
                          checked={draftPrefs[menu.key as keyof typeof draftPrefs]}
                          onChange={(e) =>
                            setDraftPrefs((prev) => ({ ...prev, [menu.key]: e.target.checked }))
                          }
                          className="accent-[#D08080] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    ))}

                    <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-sm opacity-60 ${theme.inputBg}`}>
                      <span>Pengaturan (Terkunci)</span>
                      <Lock className="w-3.5 h-3.5 text-[#D08080]" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={savePreferences}
                    disabled={savingPrefs}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium cursor-pointer disabled:opacity-60"
                  >
                    {savingPrefs ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>

                <div className="lg:col-span-7 space-y-5">
                  <div className={`rounded-3xl border p-5 sm:p-6 space-y-3 ${theme.elevatedCard}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-[#D08080]" />
                        <div>
                          <h3 className="font-semibold text-sm">Penyimpanan Supabase</h3>
                          <span className={`text-xs ${theme.textSubtle}`}>Bucket: emr-photos</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#D08080] tabular-nums">
                        {storage ? `${sizeMB.toFixed(2)} MB / 500 MB` : storageError ? 'Tidak tersedia' : 'Memuat...'}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#D08080]/15 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(2, storagePercent)}%` }}
                        className="h-full bg-[#D08080] rounded-full transition-[width] duration-500"
                      />
                    </div>
                    <p className={`text-xs ${theme.textSubtle}`}>
                      {storage
                        ? `${storage.fileCount} foto tersimpan. Ruang tersedia untuk foto intraoral & rontgen.`
                        : storageError
                        ? 'Ukuran bucket tidak dapat dibaca. Periksa konfigurasi Supabase.'
                        : 'Menghitung penggunaan bucket...'}
                    </p>
                    <button
                      type="button"
                      onClick={fetchStorage}
                      className={`text-[11px] font-medium text-[#D08080] hover:underline cursor-pointer`}
                    >
                      Segarkan ukuran penyimpanan
                    </button>
                  </div>

                  <div className={`rounded-3xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme.elevatedCard}`}>
                    <div>
                      <span className="text-xs font-medium text-[#D08080]">Arsip Lokal</span>
                      <h3 className="font-semibold text-base">Arsip Data Klinik (ZIP)</h3>
                      <p className={`text-xs ${theme.textMuted}`}>
                        Unduh salinan lengkap basis data pasien, rekam medis, dan laporan keuangan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadZip}
                      disabled={zipBusy}
                      className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium hover:border-[#D08080] cursor-pointer disabled:opacity-60 ${theme.pillSurface}`}
                    >
                      <Download className="w-3.5 h-3.5 text-[#D08080]" />
                      <span>{zipBusy ? 'Mengunduh ZIP...' : 'Unduh ZIP Sekarang'}</span>
                    </button>
                  </div>

                  <div className={`rounded-3xl border p-5 sm:p-6 space-y-4 ${theme.elevatedCard}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-base">Sinkronisasi Google Drive</h3>
                        <span
                          className={`text-xs font-medium ${
                            gdriveConnected ? 'text-emerald-500' : 'text-[#D08080]'
                          }`}
                        >
                          • {gdriveConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      {gdriveConnected ? (
                        <button
                          type="button"
                          onClick={disconnectDrive}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
                        >
                          <Cloud className="w-3.5 h-3.5 text-[#D08080]" />
                          <span>Putuskan Drive</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = '/api/backup/google-auth'
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
                        >
                          <Cloud className="w-3.5 h-3.5 text-[#D08080]" />
                          <span>Hubungkan Google Drive</span>
                        </button>
                      )}
                    </div>

                    <div className={`pt-4 border-t ${theme.hairline}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setRestoreCode('')
                          setRestoreFile(null)
                          setRestoreStatus('')
                          setRestoreOpen(true)
                        }}
                        className="w-full py-3 rounded-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore dari Backup</span>
                      </button>
                      <p className={`mt-2 text-xs text-center ${theme.textSubtle}`}>
                        * Memerlukan kode konfirmasi 6 digit dan file backup .zip.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================================================= REGISTRATION MODAL */}
      <SolidModal
        open={!!regType}
        onClose={() => setRegType(null)}
        theme={theme}
        className="max-w-md p-6 sm:p-8"
        labelledBy="registration-title"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#D08080]">Pendaftaran Antrean</span>
            <h3 id="registration-title" className="mt-0.5 text-xl font-semibold">
              {regType === 'online' ? 'Tambah Pasien Online' : 'Tambah Pasien Manual'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setRegType(null)}
            className="p-2 rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateRegistration} className="mt-6 space-y-4">
          <input
            type="text"
            required
            value={regForm.name}
            onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
            placeholder="Nama Lengkap *"
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
          />
          <input
            type="text"
            value={regForm.phone}
            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
            placeholder="No. Telepon"
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
          />
          {regType === 'online' && (
            <input
              type="email"
              value={regForm.email}
              onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              placeholder="Email"
              className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
            />
          )}
          <input
            type="text"
            value={regForm.complaint}
            onChange={(e) => setRegForm({ ...regForm, complaint: e.target.value })}
            placeholder="Keluhan"
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
          />

          <button
            type="submit"
            disabled={registering}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium uppercase tracking-[0.14em] shadow-md cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {registering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{registering ? 'Menyimpan...' : 'Simpan & Generate Kode'}</span>
          </button>
        </form>
      </SolidModal>

      {/* ============================================================== TICKET MODAL */}
      <SolidModal
        open={!!ticket}
        onClose={() => setTicket(null)}
        theme={theme}
        className="max-w-sm p-6 sm:p-8 text-center"
        labelledBy="ticket-title"
      >
        <button
          type="button"
          onClick={() => setTicket(null)}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup tiket"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="inline-block px-3 py-1 rounded-full bg-[#D08080]/15 text-xs font-medium text-[#D08080]">
          Tiket Antrian Aktif
        </span>
        <h3 id="ticket-title" className="mt-2 text-xl font-semibold">{ticket?.name}</h3>

        <div className={`mt-4 text-6xl sm:text-7xl font-semibold tracking-tight tabular-nums ${theme.roseAccent}`}>
          {ticket?.queueNo}
        </div>

        {ticket?.code ? (
          <>
            <div className="mt-5 py-4 px-5 rounded-2xl bg-[#D08080]/12 border border-[#D08080]/30">
              <span className={`block text-xs font-medium ${theme.textSubtle}`}>Token Akses 6-Karakter</span>
              <span className="mt-1 block text-2xl font-semibold tracking-[0.3em]">{ticket.code}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(ticket?.code || '')
                setCopiedToken(true)
                setTimeout(() => setCopiedToken(false), 1800)
              }}
              className="mt-5 w-full py-3 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedToken ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Token Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Kode Token</span>
                </>
              )}
            </button>
          </>
        ) : (
          <p className={`mt-5 py-4 px-5 rounded-2xl border text-xs leading-relaxed ${theme.inputBg} ${theme.textMuted}`}>
            Registrasi manual tidak menerbitkan token. Pasien akan dipanggil langsung oleh
            resepsionis sesuai nomor antrean.
          </p>
        )}
      </SolidModal>

      {/* ====================================================== PAYMENT CONFIRM MODAL */}
      <SolidModal
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        theme={theme}
        className="max-w-md p-6 sm:p-8"
        labelledBy="payment-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-[#D08080]">Konfirmasi Pembayaran</span>
            <h3 id="payment-title" className="mt-0.5 text-xl font-semibold">
              {paymentTarget?.patient.name}
            </h3>
            <p className={`text-xs ${theme.textSubtle}`}>
              {paymentTarget ? formatQueueNumber(paymentTarget.queue.queueNumber) : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPaymentTarget(null)}
            className="p-2 rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submitPayment} className="mt-5 space-y-4">
          <div>
            <label htmlFor="pay-amount" className="block text-xs font-medium mb-1.5">
              Jumlah Pembayaran
            </label>
            <input
              id="pay-amount"
              type="text"
              inputMode="numeric"
              value={formatRupiah(payAmount || '0')}
              onChange={(e) => setPayAmount(digitsOnly(e.target.value))}
              className={`w-full px-4 py-3 rounded-2xl border text-lg font-semibold tabular-nums focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
            />
          </div>

          <div>
            <span className="block text-xs font-medium mb-1.5">Metode Pembayaran</span>
            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'TRANSFER'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayMethod(method)}
                  className={`py-2.5 rounded-2xl border text-xs font-medium cursor-pointer ${
                    payMethod === method
                      ? 'border-[#D08080] bg-[#D08080]/15 text-[#D08080]'
                      : theme.pillSurface
                  }`}
                >
                  {method === 'CASH' ? 'Cash' : 'Digital / Transfer'}
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'TRANSFER' && (
            <div>
              <label htmlFor="pay-proof" className="block text-xs font-medium mb-1.5">
                Bukti Transfer (wajib)
              </label>
              <input
                id="pay-proof"
                type="file"
                accept="image/*"
                onChange={(e) => setPayProof(e.target.files?.[0] || null)}
                className={`w-full px-3 py-2.5 rounded-2xl border text-xs ${theme.inputBg}`}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={paying}
            className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {paying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{paying ? 'Memproses...' : 'Konfirmasi Pembayaran'}</span>
          </button>
        </form>
      </SolidModal>

      {/* =================================================== RECONCILE CONFIRM MODAL */}
      <SolidModal
        open={reconcileConfirmOpen}
        onClose={() => setReconcileConfirmOpen(false)}
        theme={theme}
        className="max-w-md p-6 sm:p-8 text-center space-y-5"
        labelledBy="reconcile-title"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-[#D08080]/15 border border-[#D08080]/35 flex items-center justify-center text-[#D08080]">
          <Wallet className="w-5 h-5" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[#D08080]">Konfirmasi Tutup Kas Harian</span>
          <h3 id="reconcile-title" className="text-xl font-semibold">
            Apakah Anda yakin untuk rekonsiliasi hari ini?
          </h3>
          <p className={`text-xs leading-relaxed ${theme.textMuted}`}>
            Kas fisik tercatat{' '}
            <strong className={theme.text}>{formatRupiah(physicalTotal)}</strong> dengan status{' '}
            <strong className={variance === 0 ? 'text-emerald-500' : 'text-[#D08080]'}>
              {variance === 0 ? 'Sesuai (Selisih Rp 0)' : `Ada Selisih ${formatRupiah(Math.abs(variance))}`}
            </strong>
            .
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setReconcileConfirmOpen(false)}
            className={`flex-1 py-3 rounded-full border text-xs font-medium cursor-pointer ${theme.pillSurface}`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={commitReconcile}
            disabled={reconciling}
            className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium shadow-md hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {reconciling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Ya, Simpan Rekonsiliasi</span>
          </button>
        </div>
      </SolidModal>

      {/* ============================================================= RESTORE MODAL */}
      <SolidModal
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        theme={theme}
        className="max-w-sm p-6 sm:p-8 space-y-4"
        labelledBy="restore-title"
      >
        <button
          type="button"
          onClick={() => setRestoreOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#D08080]/15 text-[#D08080] hover:bg-[#D08080] hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 id="restore-title" className="mt-3 text-xl font-semibold">
            Konfirmasi Restore Backup
          </h3>
          <p className={`mt-1 text-xs ${theme.textMuted}`}>
            Masukkan kode keamanan 8 digit dan pilih file backup. Seluruh data saat ini akan
            diganti dengan isi backup.
          </p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={restoreCode}
          onChange={(e) => setRestoreCode(e.target.value.replace(/\D/g, ''))}
          placeholder="• • • • • • • •"
          aria-label="Kode restore"
          className={`w-full px-4 py-3 rounded-2xl border text-center text-lg font-semibold tracking-[0.3em] ${theme.inputBg}`}
        />
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
          className={`w-full px-3 py-2.5 rounded-2xl border text-xs ${theme.inputBg}`}
          aria-label="File backup"
        />

        {restoreStatus && (
          <p className="text-xs text-[#D08080] font-medium text-center">{restoreStatus}</p>
        )}

        <button
          type="button"
          onClick={submitRestore}
          disabled={restoring}
          className="w-full py-3 rounded-full bg-amber-600 text-white text-xs font-medium cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{restoring ? 'Memulihkan...' : 'Verifikasi & Restore'}</span>
        </button>
      </SolidModal>

      <DangerConfirmModal
        state={dangerConfirm}
        onClose={() => setDangerConfirm(null)}
        theme={theme}
      />
    </div>
  )
}
