import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function resolveWorkspace(): Promise<{
  orgId: string;
  userId: string;
  isPersonal: boolean;
} | null> {
  const { userId, orgId: clerkOrgId } = await getAuthContext();
  if (!userId) return null;

  if (clerkOrgId) {
    // Auto-provision so a logged-in org member is never bounced to /sign-in
    // (e.g. if the `organization.created` webhook was missed or delayed).
    const org = await prisma.organization.upsert({
      where: { clerkOrgId },
      create: { clerkOrgId, name: "Clerk organization" },
      update: {},
    });
    return { orgId: org.id, userId, isPersonal: false };
  }

  const personalKey = `personal:${userId}`;
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: personalKey },
    create: { clerkOrgId: personalKey, name: "Personal workspace" },
    update: {},
  });

  return { orgId: org.id, userId, isPersonal: true };
}
