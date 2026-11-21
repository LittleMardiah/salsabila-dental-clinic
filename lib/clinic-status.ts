import { prisma } from '@/lib/prisma'

export const CLINIC_STATUS_ID = 1

export type ClinicStatusValue = {
  isOpen: boolean
  updatedAt: string | null
}

const FALLBACK_STATUS: ClinicStatusValue = { isOpen: true, updatedAt: null }

/**
 * Reads the singleton status row. Before the new migration is applied the
 * clinic is treated as open, so the public page never breaks on deploy.
 */
export async function readClinicStatus(): Promise<ClinicStatusValue> {
  try {
    const status = await prisma.clinicStatus.findUnique({
      where: { id: CLINIC_STATUS_ID },
      select: { isOpen: true, updatedAt: true },
    })
    if (!status) return FALLBACK_STATUS
    return { isOpen: status.isOpen, updatedAt: status.updatedAt.toISOString() }
  } catch {
    return FALLBACK_STATUS
  }
}

/** Upserts the singleton status row used by both the dashboard and the public page. */
export async function writeClinicStatus(isOpen: boolean, adminId: string) {
  return prisma.clinicStatus.upsert({
    where: { id: CLINIC_STATUS_ID },
    update: { isOpen, updatedBy: adminId },
    create: { id: CLINIC_STATUS_ID, isOpen, updatedBy: adminId },
    select: { isOpen: true, updatedAt: true },
  })
}
