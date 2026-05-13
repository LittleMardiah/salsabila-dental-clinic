import { prisma } from '@/lib/prisma'

/**
 * Menghasilkan nomor antrian untuk hari ini.
 * @param date - Tanggal (set jam 00:00:00)
 * @returns nomor antrian selanjutnya (1 jika belum ada antrian hari ini)
 */
export async function generateQueueNumber(date: Date): Promise<number> {
  const lastQueue = await prisma.queue.findFirst({
    where: { date },
    orderBy: { queueNumber: 'desc' },
  })
  return lastQueue ? lastQueue.queueNumber + 1 : 1
}

/**
 * Menghasilkan kode 6 digit alfanumerik unik (huruf besar + angka) yang belum dipakai di Queue.
 * @returns kode unik 6 digit
 */
export async function generatePatientCode(): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789' // tanpa I, O untuk menghindari kebingungan
  const length = 6
  let code = ''
  let isUnique = false

  while (!isUnique) {
    code = ''
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    // Cek keunikan di database
    const existing = await prisma.queue.findUnique({
      where: { patientCode: code },
    })
    if (!existing) {
      isUnique = true
    }
  }
  return code
}