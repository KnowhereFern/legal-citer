import { SignIn } from "@clerk/nextjs";
import { darkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="sr-only">Sign in to BaddieLegal</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Back to checking your cites.
      </p>
      <SignIn path="/sign-in" appearance={darkAppearance} />
    </div>
  );
}
