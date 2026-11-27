-- Patient identity fields used by the PWA and the Admin desk.
ALTER TABLE "Patient" ADD COLUMN "noRm" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "allergies" TEXT;
CREATE UNIQUE INDEX "Patient_noRm_key" ON "Patient"("noRm");

-- Backfill existing clinical patients so Admin and the PWA always share a No. RM.
WITH numbered AS (
    SELECT
        "id",
        to_char("createdAt", 'YYYY') AS year_label,
        ROW_NUMBER() OVER (
            PARTITION BY to_char("createdAt", 'YYYY')
            ORDER BY "createdAt", "id"
        ) AS sequence
    FROM "Patient"
    WHERE "noRm" IS NULL
)
UPDATE "Patient" p
SET "noRm" = 'RM-' || n.year_label || '-' || lpad(n.sequence::text, 4, '0')
FROM numbered n
WHERE p."id" = n."id";

-- Optional time label for the doctor's follow-up schedule.
ALTER TABLE "MedicalVisit" ADD COLUMN "followUpTime" TEXT;

-- Patient PWA accounts: one login account per patient (unique patientId/email).
CREATE TABLE "PatientAccount" (
    "id" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "resetAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientAccount_patientId_key" ON "PatientAccount"("patientId");
CREATE UNIQUE INDEX "PatientAccount_email_key" ON "PatientAccount"("email");
CREATE UNIQUE INDEX "PatientAccount_resetTokenHash_key" ON "PatientAccount"("resetTokenHash");

ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
