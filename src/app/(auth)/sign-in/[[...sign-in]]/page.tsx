import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const darkAppearance = {
  variables: {
    colorBackground: "#111111",
    colorInputBackground: "#000000",
    colorInputText: "#ffffff",
    colorPrimary: "#ff69b4",
    colorPrimaryForeground: "#000000",
    colorText: "#ffffff",
    colorTextSecondary: "#888888",
    colorNeutral: "#222222",
    colorDanger: "#ff4466",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans), sans-serif",
  },
  elements: {
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary-hover font-semibold",
    card: "bg-card border border-border shadow-xl",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border bg-background text-foreground hover:bg-accent",
    socialButtonsBlockButtonText: "text-foreground",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldLabel: "text-muted-foreground",
    formFieldInput:
      "bg-background border border-input text-foreground focus:border-ring",
    footerActionLink: "text-primary hover:text-primary-hover",
  },
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#ff69b4]/5 blur-3xl" />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2.5"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        <SignIn appearance={darkAppearance} />
      </div>

      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        {BRAND.tagline}
      </p>
    </div>
  );
}
