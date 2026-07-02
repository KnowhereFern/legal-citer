"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { getJurisdiction } from "@/lib/jurisdictions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReportControls({
  defaultJurisdiction,
}: {
  /** Jurisdiction captured at upload time; used unless overridden via the URL. */
  defaultJurisdiction?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const jurisdiction =
    searchParams.get("jurisdiction") ?? defaultJurisdiction ?? "florida_rule_2515";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Jurisdiction</Label>
          <Select
            value={jurisdiction}
            onValueChange={(v) => { if (v) updateParam("jurisdiction", v); }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j.key} value={j.key}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.requiresToolDisclosure && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">AI Tool(s) Used</Label>
            <Input
              type="text"
              defaultValue={aiTools}
              placeholder="e.g., ChatGPT-4, Claude 3"
              onBlur={(e) => updateParam("aiTools", e.target.value)}
              className="w-64"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Document Title (optional)</Label>
          <Input
            type="text"
            defaultValue={docTitle}
            placeholder="e.g., Defendant's Motion to Dismiss"
            onBlur={(e) => updateParam("docTitle", e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <Tabs
        value={view}
        onValueChange={(v) => { if (v) updateParam("view", v); }}
      >
        <TabsList>
          <TabsTrigger value="public">
            AI Use &amp; Verification Summary
          </TabsTrigger>
          <TabsTrigger value="full">
            Full Report
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
