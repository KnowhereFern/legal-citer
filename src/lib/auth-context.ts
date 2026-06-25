export const E2E_USER_ID = "user_e2e";
export const E2E_ORG_ID = "org_e2e";

export type AppAuthContext = {
  userId: string | null;
  orgId: string | null;
};

export type AppCurrentUser = {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

export function isE2EAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_AUTH_BYPASS === "1"
  );
}

export async function getAuthContext(): Promise<AppAuthContext> {
  if (isE2EAuthBypassEnabled()) {
    return { userId: E2E_USER_ID, orgId: E2E_ORG_ID };
  }

  const { auth } = await import("@clerk/nextjs/server");
  const { userId, orgId } = await auth();
  return { userId, orgId: orgId ?? null };
}

export async function getCurrentAppUser(): Promise<AppCurrentUser | null> {
  if (isE2EAuthBypassEnabled()) {
    return {
      firstName: "E2E",
      lastName: "Tester",
      emailAddresses: [{ emailAddress: "e2e@example.test" }],
    };
  }

  const { currentUser } = await import("@clerk/nextjs/server");
  return currentUser();
}
