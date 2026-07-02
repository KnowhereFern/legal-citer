import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { resolveWorkspace } from "@/lib/workspace";
import {
  listOrgMembers,
  getUserSummary,
  listUserSessions,
} from "@/lib/clerk-backend";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "./settings-tabs";
import type { SettingsData } from "./settings-tabs";

export const dynamic = "force-dynamic";

async function getRetentionPolicy(orgId: string) {
  const defaultPolicy = await prisma.retentionPolicy.findFirst({
    where: { orgId, isDefault: true },
  });
  if (defaultPolicy) return defaultPolicy;
  return prisma.retentionPolicy.findFirst({ where: { orgId } });
}

export default async function SettingsPage() {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const workspace = await resolveWorkspace();
  if (!workspace) redirect("/sign-in");
  const { orgId, isPersonal } = workspace;

  const { orgId: clerkOrgId } = await getAuthContext();

  const [org, retentionPolicy, members, userSummary, sessions, recentEvents, runCounts] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      getRetentionPolicy(orgId),
      listOrgMembers(isPersonal ? null : clerkOrgId),
      getUserSummary(userId),
      listUserSessions(userId),
      prisma.auditEvent.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      Promise.all([
        prisma.verificationRun.count({ where: { orgId } }),
        prisma.verificationRun.count({
          where: {
            orgId,
            createdAt: { gte: startOfMonth() },
          },
        }),
        prisma.report.count({ where: { run: { orgId } } }),
      ]),
    ]);

  if (!org) redirect("/sign-in");

  const [totalRuns, monthRuns, reportCount] = runCounts;

  const data: SettingsData = {
    org: {
      id: org.id,
      name: org.name,
      isPersonal,
      defaultJurisdiction: org.defaultJurisdiction,
      defaultFilingType: org.defaultFilingType,
      publicVerificationEnabled: org.publicVerificationEnabled,
      plan: org.plan,
      notifyReportReady: org.notifyReportReady,
      notifyAttachPdf: org.notifyAttachPdf,
      notifyShareLink: org.notifyShareLink,
    },
    retention: retentionPolicy
      ? {
          rawFileHours: retentionPolicy.rawFileHours,
          extractedTextHours: retentionPolicy.extractedTextHours,
          reportHours: retentionPolicy.reportHours,
        }
      : null,
    members,
    security: {
      twoFactorEnabled: userSummary.twoFactorEnabled,
      lastSignInAt: userSummary.lastSignInAt,
      sessions,
    },
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actorId: e.actorId,
      createdAt: e.createdAt.toISOString(),
    })),
    billing: {
      plan: org.plan,
      totalRuns,
      monthRuns,
      reportCount,
    },
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your workspace, retention, security, and data."
      />
      <SettingsTabs data={data} />
    </div>
  );
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
