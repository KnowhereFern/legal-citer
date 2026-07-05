import { SignUp } from "@clerk/nextjs";
import { darkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="sr-only">Create your BaddieLegal account</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Check your filing before you file.
      </p>
      <SignUp path="/sign-up" appearance={darkAppearance} />
    </div>
  );
}
