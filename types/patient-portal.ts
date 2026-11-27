export type PortalPatient = {
  id: number
  noRm: string | null
  name: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  allergies: string | null
  createdAt?: string
}

export type PortalQueue = {
  id: number
  number: number
  label: string
  status: 'WAITING' | 'CALLED'
  statusLabel: string
  position: number
  waitingCount: number
  servingLabel: string | null
  date: string
}

export type PortalNextControl = {
  id: number | null
  date: string
  source: 'doctor'
  label: string
  status: 'DOCTOR'
  preferredTime: string | null
  note: string | null
  procedure: string | null
  doctor: string | null
}

export type PortalLastVisit = {
  id: number
  date: string
  queueLabel: string | null
  diagnosa: string
  tindakan: string
  dokter: string
}

export type PortalOverview = {
  clinic: { isOpen: boolean; updatedAt: string | null }
  activeQueue: PortalQueue | null
  servingLabel: string | null
  nextControl: PortalNextControl | null
  lastVisit: PortalLastVisit | null
  totalVisits: number
  patient: PortalPatient | null
  today: string
  tomorrow: string
}

export type PortalPhoto = {
  id: number
  name: string
  uploadedAt: string
  url: string
}

export type PortalOdontogram = {
  marks: Record<string, { color: string; label: string }>
  quadrants: {
    ur: string[]
    ul: string[]
    lr: string[]
    ll: string[]
  }
  legend: { id: string; label: string; color: string }[]
}

export type PortalVisit = {
  id: number
  queueId: number
  queueLabel: string | null
  queueDate: string | null
  keluhanUtama: string | null
  diagnosa: string
  tindakan: string
  resepObat: string | null
  catatanTambahan: string
  odontogram: PortalOdontogram | null
  dokterPenanggungJawab: string
  followUpDate: string | null
  followUpTime: string | null
  createdAt: string
  photos: PortalPhoto[]
}

export type PortalEmrResponse = {
  visits: PortalVisit[]
  nextControl: PortalNextControl | null
  totalVisits: number
}

export type PortalProfileResponse = {
  email: string
  createdAt: string
  lastLoginAt: string | null
  patient: PortalPatient
}
