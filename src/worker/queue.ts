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
    attempts: 1,
  });
}
