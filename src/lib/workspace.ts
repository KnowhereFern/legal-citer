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
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (!org) return null;
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
