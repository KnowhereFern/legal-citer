import crypto from "crypto";
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./constants";

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function isValidFileType(filename: string, contentType: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    return false;
  }
  if (
    ext === ".pdf" &&
    contentType !== "application/pdf"
  ) {
    return false;
  }
  if (
    ext === ".docx" &&
    contentType !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return false;
  }
  return true;
}

export function isValidFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}
