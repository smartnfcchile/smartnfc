-- CreateTable
CREATE TABLE "PublicRateLimit" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicRateLimit_windowStart_idx" ON "PublicRateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "PublicRateLimit_keyHash_action_windowStart_key" ON "PublicRateLimit"("keyHash", "action", "windowStart");
