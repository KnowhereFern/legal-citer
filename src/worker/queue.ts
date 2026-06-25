import { Queue } from "bullmq";
import * as nextEnv from "@next/env";
import type { PipelineConfig } from "@/lib/types";

nextEnv.loadEnvConfig(process.cwd());

export const QUEUE_NAME = "verification-runs";

export const redisConnection = (() => {
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
})();

export const verificationQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueVerificationJob(data: {
  runId: string;
  documentId: string;
  config: PipelineConfig;
}) {
  return verificationQueue.add("verification", data, {
    jobId: data.runId,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 1,
  });
}
