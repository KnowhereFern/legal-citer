import { redirect } from "next/navigation";
import { getAuthContext, isE2EAuthBypassEnabled } from "@/lib/auth-context";
import {
  DashboardSidebar,
  MobileSidebarTrigger,
} from "./dashboard-sidebar";

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

  const sidebarProps = {
    orgActive: !!orgId,
    showUserButton: !isE2EAuthBypassEnabled(),
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar {...sidebarProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — only visible below lg, where the desktop rail hides.
            PRODUCT.md: pro se filers are phone-first; previously the dashboard
            was unusable on a phone because the 256px rail was always visible. */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 lg:hidden">
          <MobileSidebarTrigger {...sidebarProps} />
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            BaddieLegal
          </span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
