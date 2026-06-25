import { z } from "zod";

export const SUPPORTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
] as const;

export const SUPPORTED_EXTENSIONS = [".docx", ".pdf"] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const RUN_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type RunStatus = (typeof RUN_STATUS)[keyof typeof RUN_STATUS];

export const FINDING_RESULT = {
  PASS: "pass",
  FAIL: "fail",
  UNRESOLVED: "unresolved",
  NOT_APPLICABLE: "not_applicable",
  ERROR: "error",
} as const;

export type FindingResult = (typeof FINDING_RESULT)[keyof typeof FINDING_RESULT];

export const RISK_BANDS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const RETENTION_MODES = {
  STANDARD: "standard",
  NO_RETENTION: "no_retention",
} as const;

export const uploadSchema = z.object({
  retentionMode: z.enum(["standard", "no_retention"]).default("standard"),
});

export const startRunSchema = z.object({
  documentId: z.string().cuid(),
  retentionMode: z.enum(["standard", "no_retention"]).default("standard"),
  enableSupportAnalysis: z.boolean().default(false),
});
