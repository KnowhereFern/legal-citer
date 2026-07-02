"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export function VerificationShareButton({
  verificationId,
}: {
  verificationId: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${BRAND.baseUrl}/v/${verificationId}`;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard unavailable (e.g. insecure context) — no-op
        }
      }}
    >
      {copied ? (
        <>
          <Check data-icon="inline-start" className="text-success" />
          Copied
        </>
      ) : (
        <>
          <Link2 data-icon="inline-start" />
          Copy verification link
        </>
      )}
    </Button>
  );
}
