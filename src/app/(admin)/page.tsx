import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Minimal admin index. The (admin) route group ships the teal theme override
 * (globals.css `.admin`) but no admin UI has been built yet. Previously `/admin`
 * silently fell through to the branded 404, which read as a broken link rather
 * than an intentional "not yet." This page makes the state explicit and keeps
 * the route reachable for when admin tooling lands here.
 *
 * Not protected by an auth gate here — if admin becomes real, add the same
 * Clerk org/role check the dashboard uses (see (dashboard)/layout.tsx).
 */
export default function AdminIndexPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Administrative tooling lives here when available. There is nothing
        configured for this workspace yet.
      </p>
      <Button variant="outline" render={<Link href="/upload" />}>
        Back to the app
      </Button>
    </div>
  );
}
