"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "running" && status !== "queued") return;

    // router.refresh() re-fetches server component data without a full page
    // reload, so scroll position and focus are preserved (PRODUCT.md #3:
    // speed is trust; a reload that snaps the user to the top feels broken).
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, router]);

  if (status !== "running" && status !== "queued") return null;

  return (
    <span className="text-xs text-muted-foreground animate-pulse">
      Auto-refreshing…
    </span>
  );
}
