export type QueueItem = {
  id: number
  queueNumber: number
  patientId: number
  patientName: string
  phone: string | null
  email: string | null
  keluhan: string | null
  status: 'WAITING' | 'CALLED' | 'COMPLETED'
  patientCode: string | null
  createdAt: string
  calledAt?: string | null
  completedAt?: string | null
}

export type PatientItem = {
  id: number
  name: string
  phone: string | null
  email: string | null
}

export type VisitPhoto = {
  id: number
  fileId: string | null
  fileName: string
  url: string
}

export type VisitItem = {
  id: number
  queueId: number
  queueNumber: number | null
  queueDate: string | null
  keluhanUtama: string | null
  diagnosa: string
  tindakan: string
  resepObat: string | null
  catatanTambahan: string | null
  dokterPenanggungJawab: string
  followUpDate: string | null
  createdAt: string
  photos: VisitPhoto[]
}

export type TransactionItem = {
  id: number
  queueId: number
  patientId: number
  amount: number | null
  paymentMethod: 'CASH' | 'TRANSFER' | null
  status: 'PENDING' | 'CONFIRMED' | null
  receiptUrl: string | null
  createdAt: string
  confirmedAt: string | null
  patient: { name: string }
  queue: { queueNumber: number }
}

export type AuditEntry = {
  id: number
  timestamp: string
  admin: string
  action: string
  actionType?: string
  detail: string
  status: string
}

export const QUEUE_STATUS_LABEL: Record<string, string> = {
  WAITING: 'MENUNGGU',
  CALLED: 'SEDANG DILAYANI',
  COMPLETED: 'SELESAI',
}
