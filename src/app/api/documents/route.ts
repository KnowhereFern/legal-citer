import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadSchema } from "@/lib/constants";
import { computeFileHash, isValidFileType, isValidFileSize } from "@/lib/files";
import { saveFile } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";
import { resolveWorkspace } from "@/lib/workspace";

export async function POST(request: NextRequest) {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, userId } = workspace;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rawRetentionMode = formData.get("retentionMode") as string | null;
  const parsed = uploadSchema.safeParse({
    retentionMode: rawRetentionMode ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isValidFileType(file.name, file.type)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Only .docx and text-based PDF files are accepted.",
      },
      { status: 400 }
    );
  }

  if (!isValidFileSize(file.size)) {
    return NextResponse.json(
      { error: "File size exceeds 50MB limit" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const documentHash = computeFileHash(buffer);
  const storageKey = await saveFile(buffer, file.name, file.type);

  const document = await prisma.document.create({
    data: {
      orgId,
      createdBy: userId,
      filename: file.name,
      contentType: file.type,
      fileSizeBytes: file.size,
      documentHash,
      storageKey,
      retentionMode: parsed.data.retentionMode,
    },
  });

  await logAuditEvent({
    orgId,
    eventType: "document.uploaded",
    actorId: userId,
    subjectType: "document",
    subjectId: document.id,
    detail: { filename: file.name, fileSizeBytes: file.size, documentHash },
  });

  return NextResponse.json(document, { status: 201 });
}
