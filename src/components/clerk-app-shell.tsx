"use client";

import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";

export function ClerkAppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <header className="flex items-center justify-end gap-4 p-4">
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      {children}
    </ClerkProvider>
  );
}
