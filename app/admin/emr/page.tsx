'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Patient {
  id: number
  name: string
  phone: string | null
  email: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function EMRPatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const router = useRouter()

  const fetchPatients = async (page: number = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch patients')
      const data = await res.json()
      setPatients(data.patients || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
    } catch (error) {
      console.error(error)
      toast.error('Gagal memuat data pasien')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients(1)
  }, [search])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    fetchPatients(newPage)
  }

  const formatQueueNumber = (num: number) => `A-${num.toString().padStart(2, '0')}`

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <main className="p-8 lg:p-12">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">
              Pilih Pasien untuk EMR
            </h2>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">
              Cari dan kelola rekam medis elektronik pasien dengan presisi.
            </p>
          </div>
        </header>

        {/* Search Bar - glass-card style */}
        <section className="glass-card rounded-[2rem] p-8 mb-12 border border-white/40 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary/40 text-2xl">
                search
              </span>
              <input
                type="text"
                placeholder="Cari nama atau nomor HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 bg-surface-container-low/50 border-none rounded-2xl pl-14 pr-5 font-body focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>
        </section>

        {/* Tabel Pasien */}
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-ambient overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/40">
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">No</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Nama Lengkap</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest hidden sm:table-cell">No. HP</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest hidden md:table-cell">Email</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                      Memuat data...
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                      Tidak ada pasien ditemukan
                    </td>
                  </tr>
                ) : (
                  patients.map((patient, index) => {
                    const queueNumber = (pagination.page - 1) * pagination.limit + index + 1
                    return (
                      <tr key={patient.id} className="hover:bg-surface-container-low/30 transition-colors group">
                        <td className="px-8 py-6">
                          <span className="font-headline font-black text-base text-primary/80">
                            {formatQueueNumber(queueNumber)}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shadow-sm uppercase">
                              {patient.name.charAt(0)}
                            </div>
                            <span className="font-body font-medium text-on-surface/90">{patient.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 hidden sm:table-cell font-body text-on-surface-variant/80">
                          {patient.phone || '-'}
                        </td>
                        <td className="px-8 py-6 hidden md:table-cell font-body text-on-surface-variant/80">
                          {patient.email || '-'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => router.push(`/admin/emr/${patient.id}`)}
                            className="px-5 py-1.5 rounded-full border border-primary/70 text-primary/80 font-label text-xs font-bold hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            Kelola EMR
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="px-8 py-6 bg-surface-container-low/20 flex items-center justify-between border-t border-outline-variant/10 flex-wrap gap-4">
              <p className="text-sm text-on-surface-variant font-medium">
                Menampilkan{' '}
                <span className="font-bold text-primary">
                  {patients.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                </span>{' '}
                -{' '}
                <span className="font-bold text-primary">
                  {(pagination.page - 1) * pagination.limit + patients.length}
                </span>{' '}
                dari <span className="font-bold text-primary">{pagination.total}</span> pasien
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum = pagination.page
                  if (pagination.totalPages <= 5) pageNum = i + 1
                  else if (pagination.page <= 3) pageNum = i + 1
                  else if (pagination.page >= pagination.totalPages - 2)
                    pageNum = pagination.totalPages - 4 + i
                  else pageNum = pagination.page - 2 + i
                  if (pageNum < 1 || pageNum > pagination.totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                        pagination.page === pageNum
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-surface-container-lowest text-primary shadow-sm hover:bg-primary-container'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                  <span className="px-2 text-primary/40">...</span>
                )}
                {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary-container transition-all font-bold text-sm"
                  >
                    {pagination.totalPages}
                  </button>
                )}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs font-label text-on-surface-variant opacity-50">
            © 2025 Salsa Dental Portal. Secured with AES-256 Clinical Grade Encryption.
          </p>
        </footer>
      </main>
    </div>
  )
}