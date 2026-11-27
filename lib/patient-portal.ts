import { prisma } from '@/lib/prisma'
import { readClinicStatus } from '@/lib/clinic-status'
import { addDays, clinicDateOnly } from '@/lib/clinic-date'
import {
  parseOdontogram,
  stripOdontogram,
  type OdontogramPayload,
} from '@/lib/ui-theme'

export function queueLabel(value: number | null | undefined): string {
  if (!value) return 'A-00'
  return `A-${value.toString().padStart(2, '0')}`
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

/** Today's live queue for this patient, straight from the same Queue table the clinic uses. */
export async function getActiveQueue(patientId: number): Promise<PortalQueue | null> {
  const today = clinicDateOnly()
  const queue = await prisma.queue.findFirst({
    where: {
      patientId,
      date: today,
      status: { in: ['WAITING', 'CALLED'] },
    },
    orderBy: { queueNumber: 'desc' },
  })
  if (!queue) return null

  const [before, waitingCount, serving] = await Promise.all([
    prisma.queue.count({
      where: { date: queue.date, status: 'WAITING', queueNumber: { lt: queue.queueNumber } },
    }),
    prisma.queue.count({ where: { date: queue.date, status: 'WAITING' } }),
    prisma.queue.findFirst({
      where: { date: queue.date, status: 'CALLED', calledAt: { not: null } },
      orderBy: { calledAt: 'desc' },
      select: { queueNumber: true },
    }),
  ])

  return {
    id: queue.id,
    number: queue.queueNumber,
    label: queueLabel(queue.queueNumber),
    status: queue.status === 'CALLED' ? 'CALLED' : 'WAITING',
    statusLabel: queue.status === 'CALLED' ? 'Sedang dilayani' : 'Menunggu giliran',
    position: queue.status === 'CALLED' ? 0 : before + 1,
    waitingCount,
    servingLabel: serving ? queueLabel(serving.queueNumber) : null,
    date: queue.date.toISOString(),
  }
}

export type NextControl = {
  date: string
  source: 'doctor'
  label: string
  status: 'DOCTOR'
  preferredTime: string | null
  note: string | null
  procedure: string | null
  doctor: string | null
  id: number | null
}

/**
 * Read-only follow-up written by the doctor in the Admin EMR. The patient can
 * only confirm or change it through the clinic WhatsApp channel.
 */
export async function getNextControl(patientId: number): Promise<NextControl | null> {
  const today = clinicDateOnly()
  const doctorFollowUp = await prisma.medicalVisit.findFirst({
    where: { patientId, followUpDate: { gte: today } },
    orderBy: { followUpDate: 'asc' },
    select: {
      id: true,
      followUpDate: true,
      followUpTime: true,
      tindakan: true,
      dokterPenanggungJawab: true,
    },
  })

  if (!doctorFollowUp?.followUpDate) return null

  return {
    id: doctorFollowUp.id,
    date: doctorFollowUp.followUpDate.toISOString(),
    source: 'doctor',
    label: 'Rekomendasi dokter',
    status: 'DOCTOR',
    preferredTime: doctorFollowUp.followUpTime,
    note: null,
    procedure: doctorFollowUp.tindakan,
    doctor: doctorFollowUp.dokterPenanggungJawab,
  }
}

export async function getLastVisitSummary(patientId: number) {
  const visit = await prisma.medicalVisit.findFirst({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: { queue: { select: { queueNumber: true, date: true } } },
  })
  if (!visit) return null
  return {
    id: visit.id,
    date: visit.queue?.date ? visit.queue.date.toISOString() : visit.createdAt.toISOString(),
    queueLabel: visit.queue?.queueNumber ? queueLabel(visit.queue.queueNumber) : null,
    diagnosa: visit.diagnosa,
    tindakan: visit.tindakan,
    dokter: visit.dokterPenanggungJawab,
  }
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
  odontogram: OdontogramPayload | null
  dokterPenanggungJawab: string
  followUpDate: string | null
  followUpTime: string | null
  createdAt: string
  photos: { id: number; name: string; uploadedAt: string; url: string }[]
}

export async function getPatientVisits(patientId: number): Promise<PortalVisit[]> {
  const visits = await prisma.medicalVisit.findMany({
    where: { patientId },
    include: {
      photos: { orderBy: { uploadedAt: 'asc' } },
      queue: { select: { queueNumber: true, date: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return visits.map((visit) => ({
    id: visit.id,
    queueId: visit.queueId,
    queueLabel: visit.queue?.queueNumber ? queueLabel(visit.queue.queueNumber) : null,
    queueDate: visit.queue?.date ? visit.queue.date.toISOString() : null,
    keluhanUtama: visit.keluhanUtama,
    diagnosa: visit.diagnosa,
    tindakan: visit.tindakan,
    resepObat: visit.resepObat,
    catatanTambahan: stripOdontogram(visit.catatanTambahan),
    odontogram: parseOdontogram(visit.catatanTambahan),
    dokterPenanggungJawab: visit.dokterPenanggungJawab,
    followUpDate: visit.followUpDate ? visit.followUpDate.toISOString() : null,
    followUpTime: visit.followUpTime,
    createdAt: visit.createdAt.toISOString(),
    photos: visit.photos.map((photo) => ({
      id: photo.id,
      name: photo.fileName,
      uploadedAt: photo.uploadedAt.toISOString(),
      // Demo/seed photos live in /public; clinical uploads stream from Drive.
      url: photo.fileId ? `/api/portal/photos/${photo.id}` : photo.fileUrl,
    })),
  }))
}

export function phoneVariants(input: string): string[] {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return [trimmed]
  const local = digits.startsWith('62') ? `0${digits.slice(2)}` : digits
  const international = local.startsWith('0') ? `62${local.slice(1)}` : local
  return Array.from(
    new Set([trimmed, digits, local, international, `+${international}`, `+${digits}`])
  )
}

/** Login accepts either the account email or the patient's WhatsApp number. */
export async function findPatientAccountByIdentifier(identifier: string) {
  const email = identifier.trim().toLowerCase()
  const byEmail = await prisma.patientAccount.findUnique({
    where: { email },
    include: { patient: true },
  })
  if (byEmail) return byEmail

  const variants = phoneVariants(identifier)
  return prisma.patientAccount.findFirst({
    where: {
      patient: {
        OR: variants.map((phone) => ({ phone })),
      },
    },
    include: { patient: true },
  })
}

export async function getPortalHome(patientId: number) {
  const today = clinicDateOnly()
  const [clinicStatus, activeQueue, nextControl, lastVisit, totalVisits, patient, serving] =
    await Promise.all([
    readClinicStatus(),
    getActiveQueue(patientId),
    getNextControl(patientId),
    getLastVisitSummary(patientId),
    prisma.medicalVisit.count({ where: { patientId } }),
    prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        noRm: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        allergies: true,
        createdAt: true,
      },
    }),
    prisma.queue.findFirst({
      where: { date: today, status: 'CALLED' },
      orderBy: { calledAt: 'desc' },
      select: { queueNumber: true },
    }),
  ])

  return {
    clinic: clinicStatus,
    activeQueue,
    servingLabel: serving ? queueLabel(serving.queueNumber) : null,
    nextControl,
    lastVisit,
    totalVisits,
    patient,
    today: today.toISOString(),
    tomorrow: addDays(today, 1).toISOString(),
  }
}
