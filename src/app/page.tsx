import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";

export default async function HomePage() {
  const { userId } = await getAuthContext();
  if (userId) {
    redirect("/upload");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Legal Citer
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Pre-filing document verification for legal citations
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
