import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { DashboardSidebar } from "./dashboard-sidebar";

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
      <DashboardSidebar orgActive={!!orgId} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
