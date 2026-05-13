import { PrismaClient, QueueStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')

  await prisma.webPushSubscription.deleteMany()  
  await prisma.queue.deleteMany()
  await prisma.patient.deleteMany()

  // Buat 5 pasien dummy
  const patients = await prisma.patient.createMany({
    data: [
      { name: 'Budi Santoso', phone: '081234567890', email: 'budi@test.com', keluhan: 'Sakit gigi geraham' },
      { name: 'Siti Nurhaliza', phone: '081234567891', email: 'siti@test.com', keluhan: 'Gusi bengkak' },
      { name: 'Ahmad Rifai', phone: '081234567892', email: 'ahmad@test.com', keluhan: 'Sakit gigi berlubang' },
      { name: 'Dewi Sartika', phone: '081234567893', email: 'dewi@test.com', keluhan: 'Pembersihan karang gigi' },
      { name: 'Eko Prasetyo', phone: '081234567894', email: 'eko@test.com', keluhan: 'Cabut gigi' },
    ],
    skipDuplicates: true,
  })
  console.log(`Seeded ${patients.count} patients`)

  const allPatients = await prisma.patient.findMany()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Buat 5 antrian (pastikan field patientCode dan codeExpiresAt sesuai schema Anda)
  await prisma.queue.createMany({
    data: [
      { date: today, queueNumber: 1, patientId: allPatients[0].id, status: QueueStatus.WAITING, patientCode: 'A1B2C3', codeExpiresAt: new Date(Date.now() + 24*60*60*1000) },
      { date: today, queueNumber: 2, patientId: allPatients[1].id, status: QueueStatus.CALLED, calledAt: new Date(), patientCode: 'D4E5F6', codeExpiresAt: new Date(Date.now() + 24*60*60*1000) },
      { date: today, queueNumber: 3, patientId: allPatients[2].id, status: QueueStatus.COMPLETED, calledAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 1800000), patientCode: 'G7H8I9', codeExpiresAt: new Date(Date.now() + 24*60*60*1000) },
      { date: today, queueNumber: 4, patientId: allPatients[3].id, status: QueueStatus.WAITING, patientCode: 'J0K1L2', codeExpiresAt: new Date(Date.now() + 24*60*60*1000) },
      { date: today, queueNumber: 5, patientId: allPatients[4].id, status: QueueStatus.WAITING, patientCode: 'M3N4O5', codeExpiresAt: new Date(Date.now() + 24*60*60*1000) },
    ],
  })
  console.log('Seeded 5 queues (2 waiting, 1 called, 2 completed)')
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })