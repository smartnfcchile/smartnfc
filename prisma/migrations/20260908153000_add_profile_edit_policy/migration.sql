ALTER TABLE "Company"
ADD COLUMN "profileEditPolicy" TEXT NOT NULL DEFAULT 'FLEXIBLE';

ALTER TABLE "Company"
ADD CONSTRAINT "Company_profileEditPolicy_check"
CHECK ("profileEditPolicy" IN ('FLEXIBLE', 'CORPORATE', 'ADMIN_ONLY'));
