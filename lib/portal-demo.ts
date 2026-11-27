import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/ServerAuth'
import { addDays, clinicDateOnly } from '@/lib/clinic-date'
import { generateQueueNumber } from '@/lib/utils/QueueUtils'
import { generateNoRm } from '@/lib/patient-id'
import { DEFAULT_LEGEND, embedOdontogram } from '@/lib/ui-theme'

export type DemoPersona = 'new' | 'history'

export const DEMO_PASSWORD = 'SalsaPatient2026'

export const DEMO_ACCOUNTS: {
  persona: DemoPersona
  name: string
  email: string
  phone: string
  noRm: string
  note: string
}[] = [
  {
    persona: 'history',
    name: 'Rina Marlina',
    email: 'rina@demo.salsabila.clinic',
    phone: '0812 3456 7890',
    noRm: 'RM-2026-0148',
    note: 'EMR + foto klinis + jadwal kontrol',
  },
  {
    persona: 'new',
    name: 'Budi Santoso',
    email: 'budi@demo.salsabila.clinic',
    phone: '0813 9988 7766',
    noRm: 'RM-2026-0219',
    note: 'Pasien baru — EMR masih kosong',
  },
]

export function isDemoEnabled(): boolean {
  return process.env.PATIENT_DEMO_ENABLED !== 'false'
}

async function ensureDemoPatient(definition: (typeof DEMO_ACCOUNTS)[number]) {
  // Link by account first: a tester may have edited the demo e-mail in Profil,
  // and that must not fork a second patient record.
  const accountMatch = await prisma.patientAccount.findFirst({
    where: { email: definition.email },
    include: { patient: { include: { account: true } } },
  })

  let patient =
    accountMatch?.patient ??
    (await prisma.patient.findFirst({
      where: { email: { equals: definition.email, mode: 'insensitive' } },
      include: { account: true },
    }))

  const dateOfBirth = new Date(definition.persona === 'history' ? '1996-05-14T00:00:00.000Z' : '1998-10-22T00:00:00.000Z')
  const allergies = definition.persona === 'history' ? 'Tidak ada alergi obat' : 'Belum ada catatan alergi'

  if (!patient) {
    // A fixed demo No. RM can already be taken after a previous DB state; fall
    // back to an issued number so demo provisioning never hard-fails.
    const base = {
      name: definition.name,
      email: definition.email,
      phone: definition.phone,
      dateOfBirth,
      allergies,
      keluhan: 'Akun demo PWA pasien',
    }
    patient = await prisma.patient
      .create({
        data: { ...base, noRm: definition.noRm },
        include: { account: true },
      })
      .catch(async () =>
        prisma.patient.create({
          data: { ...base, noRm: await generateNoRm() },
          include: { account: true },
        })
      )
  } else {
    const existing = patient
    const data: { noRm?: string; email?: string } = {}
    if (!existing.noRm) data.noRm = definition.noRm
    if (existing.email !== definition.email) data.email = definition.email

    if (Object.keys(data).length > 0) {
      const updated = await prisma.patient.update({ where: { id: existing.id }, data }).catch(async () => {
        if (!data.noRm) throw new Error('gagal menyelaraskan akun demo')
        return prisma.patient.update({
          where: { id: existing.id },
          data: { ...data, noRm: await generateNoRm() },
        })
      })
      patient = { ...existing, noRm: updated.noRm, email: updated.email }
    }
  }

  return patient
}

async function ensureDemoAccountRecord(patient: Awaited<ReturnType<typeof ensureDemoPatient>>, definition: (typeof DEMO_ACCOUNTS)[number]) {
  if (patient.account) {
    // Demo credentials must stay canonical even after someone tests "edit
    // profil" or "lupa sandi" on this account.
    if (patient.account.email !== definition.email) {
      await prisma.patientAccount
        .update({
          where: { id: patient.account.id },
          data: { email: definition.email },
        })
        .catch(() => null)
    }
    return prisma.patientAccount.update({
      where: { id: patient.account.id },
      data: {
        passwordHash: await hashPassword(DEMO_PASSWORD),
        lastLoginAt: new Date(),
      },
    })
  }

  const data = {
    patientId: patient.id,
    email: definition.email,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    lastLoginAt: new Date(),
  }

  // A concurrent demo click can create the row first; then reuse it instead
  // of failing the whole "Isi cepat akun demo" action.
  return prisma.patientAccount.create({ data }).catch(async (error) => {
    const existing = await prisma.patientAccount.findUnique({
      where: { email: definition.email },
    })
    if (existing) return existing
    throw error
  })
}

