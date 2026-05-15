// app/admin/emr/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  }, [search]) // reload saat search berubah

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    fetchPatients(newPage)
  }

  const formatQueueNumber = (num: number) => `A-${num.toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-bold text-on-surface tracking-tight font-headline">Pilih Pasien untuk EMR</h2>
        <p className="text-on-surface-variant/80 text-lg">Cari dan kelola rekam medis elektronik pasien dengan presisi.</p>
      </div>

      {/* Search Bar with 3D inset effect */}
      <div className="mb-10 max-w-2xl">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary">search</span>
          <Input
            placeholder="Cari nama atau no HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full inset-search-3d border-0 rounded-3xl pl-14 pr-8 py-5 focus:ring-0 focus:outline-none transition-all placeholder:text-outline-variant/60 font-medium text-on-surface"
          />
        </div>
      </div>

      {/* Pearl Glass Table Section */}
      <section className="rounded-[2.5rem] p-10 pearl-glass-table">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <TableHeader>
              <TableRow className="border-b border-surface-container-high/50">
                <TableHead className="pb-8 pt-2 px-6 text-[11px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold font-headline">No Antrian</TableHead>
                <TableHead className="pb-8 pt-2 px-6 text-[11px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold font-headline">Nama Lengkap</TableHead>
                <TableHead className="pb-8 pt-2 px-6 text-[11px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold font-headline">No. HP</TableHead>
                <TableHead className="pb-8 pt-2 px-6 text-[11px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold font-headline">Email</TableHead>
                <TableHead className="pb-8 pt-2 px-6 text-right text-[11px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold font-headline">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-surface-container/20">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">Memuat data...</TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">Tidak ada pasien ditemukan</TableCell>
                </TableRow>
              ) : (
                patients.map((patient, index) => {
                  // Hitung nomor antrian berdasarkan urutan dan halaman
                  const queueNumber = (pagination.page - 1) * pagination.limit + index + 1
                  return (
                    <TableRow key={patient.id} className="group transition-all duration-300 hover:bg-white/40">
                      <TableCell className="py-7 px-6">
                        <span className="bg-surface-container/60 border border-surface-container p-2 px-3.5 rounded-xl text-primary font-bold text-xs shadow-sm">{formatQueueNumber(queueNumber)}</span>
                      </TableCell>
                      <TableCell className="py-7 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-primary-fixed border border-white flex items-center justify-center text-primary font-bold shadow-sm uppercase">
                            {patient.name.charAt(0)}
                          </div>
                          <span className="font-bold text-on-surface text-[15px]">{patient.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-6 text-on-surface-variant font-medium">{patient.phone || '-'}</TableCell>
                      <TableCell className="py-7 px-6 text-on-surface-variant font-medium">{patient.email || '-'}</TableCell>
                      <TableCell className="py-7 px-6 text-right">
                        <button
                          onClick={() => router.push(`/admin/emr/${patient.id}`)}
                          className="cta-3d-pill text-white px-7 py-3 rounded-full font-bold text-sm inline-flex items-center gap-2.5 soft-rim-light font-headline"
                        >
                          <span className="material-symbols-outlined text-[20px]">history_edu</span>
                          Kelola EMR
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Section */}
        {!loading && pagination.totalPages > 0 && (
          <div className="mt-12 pt-10 border-t border-surface-container-high/50 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-on-surface-variant/80 font-medium italic">
              Menampilkan {patients.length > 0 ? ((pagination.page - 1) * pagination.limit + 1) : 0} -{' '}
              {((pagination.page - 1) * pagination.limit + patients.length)} dari {pagination.total} pasien terdaftar
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-on-surface transition-all hover:bg-primary-container/20 hover:text-primary shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (pagination.totalPages > 5) {
                  if (pagination.page <= 3) pageNum = i + 1
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                  else pageNum = pagination.page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${
                      pagination.page === pageNum
                        ? 'bg-[#815152] text-white font-bold shadow-lg shadow-primary/20'
                        : 'bg-white/60 border border-white/80 text-on-surface hover:bg-primary-container/20 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-on-surface transition-all hover:bg-primary-container/20 hover:text-primary shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Custom CSS for 3D effects - add to globals.css or use <style> */}
      <style jsx>{`
        .inset-search-3d {
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 
            inset 2px 2px 6px rgba(129, 81, 82, 0.08),
            inset -2px -2px 6px rgba(255, 255, 255, 0.8),
            0 1px 0 rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(129, 81, 82, 0.05);
        }
        .pearl-glass-table {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 
            0 20px 40px -10px rgba(129, 81, 82, 0.08),
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 0 0 1px rgba(220, 161, 161, 0.1);
          position: relative;
        }
        .pearl-glass-table::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.3) 100%);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .cta-3d-pill {
          background: linear-gradient(145deg, #fceeee 0%, #DCA1A1 45%, #815152 100%);
          box-shadow: 
            0 6px 16px rgba(129, 81, 82, 0.15),
            inset 0 1px 2px rgba(255, 255, 255, 0.6),
            0 0 0 1px rgba(129, 81, 82, 0.05);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .cta-3d-pill:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 10px 24px rgba(129, 81, 82, 0.2),
            inset 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        .cta-3d-pill:active {
          transform: translateY(1px);
          box-shadow: 
            0 2px 8px rgba(129, 81, 82, 0.1),
            inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .soft-rim-light {
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6) inset, 0 12px 24px -10px rgba(129, 81, 82, 0.1);
        }
      `}</style>
    </div>
  )
}