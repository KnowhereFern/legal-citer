"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { getJurisdiction } from "@/lib/jurisdictions";

export function ReportControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const jurisdiction = searchParams.get("jurisdiction") ?? "florida_rule_2515";
  const view = searchParams.get("view") ?? "public";
  const aiTools = searchParams.get("aiTools") ?? "";
  const docTitle = searchParams.get("docTitle") ?? "";

  const config = getJurisdiction(jurisdiction);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Jurisdiction
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => updateParam("jurisdiction", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {JURISDICTIONS.map((j) => (
              <option key={j.key} value={j.key}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        {config.requiresToolDisclosure && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              AI Tool(s) Used
            </label>
            <input
              type="text"
              defaultValue={aiTools}
              placeholder="e.g., ChatGPT-4, Claude 3"
              onBlur={(e) => updateParam("aiTools", e.target.value)}
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Document Title (optional)
          </label>
          <input
            type="text"
            defaultValue={docTitle}
            placeholder="e.g., Defendant's Motion to Dismiss"
            onBlur={(e) => updateParam("docTitle", e.target.value)}
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => updateParam("view", "public")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "public"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Use &amp; Verification Summary
        </button>
        <button
          onClick={() => updateParam("view", "full")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "full"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Full Report
        </button>
      </div>
    </div>
  );
}
