import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * Shared shell for the Clerk-hosted auth routes (/sign-in, /sign-up).
 *
 * Owns the brand chrome these pages share: the neon background glows, the logo
 * link back to the landing page, the centered content slot, and the tagline
 * footer. The Clerk component itself (and per-page copy) is rendered via
 * {children}, so each page stays focused on what's unique to it.
 *
 * Accessibility notes (PRODUCT.md target: WCAG 2.1 AA, phone-first pro se
 * filers):
 *  - The logo <Link> keeps its visible logo mark at size-9 but grows the
 *    *tappable* hit area to 44px (min-h-11 + horizontal padding) so the link
 *    clears the mobile tap-target floor without making the brand mark itself
 *    oversized.
 *  - The link carries the global `.focus-ring` utility (DESIGN.md §Focus) so
 *    keyboard users get the brand pink ring.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary/5 blur-3xl" />

      <Link
        href="/"
        aria-label={`${BRAND.company} home`}
        className="focus-ring relative z-content mb-8 inline-flex min-h-11 items-center gap-2.5 rounded-lg px-1"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-content w-full max-w-sm">{children}</div>

      <p className="relative z-content mt-8 text-center text-sm text-muted-foreground">
        {BRAND.tagline}
      </p>
    </div>
  );
}
