'use client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal fetch dashboard')
      }
      return res.json()
    },
    refetchInterval: 5000,
  })

  const stats = data?.data || { todayPatients: 0, todayRevenue: 0, activeQueues: 0 }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          Error: {error.message}
          <button onClick={() => refetch()} className="ml-4 underline">Coba lagi</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasien Hari Ini</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.todayPatients}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? '' : `+0 dari kemarin`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `Rp ${stats.todayRevenue.toLocaleString('id-ID')}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? '' : `+0 dari kemarin`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrian Aktif</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.activeQueues}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? '' : `Waiting + Called`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}