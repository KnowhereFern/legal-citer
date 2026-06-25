import fs from "fs";
import path from "path";
import os from "os";

export function createRunWorkspace(runId: string): string {
  const dir = path.join(os.tmpdir(), "legal-citer", runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function cleanupWorkspace(workspacePath: string): Promise<void> {
  await fs.promises.rm(workspacePath, { recursive: true, force: true });
}

export async function enforceResourceLimits(params: {
  filePath: string;
  fileSizeLimit: number;
  pageCountLimit: number;
}): Promise<void> {
  const stat = await fs.promises.stat(params.filePath);

  if (stat.size > params.fileSizeLimit) {
    throw new Error(
      `File size ${stat.size} exceeds limit ${params.fileSizeLimit}`
    );
  }

  const ext = path.extname(params.filePath).toLowerCase();
  if (ext === ".pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = await fs.promises.readFile(params.filePath);
    const pdf = await pdfParse(buffer);
    if (pdf.numpages > params.pageCountLimit) {
      throw new Error(
        `Page count ${pdf.numpages} exceeds limit ${params.pageCountLimit}`
      );
    }
  }
}
