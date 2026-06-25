import { nanoid } from "nanoid";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";

type StorageBackend = "filesystem" | "s3";

const filesystemUploadsDir =
  process.env.UPLOADS_DIR ??
  process.env.RAILWAY_VOLUME_MOUNT_PATH ??
  path.join(process.cwd(), "uploads");

function getStorageBackend(): StorageBackend {
  const configured = process.env.UPLOAD_STORAGE_BACKEND;

  if (configured === "filesystem" || configured === "s3") {
    return configured;
  }

  if (process.env.BUCKET || process.env.S3_BUCKET_NAME) {
    return "s3";
  }

  return "filesystem";
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required for S3 upload storage.`);
  }

  return value;
}

function getS3Config() {
  return {
    bucket: requireEnv(
      "S3_BUCKET_NAME or BUCKET",
      process.env.S3_BUCKET_NAME ?? process.env.BUCKET
    ),
    endpoint: requireEnv(
      "S3_ENDPOINT or ENDPOINT",
      process.env.S3_ENDPOINT ?? process.env.ENDPOINT
    ),
    region: process.env.S3_REGION ?? process.env.REGION ?? "auto",
    accessKeyId: requireEnv(
      "S3_ACCESS_KEY_ID or ACCESS_KEY_ID",
      process.env.S3_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID
    ),
    secretAccessKey: requireEnv(
      "S3_SECRET_ACCESS_KEY or SECRET_ACCESS_KEY",
      process.env.S3_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY
    ),
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "1" ||
      process.env.S3_URL_STYLE === "path",
  };
}

let s3Client: S3Client | null = null;

function getS3Client() {
  const config = getS3Config();

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return { client: s3Client, bucket: config.bucket };
}

async function ensureUploadsDir() {
  await fs.mkdir(filesystemUploadsDir, { recursive: true });
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported S3 object body.");
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
  contentType?: string
): Promise<string> {
  const storageKey = `${nanoid()}_${filename}`;

  if (getStorageBackend() === "s3") {
    const { client, bucket } = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return storageKey;
  }

  await ensureUploadsDir();
  await fs.writeFile(path.join(filesystemUploadsDir, storageKey), buffer);
  return storageKey;
}

export async function readFile(storageKey: string): Promise<Buffer> {
  if (getStorageBackend() === "s3") {
    const { client, bucket } = getS3Client();
    const output = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey })
    );
    return streamToBuffer(output.Body);
  }

  return fs.readFile(path.join(filesystemUploadsDir, storageKey));
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (getStorageBackend() === "s3") {
    const { client, bucket } = getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    return;
  }

  await fs.unlink(path.join(filesystemUploadsDir, storageKey));
}
