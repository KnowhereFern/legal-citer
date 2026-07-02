import { Worker, type Job } from "bullmq";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { runVerification } from "@/verification/pipeline/runner";
import {
  createRunWorkspace,
  cleanupWorkspace,
  enforceResourceLimits,
} from "@/lib/isolation";
import { RUN_STATUS } from "@/lib/constants";
import { QUEUE_NAME, getRedisConnection } from "./queue";

async function processJob(job: Job) {
  const { runId, config } = job.data;
  const workspace = createRunWorkspace(runId);

  try {
    const run = await prisma.verificationRun.findUnique({
      where: { id: runId },
      include: { document: true },
    });

    if (!run?.document) {
      throw new Error(`Run or document not found: ${runId}`);
    }

    await prisma.verificationRun.update({
      where: { id: runId },
      data: { status: RUN_STATUS.RUNNING, startedAt: new Date() },
    });

    const documentBuffer = await readFile(run.document.storageKey);
    const localPath = path.join(workspace, run.document.filename);
    await fs.writeFile(localPath, documentBuffer);

    await enforceResourceLimits({
      filePath: localPath,
      fileSizeLimit: config.fileSizeLimit,
      pageCountLimit: config.pageCountLimit,
    });

    await runVerification({
      runId,
      documentBuffer,
      contentType: run.document.contentType,
      config,
    });

    await prisma.verificationRun.update({
      where: { id: runId },
      data: {
        status: RUN_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await prisma.verificationRun.update({
      where: { id: runId },
      data: {
        status: RUN_STATUS.FAILED,
        failureReason: reason,
        completedAt: new Date(),
      },
    });
    throw error;
  } finally {
    await cleanupWorkspace(workspace);
  }
}

export function createWorker(): Worker {
  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  return worker;
}
