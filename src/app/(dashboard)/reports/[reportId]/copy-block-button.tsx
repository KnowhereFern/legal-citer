"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyBlockButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <>
          <Check data-icon="inline-start" className="text-success" />
          Copied
        </>
      ) : (
        <>
          <Copy data-icon="inline-start" />
          Copy Filing Block
        </>
      )}
    </Button>
  );
}
