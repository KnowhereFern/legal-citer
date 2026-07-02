import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClerkAppShell } from "@/components/clerk-app-shell";
import { isE2EAuthBypassEnabled } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: BRAND.company,
  description: BRAND.subheadline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = isE2EAuthBypassEnabled() ? (
    children
  ) : (
    <ClerkAppShell>{children}</ClerkAppShell>
  );

  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TooltipProvider delay={200}>{content}</TooltipProvider>
      </body>
    </html>
  );
}
