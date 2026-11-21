ALTER TABLE "SolutionProject" ADD COLUMN "destinationUrl" TEXT,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "SolutionOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolutionOperation_projectId_companyId_fkey"
      FOREIGN KEY ("projectId", "companyId") REFERENCES "SolutionProject"("id", "companyId")
      ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SolutionOperation_projectId_companyId_createdAt_idx"
ON "SolutionOperation"("projectId", "companyId", "createdAt");
ALTER TABLE "SolutionRecord" ADD COLUMN "location" TEXT;
