import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LEGAL, LEGAL_LAST_UPDATED } from "@/lib/legal";

/**
 * Brand-matched shell for long-form legal/policy pages.
 *
 * Renders on the same dark canvas as the landing page (no dashboard chrome),
 * keeps a centered prose column, and exposes small semantic helpers
 * (LegalSection, LegalList, LegalP, etc.) so page files read like the source
 * markdown without pulling in a markdown runtime.
 */

export function LegalPage({
  title,
  subtitle,
  intro,
  effective,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional intro paragraph rendered after the H1. */
  intro?: ReactNode;
  /** Optional "effective as of" line; defaults to LEGAL_LAST_UPDATED. */
  effective?: string;
  children: ReactNode;
}) {
  const lastUpdated = effective ?? LEGAL_LAST_UPDATED;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient brand glow, same language as the landing page */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.10),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#ff69b4]/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {BRAND.company}
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </header>

      <main className="relative z-10 flex-1 px-6 pb-20 pt-8 lg:px-12">
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
            <div className="mt-6 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">
              {intro}
            </div>
          ) : null}

          <div className="mt-10 space-y-8">{children}</div>

          <LegalContact />
        </article>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-6 text-center lg:px-12">
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
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-0.5 min-w-5 shrink-0 font-mono text-xs text-primary/80">
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
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
      <p className="text-xs leading-relaxed text-warning-foreground/90 [&_strong]:text-warning">
        {children}
      </p>
    </div>
  );
}

export function LegalContact() {
  return (
    <section className="mt-12 rounded-lg border border-border bg-card/50 p-5">
      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {LEGAL.entityName}
        {"\n"}
        {LEGAL.mailingAddress}
        {"\n\n"}
        Support: <a className="text-primary hover:underline" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        {"\n"}
        Privacy: <a className="text-primary hover:underline" href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
      </div>
    </section>
  );
}
