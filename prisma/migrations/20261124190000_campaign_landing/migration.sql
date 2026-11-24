-- AlterTable
ALTER TABLE "SolutionTag" ADD COLUMN     "campaignSiteId" TEXT;

-- CreateTable
CREATE TABLE "CampaignLanding" (
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publishedVersionId" TEXT,

    CONSTRAINT "CampaignLanding_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "CampaignLandingVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLandingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLandingSite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CampaignLandingSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLanding_projectId_companyId_key" ON "CampaignLanding"("projectId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLandingVersion_id_projectId_companyId_key" ON "CampaignLandingVersion"("id", "projectId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLandingVersion_projectId_revision_key" ON "CampaignLandingVersion"("projectId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLandingSite_id_projectId_companyId_key" ON "CampaignLandingSite"("id", "projectId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLandingSite_projectId_name_key" ON "CampaignLandingSite"("projectId", "name");

-- AddForeignKey
ALTER TABLE "SolutionTag" ADD CONSTRAINT "SolutionTag_campaignSiteId_projectId_companyId_fkey" FOREIGN KEY ("campaignSiteId", "projectId", "companyId") REFERENCES "CampaignLandingSite"("id", "projectId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLanding" ADD CONSTRAINT "CampaignLanding_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "SolutionProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLanding" ADD CONSTRAINT "CampaignLanding_publishedVersionId_projectId_companyId_fkey" FOREIGN KEY ("publishedVersionId", "projectId", "companyId") REFERENCES "CampaignLandingVersion"("id", "projectId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLandingVersion" ADD CONSTRAINT "CampaignLandingVersion_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "CampaignLanding"("projectId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLandingSite" ADD CONSTRAINT "CampaignLandingSite_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "SolutionProject"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION campaign_landing_version_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Campaign landing versions are immutable';
END;
$$;

CREATE TRIGGER campaign_landing_version_immutable
BEFORE UPDATE OR DELETE ON "CampaignLandingVersion"
FOR EACH ROW EXECUTE FUNCTION campaign_landing_version_immutable();
