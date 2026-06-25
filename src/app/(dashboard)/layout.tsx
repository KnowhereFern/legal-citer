import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth-context";

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
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-sidebar-background p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Legal Citer
          </h2>
          {orgId && (
            <p className="text-xs text-muted-foreground mt-1">
              Organization active
            </p>
          )}
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/upload"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Upload & Verify
          </Link>
          <Link
            href="/runs"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Verification Runs
          </Link>
          <Link
            href="/reports"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Reports
          </Link>
          <Link
            href="/settings"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
