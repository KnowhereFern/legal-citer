"use client";

import { useState } from "react";
import { Check, Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export function VerificationShareButton({
  verificationId,
}: {
  verificationId: string;
}) {
  const [copied, setCopied] = useState(false);
  // showManual: clipboard write failed (e.g. insecure context / HTTP). We
  // never swallow the only interaction silently — surface the URL in a
  // selectable field with a plain-English "copy manually" hint.
  const [showManual, setShowManual] = useState(false);
  const url = `${BRAND.baseUrl}/v/${verificationId}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setShowManual(false);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // clipboard unavailable (insecure context, permissions, etc.) —
            // reveal a selectable copy of the link instead of no-op'ing.
            setShowManual(true);
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

      {showManual && (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-warning">
            <AlertCircle className="size-3.5" />
            Couldn&apos;t copy automatically — select the link and copy manually.
          </p>
          {/* readOnly input: focusable, selectable, copyable via Cmd/Ctrl+C.
              autoComplete/spellCheck off so browser chrome doesn't intrude. */}
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Verification link"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
