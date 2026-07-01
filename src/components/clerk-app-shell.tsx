"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function ClerkAppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>{children}</ClerkProvider>
  );
}
