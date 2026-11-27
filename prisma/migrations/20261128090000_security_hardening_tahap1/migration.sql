-- Persistent fixed-window rate limiting shared by all serverless instances.
CREATE TABLE "RateLimitBucket" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_key_windowStart_key" ON "RateLimitBucket"("key", "windowStart");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- JWT session revocation. Existing accounts start at 0; tokens issued before
-- this migration carry no version and are therefore rejected (users sign in
-- again once, which is the safe default after a security change).
ALTER TABLE "PatientAccount" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
