import { prisma } from '@/lib/prisma'

/**
 * No. RM format shared by the Admin desk and the patient PWA: RM-YYYY-XXXX.
 * Generated at registration, at Admin walk-in registration, and by the demo seed.
 */
export function noRmPrefix(value: Date = new Date()): string {
  const year = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
  }).format(value)
  return `RM-${year}-`
}

export async function generateNoRm(): Promise<string> {
  const prefix = noRmPrefix()
  const last = await prisma.patient.findFirst({
    where: { noRm: { startsWith: prefix } },
    orderBy: { noRm: 'desc' },
    select: { noRm: true },
  })
  const lastSequence = last?.noRm ? Number.parseInt(last.noRm.slice(prefix.length), 10) || 0 : 0

  for (let sequence = lastSequence + 1; sequence <= lastSequence + 100; sequence += 1) {
    const candidate = `${prefix}${String(sequence).padStart(4, '0')}`
    const exists = await prisma.patient.findUnique({
      where: { noRm: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
  }

  // Extreme fallback: keep the format unique even after 100 retries.
  return `${prefix}${Date.now().toString().slice(-4)}`
}

export function displayNoRm(noRm: string | null | undefined): string {
  return noRm || 'RM belum diterbitkan'
}
