import { redirect } from "next/navigation";
import { getAuthContext, isE2EAuthBypassEnabled } from "@/lib/auth-context";
import { DashboardSidebar } from "./dashboard-sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await getAuthContext();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        orgActive={!!orgId}
        showUserButton={!isE2EAuthBypassEnabled()}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