async function createCompletedVisit(input: {
  patientId: number
  date: Date
  keluhanUtama: string
  diagnosa: string
  tindakan: string
  resepObat: string
  catatan: string
  marks: Record<string, { color: string; label: string }>
  followUpDate?: Date
  followUpTime?: string
}) {
  const queueNumber = await generateQueueNumber(input.date)
  const day = input.date.toISOString().slice(0, 10)
  const queue = await prisma.queue.create({
    data: {
      date: input.date,
      queueNumber,
      patientId: input.patientId,
      status: 'COMPLETED',
      calledAt: new Date(`${day}T03:00:00.000Z`),
      completedAt: new Date(`${day}T03:45:00.000Z`),
    },
  })
  return prisma.medicalVisit.create({
    data: {
      patientId: input.patientId,
      queueId: queue.id,
      keluhanUtama: input.keluhanUtama,
      diagnosa: input.diagnosa,
      tindakan: input.tindakan,
      resepObat: input.resepObat,
      dokterPenanggungJawab: 'drg. Salsabila',
      followUpDate: input.followUpDate,
      followUpTime: input.followUpTime,
      catatanTambahan: embedOdontogram(input.catatan, {
        marks: input.marks,
        quadrants: {
          ur: ['18', '17', '16', '15', '14', '13', '12', '11'],
          ul: ['21', '22', '23', '24', '25', '26', '27', '28'],
          lr: ['48', '47', '46', '45', '44', '43', '42', '41'],
          ll: ['31', '32', '33', '34', '35', '36', '37', '38'],
        },
        legend: DEFAULT_LEGEND,
      }),
    },
  })
}

async function seedDemoHistory(patientId: number) {
  const existingVisit = await prisma.medicalVisit.findFirst({
    where: { patientId },
    select: { id: true },
  })

  if (!existingVisit) {
    const today = clinicDateOnly()
    const followUpDate = addDays(today, 6)
    const followUpTime = '16:00 – 16:30 WIB'

    const latestVisit = await createCompletedVisit({
      patientId,
      date: addDays(today, -7),
      keluhanUtama: 'Gigi belakang kiri bawah terasa ngilu saat mengunyah.',
      diagnosa: 'Karies Dentin Profunda Gigi #36',
      tindakan: 'Restorasi Komposit & Pemeriksaan Oklusi',
      resepObat: 'Asam Mefenamat 500 mg — diminum bila terasa ngilu',
      catatan: 'Pembersihan jaringan karies, aplikasi liner pelindung pulpa, dan penambalan resin komposit sewarna gigi.',
      marks: {
        '16': { color: '#D9776C', label: 'Karies' },
        '36': { color: '#6B9AB8', label: 'Tambalan Komposit' },
        '46': { color: '#C49A5C', label: 'Observasi' },
      },
      followUpDate,
      followUpTime,
    })

    await prisma.medicalPhoto.createMany({
      data: [
        {
          visitId: latestVisit.id,
          fileUrl: '/demo/emr-intraoral.jpg',
          fileName: 'Dokumentasi Intraoral #36',
        },
        {
          visitId: latestVisit.id,
          fileUrl: '/demo/emr-xray.jpg',
          fileName: 'Radiografi Periapikal #36',
        },
      ],
    })

    await createCompletedVisit({
      patientId,
      date: addDays(today, -90),
      keluhanUtama: 'Pemeriksaan rutin dan pembersihan karang gigi.',
      diagnosa: 'Kalkulus Supragingiva Ringan',
      tindakan: 'Scaling & Pemetaan Odontogram Awal',
      resepObat: 'Obat kumur antiseptik non-alkohol 2x sehari',
      catatan: 'Pembersihan karang gigi menyeluruh disertai edukasi teknik menyikat gigi lembut.',
      marks: {},
    })
  }
}

/**
 * Idempotently prepares the two demo accounts used by "Isi akun demo":
 * Rina has real EMR rows (odontogram + photos + follow-up), Budi has none.
 * History seeding is best-effort: a seeded-data hiccup must never stop the
 * patient from signing in to the demo account.
 */
export async function ensureDemoAccount(persona: DemoPersona) {
  const definition = DEMO_ACCOUNTS.find((item) => item.persona === persona)
  if (!definition) throw new Error('Persona demo tidak dikenal')

  const patient = await ensureDemoPatient(definition)
  const account = await ensureDemoAccountRecord(patient, definition)

  if (persona === 'history') {
    try {
      await seedDemoHistory(patient.id)
    } catch (error) {
      console.error('[portal-demo] gagal melengkapi riwayat demo:', error)
    }
  }

  return { account, patient }
}
