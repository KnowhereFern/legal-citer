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

export const CHECK_TYPES = {
  CITATION_EXISTENCE: "citation_existence",
  CITATION_METADATA: "citation_metadata",
  QUOTE_MATCHING: "quote_matching",
  RECORD_CITATION: "record_citation",
} as const;

export type CheckType = (typeof CHECK_TYPES)[keyof typeof CHECK_TYPES];

export const RISK_BANDS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const FINAL_STATUS = {
  CLEARED: "CLEARED FOR FILING",
  CLEARED_WITH_EXCEPTIONS: "CLEARED WITH DISCLOSED EXCEPTIONS",
  NOT_CLEARED: "NOT CLEARED",
} as const;

export type FinalStatus = (typeof FINAL_STATUS)[keyof typeof FINAL_STATUS];

export const RETENTION_MODES = {
  DELETE_RAW: "delete_raw",
  KEEP_REPORT: "keep_report",
  PRIVATE: "private",
} as const;

export type RetentionMode = (typeof RETENTION_MODES)[keyof typeof RETENTION_MODES];

export const RETENTION_DEFAULT = RETENTION_MODES.DELETE_RAW;

// Upload-time filing context.

export const FILING_TYPE_VALUES = [
  "motion",
  "brief",
  "complaint",
  "affidavit",
  "proposed_order",
  "other",
] as const;

export const FILING_TYPES = [
  { value: "motion", label: "Motion" },
  { value: "brief", label: "Brief" },
  { value: "complaint", label: "Complaint" },
  { value: "affidavit", label: "Affidavit" },
  { value: "proposed_order", label: "Proposed Order" },
  { value: "other", label: "Other" },
] as const;

export type FilingType = (typeof FILING_TYPE_VALUES)[number];

export const AI_ASSISTED_VALUES = ["yes", "no", "unsure"] as const;
export type AiAssisted = (typeof AI_ASSISTED_VALUES)[number];

export const AI_TOOL_VALUES = [
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
  "lexis",
  "other",
] as const;

export const AI_TOOLS = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "copilot", label: "Copilot" },
  { value: "lexis", label: "Lexis+ AI" },
  { value: "other", label: "Other" },
] as const;

export type AiTool = (typeof AI_TOOL_VALUES)[number];

const retentionModeEnum = z.enum([
  RETENTION_MODES.DELETE_RAW,
  RETENTION_MODES.KEEP_REPORT,
  RETENTION_MODES.PRIVATE,
]);

export const uploadSchema = z.object({
  retentionMode: retentionModeEnum.default(RETENTION_DEFAULT),
  jurisdiction: z.string().trim().optional(),
  filingType: z.enum(FILING_TYPE_VALUES).optional(),
  aiAssisted: z.enum(AI_ASSISTED_VALUES).optional(),
  aiTool: z.enum(AI_TOOL_VALUES).optional(),
});

export const startRunSchema = z.object({
  documentId: z.string().cuid(),
  retentionMode: retentionModeEnum.default(RETENTION_DEFAULT),
  enableSupportAnalysis: z.boolean().default(false),
  enableRecordCitations: z.boolean().default(false),
});
