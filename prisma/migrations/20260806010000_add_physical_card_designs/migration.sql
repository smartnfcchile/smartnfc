CREATE TYPE "PhysicalDesignCategory" AS ENUM ('PROFESSIONAL', 'LOCAL');
CREATE TYPE "PhysicalDesignStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "PhysicalOrderStatus" AS ENUM ('REQUESTED', 'IN_REVIEW', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED');

CREATE TABLE "CardDesignTemplate" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "category" "PhysicalDesignCategory" NOT NULL,
  "description" TEXT, "orientation" TEXT NOT NULL DEFAULT 'LANDSCAPE', "frontSchema" JSONB NOT NULL,
  "backSchema" JSONB NOT NULL, "editableFields" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPremium" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardDesignTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CardDesignTemplate_slug_key" ON "CardDesignTemplate"("slug");
CREATE INDEX "CardDesignTemplate_category_isActive_sortOrder_idx" ON "CardDesignTemplate"("category", "isActive", "sortOrder");

CREATE TABLE "PhysicalCardDesign" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "cardId" TEXT NOT NULL, "createdById" TEXT NOT NULL,
  "templateId" TEXT NOT NULL, "name" TEXT NOT NULL, "category" "PhysicalDesignCategory" NOT NULL,
  "orientation" TEXT NOT NULL DEFAULT 'LANDSCAPE', "widthMm" DOUBLE PRECISION NOT NULL DEFAULT 85.6,
  "heightMm" DOUBLE PRECISION NOT NULL DEFAULT 53.98, "bleedMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
  "safeMarginMm" DOUBLE PRECISION NOT NULL DEFAULT 3, "frontDesign" JSONB NOT NULL, "backDesign" JSONB NOT NULL,
  "productionConfig" JSONB, "status" "PhysicalDesignStatus" NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhysicalCardDesign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhysicalCardDesign_companyId_status_updatedAt_idx" ON "PhysicalCardDesign"("companyId", "status", "updatedAt");
CREATE INDEX "PhysicalCardDesign_companyId_cardId_idx" ON "PhysicalCardDesign"("companyId", "cardId");

CREATE TABLE "PhysicalCardOrder" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "designId" TEXT NOT NULL, "requestedById" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "productionMethod" TEXT NOT NULL, "printSides" TEXT NOT NULL, "finish" TEXT NOT NULL,
  "status" "PhysicalOrderStatus" NOT NULL DEFAULT 'REQUESTED', "notes" TEXT, "internalNotes" TEXT,
  "estimatedAmount" DECIMAL(12,2), "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PhysicalCardOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PhysicalCardOrder_companyId_status_createdAt_idx" ON "PhysicalCardOrder"("companyId", "status", "createdAt");
CREATE INDEX "PhysicalCardOrder_designId_idx" ON "PhysicalCardOrder"("designId");

ALTER TABLE "PhysicalCardDesign" ADD CONSTRAINT "PhysicalCardDesign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardDesign" ADD CONSTRAINT "PhysicalCardDesign_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardDesign" ADD CONSTRAINT "PhysicalCardDesign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardDesign" ADD CONSTRAINT "PhysicalCardDesign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CardDesignTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardOrder" ADD CONSTRAINT "PhysicalCardOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardOrder" ADD CONSTRAINT "PhysicalCardOrder_designId_fkey" FOREIGN KEY ("designId") REFERENCES "PhysicalCardDesign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalCardOrder" ADD CONSTRAINT "PhysicalCardOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
