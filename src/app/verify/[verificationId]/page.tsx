import { permanentRedirect } from "next/navigation";
import { relativeVerificationPath } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * Legacy `/verify/{id}` → canonical `/v/{id}` redirect.
 *
 * This route exists only for tolerance of stale `/verify/...` links (early
 * share links, old PDFs). It has no content of its own. We emit a **308
 * permanent redirect** rather than a 307 so crawlers and link-preview bots
 * repoint to the canonical URL over time and stop hitting the extra hop.
 *
 * Not deleted because legacy links may persist indefinitely in filed PDFs,
 * emailed threads, and saved bookmarks.
 */
export default async function VerifyRedirect({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;
  permanentRedirect(relativeVerificationPath(verificationId));
}
