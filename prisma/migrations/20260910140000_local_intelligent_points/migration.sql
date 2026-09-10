CREATE TYPE "LocalPointObjective" AS ENUM ('GOOGLE_REVIEW','WHATSAPP','SOCIAL','CLUB','PROMOTION','MENU','SMART_LANDING');
CREATE TYPE "LocalPointMedium" AS ENUM ('NFC','QR','NFC_QR');
ALTER TYPE "LocalEventType" ADD VALUE 'DESTINATION_REDIRECT';
ALTER TABLE "LocalTouchpoint"
  ADD COLUMN "objective" "LocalPointObjective" NOT NULL DEFAULT 'CLUB',
  ADD COLUMN "medium" "LocalPointMedium" NOT NULL DEFAULT 'NFC_QR',
  ADD COLUMN "location" TEXT,
  ADD COLUMN "destinationUrl" TEXT,
  ADD COLUMN "smartLinks" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "configurationVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "LocalVisit" ADD COLUMN "objective" "LocalPointObjective" NOT NULL DEFAULT 'CLUB';
-- Existing points keep the Club destination, physical code and all past events.
-- A point's campaign is its tenant boundary and cannot be reassigned.
CREATE FUNCTION prevent_local_point_campaign_transfer() RETURNS trigger AS $$
BEGIN
  IF NEW."campaignId" IS DISTINCT FROM OLD."campaignId" THEN
    RAISE EXCEPTION 'A Local point cannot change campaign';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LocalTouchpoint_prevent_campaign_transfer"
BEFORE UPDATE OF "campaignId" ON "LocalTouchpoint"
FOR EACH ROW EXECUTE FUNCTION prevent_local_point_campaign_transfer();
