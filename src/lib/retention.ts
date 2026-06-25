import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

export async function enforceRetentionPolicy(
  documentId: string
): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { retentionPolicy: true },
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (!document.retentionPolicy) {
    return;
  }

  const expiresAt = new Date(
    document.uploadedAt.getTime() +
      document.retentionPolicy.rawFileHours * 60 * 60 * 1000
  );

  if (new Date() >= expiresAt) {
    throw new Error(
      `Document ${documentId} has exceeded its retention period`
    );
  }
}

export function scheduleCleanup(runId: string): void {
  setTimeout(async () => {
    try {
      const run = await prisma.verificationRun.findUnique({
        where: { id: runId },
        include: { retentionPolicy: true },
      });

      if (!run) return;

      const delayHours = run.retentionPolicy?.tempArtifactHours ?? 4;
      const cutoff = new Date(
        run.createdAt.getTime() + delayHours * 60 * 60 * 1000
      );

      if (new Date() < cutoff) return;

      const stages = await prisma.pipelineStage.findMany({
        where: { runId },
      });

      for (const stage of stages) {
        const output = stage.output as Record<string, unknown> | null;
        if (output?.artifactKey && typeof output.artifactKey === "string") {
          await deleteFile(output.artifactKey).catch(() => {});
        }
      }
    } catch (error) {
      console.error(`Cleanup failed for run ${runId}:`, error);
    }
  }, 60 * 1000);
}

export async function purgeExpiredDocuments(): Promise<number> {
  const policies = await prisma.retentionPolicy.findMany();
  let purged = 0;

  for (const policy of policies) {
    const cutoff = new Date(
      Date.now() - policy.rawFileHours * 60 * 60 * 1000
    );

    const expired = await prisma.document.findMany({
      where: {
        retentionPolicyId: policy.id,
        uploadedAt: { lt: cutoff },
      },
    });

    for (const doc of expired) {
      await deleteFile(doc.storageKey).catch(() => {});
      await prisma.document.delete({ where: { id: doc.id } });
      purged++;
    }
  }

  return purged;
}
