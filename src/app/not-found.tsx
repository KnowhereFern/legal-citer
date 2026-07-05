import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

/**
 * Branded 404. Previously any invalid route — including public verification
 * links (/v/{expired-id}) — fell through to Next.js's default off-brand 404.
 * For a public surface that may be the ONLY BaddieLegal page a non-user ever
 * sees, the framework default was a trust failure. This page gives every dead
 * link a plain-English recovery path.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,_var(--primary)_8%,_transparent),_transparent_60%)]"
      />
      <div className="relative">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          This page isn&apos;t here.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-pretty text-sm text-muted-foreground">
          The link may be broken, mistyped, or no longer valid. If a verification
          link brought you here, it may have expired.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/" />}>
            Back to {BRAND.company}
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/sign-in" />}>
            Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
