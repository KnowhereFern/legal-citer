import { type FindingResult } from "./constants";

export interface Citation {
  text: string;
  page?: number;
  paragraphIndex?: number;
  spanStart: number;
  spanEnd: number;
}

export interface QuotedSpan {
  text: string;
  page?: number;
  paragraphIndex?: number;
  spanStart: number;
  spanEnd: number;
}

export type RecordCitationType =
  | "transcript"
  | "record"
  | "exhibit"
  | "paragraph";

export interface RecordCitation {
  text: string;
  type: RecordCitationType;
  page?: number;
  paragraphIndex?: number;
  spanStart: number;
  spanEnd: number;
}

export interface ExtractedDocument {
  text: string;
  paragraphs: { index: number; text: string; page: number }[];
  citations: Citation[];
  quotedSpans: QuotedSpan[];
  recordCitations: RecordCitation[];
  pageCount: number;
}

export interface CheckResult {
  checkType: string;
  result: FindingResult;
  citationText?: string;
  sourceQueried?: string;
  snippetUsed?: string;
  ruleId?: string;
  isAiAssisted: boolean;
  aiModelName?: string;
  aiModelVersion?: string;
  detail?: string;
  // Appendix-A enrichment
  canonicalCitation?: string;
  canonicalCaseName?: string;
  canonicalCourt?: string;
  paragraphIndex?: number;
  pageNumber?: number;
}

export interface ResolverResult {
  status: "resolved" | "unresolved" | "source_failure";
  content?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface PipelineConfig {
  enableSupportAnalysis: boolean;
  enableRecordCitations: boolean;
  fileSizeLimit: number;
  pageCountLimit: number;
  cpuTimeLimitMs: number;
  memoryLimitMb: number;
}

export interface ScoreResult {
  riskBand: string;
  coveragePct: number;
  citationCount: number;
  quoteIssues: number;
  unresolvedItems: number;
  authoritiesVerified: number;
  authoritiesUnresolved: number;
  quotationsChecked: number;
  quotationsMatched: number;
  recordCitationsChecked?: number;
  recordCitationsUnresolved?: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enableSupportAnalysis: false,
  enableRecordCitations: false,
  fileSizeLimit: 50 * 1024 * 1024,
  pageCountLimit: 500,
  cpuTimeLimitMs: 300_000,
  memoryLimitMb: 512,
};
