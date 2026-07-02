-- Add filing-context columns captured at upload time.
ALTER TABLE "Document"
  ADD COLUMN "jurisdiction" TEXT,
  ADD COLUMN "filingType" TEXT,
  ADD COLUMN "aiAssisted" TEXT,
  ADD COLUMN "aiTool" TEXT;

-- Migrate legacy retentionMode values to the new presets.
--   standard     -> keep_report
--   no_retention -> delete_raw
UPDATE "Document"
  SET "retentionMode" = CASE
    WHEN "retentionMode" = 'standard' THEN 'keep_report'
    WHEN "retentionMode" = 'no_retention' THEN 'delete_raw'
    ELSE 'delete_raw'
  END;

-- Default new documents to "delete raw file after verification".
ALTER TABLE "Document"
  ALTER COLUMN "retentionMode" SET DEFAULT 'delete_raw';
