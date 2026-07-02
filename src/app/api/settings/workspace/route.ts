import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { resolveWorkspace } from "@/lib/workspace";
import { workspaceSettingsSchema } from "@/lib/constants";
import { getClerkBackend } from "@/lib/clerk-backend";
import { getAuthContext } from "@/lib/auth-context";

export async function POST(request: Request) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgId, userId, isPersonal } = workspace;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = workspaceSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, defaultJurisdiction, defaultFilingType } = parsed.data;

  // Keep Clerk's org name in sync (the webhook mirrors Clerk -> DB; pushing
  // from here avoids our update being clobbered on the next org.updated event).
  if (!isPersonal) {
    const { orgId: clerkOrgId } = await getAuthContext();
    if (clerkOrgId) {
      const client = await getClerkBackend();
      try {
        await client?.organizations.updateOrganization(clerkOrgId, { name });
      } catch {
        // Non-fatal: persist locally regardless.
      }
    }
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name,
      defaultJurisdiction: defaultJurisdiction ?? null,
      defaultFilingType: defaultFilingType ?? null,
    },
  });

  await logAuditEvent({
    orgId,
    eventType: "settings.workspace_updated",
    actorId: userId,
    subjectType: "organization",
    subjectId: orgId,
    detail: {
      name,
      defaultJurisdiction: defaultJurisdiction ?? null,
      defaultFilingType: defaultFilingType ?? null,
    },
  });

  return NextResponse.json({ success: true, organization: updated });
}
