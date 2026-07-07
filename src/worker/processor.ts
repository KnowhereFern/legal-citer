import { Worker, type Job } from "bullmq";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { readFile } from "@/lib/storage";
import { runVerification } from "@/verification/pipeline/runner";
import { runHybridVerification } from "@/verification/hybrid-pipeline";
import {
  createRunWorkspace,
  cleanupWorkspace,
  enforceResourceLimits,
} from "@/lib/isolation";
import { RUN_STATUS } from "@/lib/constants";
import { sendRunCompleteNotifications } from "@/lib/notifications";
import { QUEUE_NAME, getRedisConnection } from "./queue";

async function processJob(job: Job) {
  const { runId, config } = job.data;
  const workspace = createRunWorkspace(runId);

  // Lifted to the outer scope so the catch block can fire failure
  // notifications with the run's org/creator/filename context.
  let runMeta: {
    orgId: string;
    createdBy: string;
    documentFilename: string;
  } | null = null;

  try {
    const run = await prisma.verificationRun.findUnique({
      where: { id: runId },
      include: { document: true },
    });

    if (!run?.document) {
      throw new Error(`Run or document not found: ${runId}`);
    }

    runMeta = {
      orgId: run.orgId,
      createdBy: run.createdBy,
      documentFilename: run.document.filename,
    };

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

    // When the user opts into support analysis (the LLM-assisted proposition
    // check), route through the hybrid pipeline — it runs the base pipeline,
    // then calls the SupportAnalyst on each resolved case-law citation and
    // recomputes the score with the LLM findings folded in. Previously the
    // worker always called runVerification directly, so the
    // enableSupportAnalysis flag flowed upload → API → worker and was then
    // dropped on the floor — the hybrid path was unreachable in production.
    if (config.enableSupportAnalysis) {
      await runHybridVerification({
        runId,
        documentBuffer,
        contentType: run.document.contentType,
        config,
        enableSupportAnalysis: true,
      });
    } else {
      await runVerification({
        runId,
        documentBuffer,
        contentType: run.document.contentType,
        config,
      });
    }

    await prisma.verificationRun.update({
      where: { id: runId },
      data: {
        status: RUN_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Fire report-ready email if the org opted in. Best-effort — wrapped
    // internally so a delivery failure never affects the run's terminal
    // state. Skipped silently when RESEND_API_KEY isn't set.
    if (runMeta) {
      await sendRunCompleteNotifications({
        runId,
        orgId: runMeta.orgId,
        createdBy: runMeta.createdBy,
        documentFilename: runMeta.documentFilename,
        status: "completed",
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    // Only mark the run FAILED on the final attempt. With attempts: 3 +
    // exponential backoff, attempts 1 and 2 will be retried — marking FAILED
    // prematurely would make the UI flash "failed" between retries, and a
    // successful retry would then need to flip it back to RUNNING. BullMQ
    // exposes attemptsMade/attemptsMade on the job; on a non-final attempt
    // we re-throw without touching status so the next attempt picks up
    // cleanly.
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts?.attempts ?? 1;
    const isFinalAttempt = attemptsMade >= maxAttempts;
    if (isFinalAttempt) {
      await prisma.verificationRun.update({
        where: { id: runId },
        data: {
          status: RUN_STATUS.FAILED,
          failureReason: reason,
          completedAt: new Date(),
        },
      });
      // Notify on terminal failure (not between retries) — the user needs
      // to know their run didn't complete so they can re-upload or contact
      // support. Best-effort, same as the success path.
      if (runMeta) {
        await sendRunCompleteNotifications({
          runId,
          orgId: runMeta.orgId,
          createdBy: runMeta.createdBy,
          documentFilename: runMeta.documentFilename,
          status: "failed",
          failureReason: reason,
        });
      }
    } else {
      // Surface the transient failure in the reason field but keep the run
      // in RUNNING so the UI stays consistent through the retry window.
      await prisma.verificationRun.update({
        where: { id: runId },
        data: {
          failureReason: `Attempt ${attemptsMade} failed (retrying): ${reason}`,
        },
      });
    }
    throw error;
  } finally {
    await cleanupWorkspace(workspace);
  }
}

export function createWorker(): Worker {
  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
    stalledInterval: 300000,
    maxStalledCount: 3,
    lockDuration: 600000,
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  return worker;
}
