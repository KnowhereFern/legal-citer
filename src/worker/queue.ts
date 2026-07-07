import { Queue } from "bullmq";
import type { PipelineConfig } from "@/lib/types";

export const QUEUE_NAME = "verification-runs";

export function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
    };
  }
  return { host: "localhost", port: 6379 };
}

let _queue: Queue | null = null;

export function getVerificationQueue() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, { connection: getRedisConnection() });
  }
  return _queue;
}

export async function enqueueVerificationJob(data: {
  runId: string;
  documentId: string;
  config: PipelineConfig;
}) {
  return getVerificationQueue().add("verification", data, {
    jobId: data.runId,
    removeOnComplete: 100,
    removeOnFail: 50,
    // The pipeline calls multiple flaky external APIs (CourtListener,
    // GovInfo, flsenate.gov) that intermittently 5xx or rate-limit. A single
    // transient failure used to mark the run permanently FAILED (attempts: 1),
    // forcing the user to re-upload and re-process the entire document.
    // Two retries with exponential backoff absorbs blips without masking
    // genuine failures (a run that fails 3× is almost certainly a real
    // problem, not a transient one). The processor's catch block still
    // marks the run FAILED before re-throwing, so the eventual terminal
    // state on a 3rd failure is correct.
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000,
    },
  });
}
