import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClerkAppShell } from "@/components/clerk-app-shell";
import { isE2EAuthBypassEnabled } from "@/lib/auth-context";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Legal Citer",
  description: "Pre-filing document verification for legal citations",
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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {content}
      </body>
    </html>
  );
}
