-- Singleton row for the clinic's operational status (Buka / Tutup).
CREATE TABLE "ClinicStatus" (
    "id" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "ClinicStatus_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ClinicStatus" ("id", "isOpen", "updatedAt", "updatedBy")
VALUES (1, true, NOW(), NULL);
