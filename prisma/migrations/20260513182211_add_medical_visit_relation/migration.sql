-- CreateTable
CREATE TABLE "MedicalVisit" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "queueId" INTEGER NOT NULL,
    "keluhanUtama" TEXT,
    "diagnosa" TEXT NOT NULL,
    "tindakan" TEXT NOT NULL,
    "resepObat" TEXT,
    "catatanTambahan" TEXT,
    "dokterPenanggungJawab" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalPhoto" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalVisit_queueId_key" ON "MedicalVisit"("queueId");

-- AddForeignKey
ALTER TABLE "MedicalVisit" ADD CONSTRAINT "MedicalVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalVisit" ADD CONSTRAINT "MedicalVisit_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalPhoto" ADD CONSTRAINT "MedicalPhoto_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "MedicalVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
