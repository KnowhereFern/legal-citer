"use client";

import { useEffect } from "react";

export function RefreshButton({ status }: { status: string }) {
  useEffect(() => {
    if (status !== "running" && status !== "queued") return;

    const interval = setInterval(() => {
      window.location.reload();
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

  if (status !== "running" && status !== "queued") return null;

  return (
    <span className="text-xs text-muted-foreground animate-pulse">
      Auto-refreshing...
    </span>
  );
}
