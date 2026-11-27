-- The hand-written PatientAccount migration created the table without the
-- autoincrement sequence Prisma expects. Add it and continue from MAX(id).
CREATE SEQUENCE IF NOT EXISTS "PatientAccount_id_seq" OWNED BY "PatientAccount"."id";

ALTER TABLE "PatientAccount"
    ALTER COLUMN "id" SET DEFAULT nextval('"PatientAccount_id_seq"'::regclass);

SELECT setval(
    '"PatientAccount_id_seq"',
    COALESCE((SELECT MAX("id") FROM "PatientAccount"), 0) + 1,
    false
);
