import { isE2EAuthBypassEnabled } from "@/lib/auth-context";

/**
 * Lazy Clerk Backend API client. Used for reads that aren't covered by the
 * signed-in user's token (e.g. listing org members or sessions for the
 * settings page). Returns null under the E2E auth bypass so the UI degrades
 * to empty states instead of calling Clerk.
 */
export async function getClerkBackend() {
  if (isE2EAuthBypassEnabled()) return null;

  const { createClerkClient } = await import("@clerk/backend");
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}

export type ClerkOrgMember = {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type ClerkUserSession = {
  id: string;
  lastActiveAt: number | null;
  device: string | null;
};

export type ClerkUserSummary = {
  twoFactorEnabled: boolean;
  lastSignInAt: number | null;
  createdAt: number | null;
};

/**
 * List members of a Clerk organization. Returns [] under bypass / personal
 * workspace (no Clerk org id).
 */
export async function listOrgMembers(
  clerkOrgId: string | null
): Promise<ClerkOrgMember[]> {
  if (!clerkOrgId) return [];
  const client = await getClerkBackend();
  if (!client) return [];

  try {
    const res = await client.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
      limit: 50,
    });
    return res.data.map((m) => ({
      id: m.id,
      role: m.role,
      firstName: m.publicUserData?.firstName ?? null,
      lastName: m.publicUserData?.lastName ?? null,
      email: m.publicUserData?.identifier ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Current user security summary (2FA, last sign-in).
 */
export async function getUserSummary(
  userId: string
): Promise<ClerkUserSummary> {
  const client = await getClerkBackend();
  if (!client) {
    return { twoFactorEnabled: false, lastSignInAt: null, createdAt: null };
  }
  try {
    const u = await client.users.getUser(userId);
    return {
      twoFactorEnabled: Boolean(u.twoFactorEnabled),
      lastSignInAt: u.lastSignInAt ?? null,
      createdAt: u.createdAt ?? null,
    };
  } catch {
    return { twoFactorEnabled: false, lastSignInAt: null, createdAt: null };
  }
}

/**
 * Primary email address for a user. Used by the notification sender to know
 * where to deliver run-completion emails. Returns null when Clerk isn't
 * available (E2E bypass) or the user has no email on file.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const client = await getClerkBackend();
  if (!client) return null;
  try {
    const u = await client.users.getUser(userId);
    return u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

/**
 * Current user active sessions.
 */
export async function listUserSessions(
  userId: string
): Promise<ClerkUserSession[]> {
  const client = await getClerkBackend();
  if (!client) return [];
  try {
    const res = await client.sessions.getSessionList({ userId, limit: 20 });
    return res.data.map((s) => ({
      id: s.id,
      lastActiveAt: s.lastActiveAt ?? null,
      device: s.status ?? null,
    }));
  } catch {
    return [];
  }
}
