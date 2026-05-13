/*
  Warnings:

  - You are about to drop the `WebPushSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."WebPushSubscription" DROP CONSTRAINT "WebPushSubscription_queueId_fkey";

-- DropTable
DROP TABLE "public"."WebPushSubscription";

-- CreateTable
CREATE TABLE "webPushSubscription" (
    "id" SERIAL NOT NULL,
    "queueId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webPushSubscription_queueId_key" ON "webPushSubscription"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "webPushSubscription_endpoint_key" ON "webPushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "webPushSubscription" ADD CONSTRAINT "webPushSubscription_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
