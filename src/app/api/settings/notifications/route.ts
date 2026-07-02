import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { resolveWorkspace } from "@/lib/workspace";
import { notificationSettingsSchema } from "@/lib/constants";

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

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { notifyReportReady, notifyAttachPdf, notifyShareLink } = parsed.data;

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { notifyReportReady, notifyAttachPdf, notifyShareLink },
  });

  await logAuditEvent({
    orgId,
    eventType: "settings.notifications_updated",
    actorId: userId,
    subjectType: "organization",
    subjectId: orgId,
    detail: { notifyReportReady, notifyAttachPdf, notifyShareLink },
  });

  return NextResponse.json({ success: true, organization: updated });
}
