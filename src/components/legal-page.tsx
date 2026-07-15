import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LEGAL, LEGAL_LAST_UPDATED } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Brand-matched shell for long-form legal/policy pages.
 *
 * Renders on the same dark canvas as the landing page (no dashboard chrome),
 * keeps a centered prose column, and exposes small semantic helpers
 * (LegalSection, LegalList, LegalP, etc.) so page files read like the source
 * markdown without pulling in a markdown runtime.
 */

/** Slugify a section title into a stable, URL-safe anchor id. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Derive a stable React key from arbitrary content. Falls back to an index only when empty. */
function stableKey(content: ReactNode, fallback: number): string {
  if (typeof content === "string" && content.trim().length > 0) {
      return content.slice(0, 60);
  }
  return String(fallback);
}

/**
 * Inline link for long-form legal prose. Gets the brand focus ring + a small
 * rounded corner so keyboard / touch users get a real target.
 */
export function LegalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-primary underline decoration-primary/60 underline-offset-2 transition-colors hover:text-primary-light hover:decoration-primary focus-ring rounded-sm",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function LegalPage({
  title,
  subtitle,
  intro,
  effective,
  /** Used to omit / mark active the "See also" cross-link. */
  currentPath,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional intro paragraph rendered after the H1. */
  intro?: ReactNode;
  /** Optional "effective as of" line; defaults to LEGAL_LAST_UPDATED. */
  effective?: string;
  /** Route path of the current page, e.g. "/privacy" — controls the See-also row. */
  currentPath?: "/privacy" | "/terms";
  children: ReactNode;
}) {
  const lastUpdated = effective ?? LEGAL_LAST_UPDATED;
  const seeAlso: Array<{ href: string; label: string }> = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient brand glow, same language as the landing page */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.10),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-content flex items-center justify-between px-6 py-5 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {BRAND.company}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}
        >
          ← Back to home
        </Button>
      </header>

      <main className="relative z-content flex-1 px-6 pb-20 pt-8 lg:px-12">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
          ) : null}

          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            Last updated: {lastUpdated}
          </p>

          {intro ? (
            <div className="mt-6 border-l-2 border-primary/40 pl-4 text-base leading-7 text-foreground">
              {intro}
            </div>
          ) : null}

          <div className="mt-10 space-y-8">{children}</div>

          <LegalContact />

          {/* "See also" cross-link row — helps users hop between Privacy ↔ Terms. */}
          <nav
            aria-label="Related legal documents"
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
          >
            <span>See also:</span>
            {seeAlso.map((link) => {
              const isActive = link.href === currentPath;
              return (
                <span key={link.href} className="flex items-center gap-x-3">
                  {isActive ? (
                    <span aria-current="page" className="font-medium text-foreground">
                      {link.label}
                    </span>
                  ) : (
                    <LegalLink href={link.href}>{link.label}</LegalLink>
                  )}
                </span>
              );
            })}
          </nav>
        </article>
      </main>

      <footer className="relative z-content border-t border-border px-6 py-6 text-center lg:px-12">
        <p className="text-xs text-muted-foreground">
          {BRAND.domain} — {BRAND.tagline}
        </p>
      </footer>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-2 text-base font-semibold text-foreground">{children}</h3>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return (
    <p className="text-base leading-7 text-foreground">{children}</p>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li
          key={stableKey(item, i)}
          className="flex gap-3 text-base leading-7 text-foreground"
        >
          <span className="mt-0.5 min-w-5 shrink-0 font-mono text-sm text-primary">
            {i + 1}.
          </span>
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function LegalBulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={stableKey(item, i)}
          className="flex gap-3 text-base leading-7 text-foreground"
        >
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Legally loudest paragraph — disclaimers, liability caps, arbitration warnings.
 *
 * DESIGN.md status pairing: the warning amber is reserved for the leading icon + "Important"
 * label; the body text stays high-contrast white on the dark canvas so the
 * ALL-CAPS language actually reads.
 */
export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-warning" />
        <span className="text-sm font-semibold text-warning">Important</span>
      </div>
      <div className="mt-2 text-base leading-7 text-foreground [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/60 [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}

export function LegalContact() {
  return (
    <section className="mt-12 rounded-lg border border-border bg-card/50 p-5">
      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <div className="mt-3 whitespace-pre-line text-base leading-7 text-foreground">
        {LEGAL.entityName}
        {"\n"}
        {LEGAL.mailingAddress}
        {"\n\n"}
        Support:{" "}
        <LegalLink href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</LegalLink>
        {"\n"}
        Privacy:{" "}
        <LegalLink href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</LegalLink>
      </div>
    </section>
  );
}
