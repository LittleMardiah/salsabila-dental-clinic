// prisma/clear-data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearData() {
  console.log('🧹 Memulai penghapusan data dummy...')

  // Urutan penghapusan penting karena foreign key constraints
  // Hapus data dari child ke parent

  // 1. WebPushSubscription (tergantung queue)
  await prisma.webPushSubscription.deleteMany()
  console.log('✓ WebPushSubscription dihapus')

  // 2. MedicalPhoto (tergantung medicalVisit)
  await prisma.medicalPhoto.deleteMany()
  console.log('✓ MedicalPhoto dihapus')

  // 3. MedicalVisit (tergantung queue & patient)
  await prisma.medicalVisit.deleteMany()
  console.log('✓ MedicalVisit dihapus')

  // 4. Transaction (tergantung queue & patient)
  await prisma.transaction.deleteMany()
  console.log('✓ Transaction dihapus')

  // 5. DailyReconciliation (tidak tergantung tabel lain)
  await prisma.dailyReconciliation.deleteMany()
  console.log('✓ DailyReconciliation dihapus')

  // 6. Queue (tergantung patient)
  await prisma.queue.deleteMany()
  console.log('✓ Queue dihapus')

  // 7. Patient
  await prisma.patient.deleteMany()
  console.log('✓ Patient dihapus')

  // 8. AuditLog (opsional, jika ingin bersih)
  await prisma.auditLog.deleteMany()
  console.log('✓ AuditLog dihapus')

  // Catatan: AdminPreference TIDAK dihapus (biarkan token OAuth dan preferensi menu tetap ada)

  console.log('Semua data dummy berhasil dihapus!')
}

clearData()
  .catch((e) => {
    console.error('Gagal menghapus data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })