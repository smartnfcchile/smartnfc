-- SmartNFC Soluciones V1: additive, isolated tables.
-- Does not modify Empresas, Local, Card, LocalTouchpoint, or license records.
CREATE TYPE "SolutionMode" AS ENUM ('ASSETS','CAMPAIGN');
CREATE TYPE "SolutionRecordStatus" AS ENUM ('DRAFT','ACTIVE','INACTIVE','ARCHIVED');
CREATE TYPE "SolutionTagStatus" AS ENUM ('PENDING','ACTIVE','DISABLED','REPLACED');

CREATE TABLE "SolutionProject" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "mode" "SolutionMode" NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SolutionProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SolutionProject_id_companyId_key" ON "SolutionProject"("id","companyId");
CREATE INDEX "SolutionProject_companyId_status_idx" ON "SolutionProject"("companyId","status");

CREATE TABLE "SolutionTemplate" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
 "code" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "name" TEXT NOT NULL,
 "fields" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SolutionTemplate_projectId_companyId_fkey" FOREIGN KEY ("projectId","companyId") REFERENCES "SolutionProject"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SolutionTemplate_projectId_code_version_key" ON "SolutionTemplate"("projectId","code","version");
CREATE UNIQUE INDEX "SolutionTemplate_id_projectId_companyId_key" ON "SolutionTemplate"("id","projectId","companyId");
CREATE INDEX "SolutionTemplate_companyId_projectId_idx" ON "SolutionTemplate"("companyId","projectId");

CREATE TABLE "SolutionRecord" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
 "templateId" TEXT NOT NULL, "externalCode" TEXT NOT NULL, "status" "SolutionRecordStatus" NOT NULL DEFAULT 'DRAFT',
 "data" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SolutionRecord_projectId_companyId_fkey" FOREIGN KEY ("projectId","companyId") REFERENCES "SolutionProject"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SolutionRecord_templateId_projectId_companyId_fkey" FOREIGN KEY ("templateId","projectId","companyId") REFERENCES "SolutionTemplate"("id","projectId","companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SolutionRecord_projectId_externalCode_key" ON "SolutionRecord"("projectId","externalCode");
CREATE UNIQUE INDEX "SolutionRecord_id_projectId_companyId_key" ON "SolutionRecord"("id","projectId","companyId");
CREATE INDEX "SolutionRecord_companyId_projectId_status_idx" ON "SolutionRecord"("companyId","projectId","status");

CREATE TABLE "SolutionBatch" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
 "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SolutionBatch_projectId_companyId_fkey" FOREIGN KEY ("projectId","companyId") REFERENCES "SolutionProject"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SolutionBatch_id_projectId_companyId_key" ON "SolutionBatch"("id","projectId","companyId");
CREATE INDEX "SolutionBatch_companyId_projectId_idx" ON "SolutionBatch"("companyId","projectId");

CREATE TABLE "SolutionTag" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
 "recordId" TEXT, "batchId" TEXT, "publicToken" TEXT NOT NULL,
 "status" "SolutionTagStatus" NOT NULL DEFAULT 'PENDING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SolutionTag_projectId_companyId_fkey" FOREIGN KEY ("projectId","companyId") REFERENCES "SolutionProject"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SolutionTag_recordId_projectId_companyId_fkey" FOREIGN KEY ("recordId","projectId","companyId") REFERENCES "SolutionRecord"("id","projectId","companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SolutionTag_batchId_projectId_companyId_fkey" FOREIGN KEY ("batchId","projectId","companyId") REFERENCES "SolutionBatch"("id","projectId","companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SolutionTag_publicToken_key" ON "SolutionTag"("publicToken");
CREATE INDEX "SolutionTag_companyId_projectId_status_idx" ON "SolutionTag"("companyId","projectId","status");
CREATE INDEX "SolutionTag_recordId_idx" ON "SolutionTag"("recordId");
CREATE INDEX "SolutionTag_batchId_idx" ON "SolutionTag"("batchId");
