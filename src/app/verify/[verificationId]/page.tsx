import { redirect } from "next/navigation";
import { relativeVerificationPath } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function VerifyRedirect({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;
  redirect(relativeVerificationPath(verificationId));
}
