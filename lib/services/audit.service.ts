import { prisma } from '@/lib/prisma'

export async function addAuditLog(
  adminId: string,
  actionType: string,
  recordType: string,
  recordId: string,
  technicalDetails?: any,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        actionType,
        recordType,
        recordId: String(recordId),
        technicalDetails: technicalDetails || {},
        ipAddress: ipAddress || null,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}