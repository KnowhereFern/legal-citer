import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";
import { retentionSettingsSchema } from "@/lib/constants";

export async function POST(request: Request) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgId, userId } = workspace;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = retentionSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { rawFileHours, extractedTextHours, reportHours, publicVerificationEnabled } =
    parsed.data;

  // Upsert the org's default retention policy (there should be exactly one
  // with isDefault=true). Fall back to the first policy if none is flagged.
  let policy = await prisma.retentionPolicy.findFirst({
    where: { orgId, isDefault: true },
  });
  if (!policy) {
    policy = await prisma.retentionPolicy.findFirst({ where: { orgId } });
  }
  if (!policy) {
    policy = await prisma.retentionPolicy.create({
      data: { orgId, name: "Default", isDefault: true, rawFileHours, extractedTextHours, reportHours },
    });
  }

  await prisma.$transaction([
    prisma.retentionPolicy.update({
      where: { id: policy.id },
      data: { rawFileHours, extractedTextHours, reportHours },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { publicVerificationEnabled },
    }),
    prisma.auditEvent.create({
      data: {
        orgId,
        eventType: "settings.retention_updated",
        actorId: userId,
        subjectType: "retention_policy",
        subjectId: policy.id,
        detail: {
          rawFileHours,
          extractedTextHours,
          reportHours: reportHours ?? null,
          publicVerificationEnabled,
        },
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
