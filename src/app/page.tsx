import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { Scale, ShieldCheck, Zap, FileSearch } from "lucide-react";

export default async function HomePage() {
  const { userId } = await getAuthContext();
  if (userId) {
    redirect("/upload");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 translate-x-1/4 rounded-full bg-indigo-300/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Scale className="size-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Legal Citer</span>
        </div>
        <Link
          href="/sign-in"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          Sign In
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
          <ShieldCheck className="size-3.5" />
          Pre-filing citation verification
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Verify every citation.
          <br />
          <span className="bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent">
            File with confidence.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
          Upload your brief and get an instant report on every citation —
          existence, quote accuracy, and proposition support, backed by
          CourtListener, PACER, and CAP.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/25 transition-all hover:bg-indigo-50 hover:shadow-xl"
          >
            Get Started Free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-xl border border-white/25 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={FileSearch}
            title="Citation Extraction"
            desc="Automatically find every citation in your document."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Source Verification"
            desc="Cross-check against CourtListener, CAP, and GovInfo."
          />
          <FeatureCard
            icon={Zap}
            title="Instant Reports"
            desc="Risk-scored findings with evidence, ready to review."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 text-left backdrop-blur-sm">
      <Icon className="mb-3 size-5 text-indigo-200" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-white/60">{desc}</p>
    </div>
  );
}
