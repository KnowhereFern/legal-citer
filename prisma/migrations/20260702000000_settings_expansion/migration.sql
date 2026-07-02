-- AlterTable: Organization — workspace defaults, public verification, plan, notification prefs
ALTER TABLE "Organization" ADD COLUMN "defaultJurisdiction" TEXT,
ADD COLUMN "defaultFilingType" TEXT,
ADD COLUMN "publicVerificationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "notifyReportReady" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyAttachPdf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyShareLink" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: RetentionPolicy — report retention (null = keep indefinitely)
ALTER TABLE "RetentionPolicy" ADD COLUMN "reportHours" INTEGER;
