'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AuditLogPage() {
  const [mode, setMode] = useState<'admin' | 'developer'>('admin')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditLog', mode, fromDate, toDate, actionFilter, adminFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('mode', mode)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (actionFilter) params.set('action', actionFilter)
      if (adminFilter) params.set('adminId', adminFilter)
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      return res.json()
    },
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Dari tanggal" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Sampai tanggal" />
            <Input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="Filter aksi (EN)" />
            <Input value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} placeholder="Filter admin" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="admin" onValueChange={(v) => setMode(v as 'admin' | 'developer')}>
        <TabsList>
          <TabsTrigger value="admin">Admin Mode (Bahasa Indonesia)</TabsTrigger>
          <TabsTrigger value="developer">Developer Mode (Raw JSON)</TabsTrigger>
        </TabsList>
        <TabsContent value="admin">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
                ) : data?.logs?.length === 0 ? (
                  <TableRow><TableCell colSpan={5}>Tidak ada log</TableCell></TableRow>
                ) : (
                  data?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                      <TableCell>{log.admin}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.detail}</TableCell>
                      <TableCell>{log.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="developer">
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[600px]">
            {JSON.stringify(data?.logs, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}