-- AlterTable: filing-identification + summary-of-results columns on Report
ALTER TABLE "Report" ADD COLUMN "caseNumber"                 TEXT;
ALTER TABLE "Report" ADD COLUMN "filingTitle"                TEXT;
ALTER TABLE "Report" ADD COLUMN "aiToolsDisclosed"           TEXT;
ALTER TABLE "Report" ADD COLUMN "attorneyName"               TEXT;
ALTER TABLE "Report" ADD COLUMN "barNumber"                  TEXT;
ALTER TABLE "Report" ADD COLUMN "lawFirm"                    TEXT;
ALTER TABLE "Report" ADD COLUMN "party"                      TEXT;
ALTER TABLE "Report" ADD COLUMN "verificationVendor"         TEXT;
ALTER TABLE "Report" ADD COLUMN "authoritiesVerified"        INTEGER;
ALTER TABLE "Report" ADD COLUMN "authoritiesUnresolved"      INTEGER;
ALTER TABLE "Report" ADD COLUMN "quotationsChecked"          INTEGER;
ALTER TABLE "Report" ADD COLUMN "quotationsMatched"          INTEGER;
ALTER TABLE "Report" ADD COLUMN "recordCitationsChecked"     INTEGER;
ALTER TABLE "Report" ADD COLUMN "recordCitationsUnresolved"  INTEGER;

-- AlterTable: Appendix-A detail columns on Finding
ALTER TABLE "Finding" ADD COLUMN "detail"            TEXT;
ALTER TABLE "Finding" ADD COLUMN "canonicalCitation" TEXT;
ALTER TABLE "Finding" ADD COLUMN "canonicalCaseName" TEXT;
ALTER TABLE "Finding" ADD COLUMN "canonicalCourt"    TEXT;
ALTER TABLE "Finding" ADD COLUMN "paragraphIndex"    INTEGER;
ALTER TABLE "Finding" ADD COLUMN "pageNumber"        INTEGER;
