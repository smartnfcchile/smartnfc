CREATE TABLE "CampaignUvCache" (
    "locationKey" TEXT NOT NULL,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "lastModified" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignUvCache_pkey" PRIMARY KEY ("locationKey")
);
CREATE INDEX "CampaignUvCache_attemptedAt_idx" ON "CampaignUvCache"("attemptedAt");
