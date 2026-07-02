import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Zap, FileSearch, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await getAuthContext();
  if (userId) {
    redirect("/upload");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.12),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#ff69b4]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 translate-x-1/4 rounded-full bg-[#00ffff]/5 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {BRAND.company}
          </span>
        </Link>
        <Button variant="ghost" size="lg" render={<Link href="/sign-in" />}>
          Sign In
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 pb-20 text-center">
        <div className="flex w-full max-w-5xl flex-col items-center pt-16 lg:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary-light backdrop-blur-sm">
            <Receipt className="size-3.5" />
            {BRAND.tagline}
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {BRAND.headline.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="bg-gradient-to-r from-[#ff69b4] to-[#00ffff] bg-clip-text text-transparent">
              {BRAND.headline.split(" ").slice(-1)}.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            {BRAND.subheadline}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Check a document
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/sample" />}>
              View sample report
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Not a law firm. Not legal advice. You stay responsible for the filing.
          </p>
        </div>

        <div className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <FileSearch className="size-5 text-primary" />
              <CardTitle className="mt-2">Find every cite</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                We scan your filing for cases, statutes, rules, and record citations.
              </p>
            </CardContent>
          </Card>

          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle className="mt-2">Check sources and quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                We flag fake citations, mismatched details, and quotes that do not line up.
              </p>
            </CardContent>
          </Card>

          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <Zap className="size-5 text-primary" />
              <CardTitle className="mt-2">Create a verification record</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Download a clean summary for your file, client, or court attachment.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="mt-24 w-full max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload your filing",
                body: "DOCX or PDF. We create a document hash for the reviewed version.",
              },
              {
                step: "2",
                title: "Review the flags",
                body: "See missing citations, quote issues, metadata problems, and unresolved checks.",
              },
              {
                step: "3",
                title: "Download your record",
                body: "Save a private exception report or generate a short verification summary.",
              },
            ].map((s) => (
              <div key={s.step} className="text-left">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                  {s.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="text-left">
            <CardHeader>
              <CardTitle>For self-represented filers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Check whether the cases and quotes in your filing appear to be real before you submit.
              </p>
            </CardContent>
          </Card>
          <Card className="text-left">
            <CardHeader>
              <CardTitle>For attorneys and legal teams</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a verification trail for AI-assisted work, citation checks, and pre-filing review.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-6 text-center lg:px-12">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {BRAND.domain} — {BRAND.tagline}
          </p>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <span className="text-border">·</span>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
