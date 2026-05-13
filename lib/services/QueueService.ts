import { prisma } from '@/lib/prisma'

export async function getQueuePosition(patientCode: string): Promise<{ position: number; totalWaiting: number; queueId: number } | null> {
  const queue = await prisma.queue.findFirst({
    where: {
      patientCode,
      status: { in: ['WAITING', 'CALLED'] },
      codeExpiresAt: { gt: new Date() },
    },
  })
  if (!queue) return null

  // Hitung jumlah antrian dengan status WAITING yang dibuat sebelum queue ini
  const waitingCount = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
      createdAt: { lt: queue.createdAt },
    },
  })
  const position = waitingCount + 1

  const totalWaiting = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
    },
  })

  return { position, totalWaiting, queueId: queue.id }
}