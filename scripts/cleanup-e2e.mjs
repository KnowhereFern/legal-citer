import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const uploadsDir =
  process.env.UPLOADS_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "uploads");
const testClerkOrgId = process.env.E2E_CLERK_ORG_ID || "org_e2e";

function getS3Config() {
  const bucket = process.env.S3_BUCKET_NAME || process.env.BUCKET;
  const endpoint = process.env.S3_ENDPOINT || process.env.ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY;

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    endpoint,
    region: process.env.S3_REGION || process.env.REGION || "auto",
    accessKeyId,
    secretAccessKey,
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "1" ||
      process.env.S3_URL_STYLE === "path",
  };
}

async function removeUpload(storageKey) {
  const s3Config = getS3Config();
  if (process.env.UPLOAD_STORAGE_BACKEND === "s3" || s3Config) {
    if (!s3Config) {
      return;
    }

    const client = new S3Client({
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      forcePathStyle: s3Config.forcePathStyle,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
    await client.send(
      new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: storageKey })
    );
    return;
  }

  try {
    await fs.unlink(path.join(uploadsDir, storageKey));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function main() {
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: testClerkOrgId },
  });

  if (!org) {
    return;
  }

  const documents = await prisma.document.findMany({
    where: { orgId: org.id },
    select: { id: true, storageKey: true },
  });
  const runs = await prisma.verificationRun.findMany({
    where: { orgId: org.id },
    select: { id: true },
  });

  const documentIds = documents.map((document) => document.id);
  const runIds = runs.map((run) => run.id);

  await prisma.$transaction([
    prisma.verificationManifest.deleteMany({ where: { runId: { in: runIds } } }),
    prisma.pipelineStage.deleteMany({ where: { runId: { in: runIds } } }),
    prisma.finding.deleteMany({ where: { runId: { in: runIds } } }),
    prisma.report.deleteMany({ where: { runId: { in: runIds } } }),
    prisma.verificationRun.deleteMany({ where: { id: { in: runIds } } }),
    prisma.document.deleteMany({ where: { id: { in: documentIds } } }),
    prisma.auditEvent.deleteMany({ where: { orgId: org.id } }),
  ]);

  await Promise.all(
    documents.map((document) => removeUpload(document.storageKey))
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
