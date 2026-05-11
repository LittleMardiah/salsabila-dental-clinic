import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hapus data lama (opsional, untuk clean start)
  await prisma.queue.deleteMany();
  await prisma.patient.deleteMany();

  // Buat 5 pasien dummy
  const patients = await prisma.patient.createMany({
    data: [
      {
        name: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@test.com',
        keluhan: 'Sakit gigi geraham',
      },
      {
        name: 'Siti Nurhaliza',
        phone: '081234567891',
        email: 'siti@test.com',
        keluhan: 'Gusi bengkak',
      },
      {
        name: 'Ahmad Rifai',
        phone: '081234567892',
        email: 'ahmad@test.com',
        keluhan: 'Sakit gigi berlubang',
      },
      {
        name: 'Dewi Sartika',
        phone: '081234567893',
        email: 'dewi@test.com',
        keluhan: 'Pembersihan karang gigi',
      },
      {
        name: 'Eko Prasetyo',
        phone: '081234567894',
        email: 'eko@test.com',
        keluhan: 'Cabut gigi',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded ${patients.count} patients`);

  // Ambil patient IDs untuk relasi queue
  const patientList = await prisma.patient.findMany();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buat 3 antrian dummy dengan status berbeda
  await prisma.queue.createMany({
    data: [
      {
        date: today,
        queueNumber: 1,
        patientId: patientList[0].id,
        status: 'WAITING',
      },
      {
        date: today,
        queueNumber: 2,
        patientId: patientList[1].id,
        status: 'CALLED',
        calledAt: new Date(),
      },
      {
        date: today,
        queueNumber: 3,
        patientId: patientList[2].id,
        status: 'COMPLETED',
        calledAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 1800000),
      },
    ],
  });

  console.log('Seeded 3 queues (waiting, called, completed)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
