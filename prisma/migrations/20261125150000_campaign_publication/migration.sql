CREATE TYPE "CampaignLandingDestination" AS ENUM ('REDIRECT', 'LANDING');

ALTER TABLE "CampaignLanding"
  ADD COLUMN "destination" "CampaignLandingDestination" NOT NULL DEFAULT 'REDIRECT',
  ADD COLUMN "expiresAt" TIMESTAMPTZ(3);
