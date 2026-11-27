CREATE TABLE "CampaignUvCache" (
    "locationKey" VARCHAR(24) NOT NULL,
    "slot" INTEGER NOT NULL,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "lastModified" VARCHAR(64),
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignUvCache_pkey" PRIMARY KEY ("locationKey"),
    CONSTRAINT "CampaignUvCache_slot_range" CHECK ("slot" BETWEEN 1 AND 500),
    CONSTRAINT "CampaignUvCache_payload_limit" CHECK (octet_length("payload"::text) <= 16384)
);
CREATE UNIQUE INDEX "CampaignUvCache_slot_key" ON "CampaignUvCache"("slot");

CREATE TABLE "CampaignUvProviderState" (
    "id" INTEGER NOT NULL,
    "nextRequestAt" TIMESTAMP(3) NOT NULL,
    "nextCleanupAt" TIMESTAMP(3) NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CampaignUvProviderState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CampaignUvProviderState_singleton" CHECK ("id" = 1)
);
