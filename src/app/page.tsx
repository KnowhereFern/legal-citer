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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
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
            Get Started Free
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/sign-in" />}>
            Sign In
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <FileSearch className="size-5 text-primary" />
              <CardTitle className="mt-2">Citation Extraction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Automatically find every citation in your document.
              </p>
            </CardContent>
          </Card>

          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle className="mt-2">Source Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Cross-check against CourtListener, CAP, and GovInfo.
              </p>
            </CardContent>
          </Card>

          <Card className="text-left transition-colors hover:border-primary/30">
            <CardHeader>
              <Zap className="size-5 text-primary" />
              <CardTitle className="mt-2">Court-Ready Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Verification record with evidence, ready to attach.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-6 text-center lg:px-12">
        <p className="text-xs text-muted-foreground">
          {BRAND.domain} — {BRAND.tagline}
        </p>
      </footer>
    </div>
  );
}
