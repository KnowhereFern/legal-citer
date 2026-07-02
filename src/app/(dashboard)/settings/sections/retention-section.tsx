"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { SettingsData } from "../settings-tabs";
import { CheckCircle2 } from "lucide-react";

type OrgData = SettingsData["org"];
type RetentionData = NonNullable<SettingsData["retention"]>;

const DEFAULTS: RetentionData = {
  rawFileHours: 24,
  extractedTextHours: 48,
  reportHours: null,
};

export function RetentionSection({
  org,
  retention,
}: {
  org: OrgData;
  retention: RetentionData | null;
}) {
  const base = retention ?? DEFAULTS;
  const [rawFileHours, setRawFileHours] = useState(String(base.rawFileHours));
  const [extractedTextHours, setExtractedTextHours] = useState(
    String(base.extractedTextHours)
  );
  const [keepReportsForever, setKeepReportsForever] = useState(
    base.reportHours === null
  );
  const [reportHours, setReportHours] = useState(
    base.reportHours === null ? "" : String(base.reportHours)
  );
  const [publicVerification, setPublicVerification] = useState(
    org.publicVerificationEnabled
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawFileHours: Number(rawFileHours),
          extractedTextHours: Number(extractedTextHours),
          reportHours:
            keepReportsForever || reportHours === ""
              ? null
              : Number(reportHours),
          publicVerificationEnabled: publicVerification,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention</CardTitle>
        <CardDescription>
          Control how long uploaded source files, extracted text, and reports
          are kept. These are the defaults for the workspace retention policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="raw-hours">Raw upload retention (hours)</Label>
            <Input
              id="raw-hours"
              type="number"
              min={1}
              value={rawFileHours}
              onChange={(e) => setRawFileHours(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Original uploaded files are purged after this many hours.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="text-hours">Extracted text retention (hours)</Label>
            <Input
              id="text-hours"
              type="number"
              min={1}
              value={extractedTextHours}
              onChange={(e) => setExtractedTextHours(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Text extracted from uploads is purged after this many hours.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="report-hours">Report retention (hours)</Label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                id="report-hours"
                type="number"
                min={1}
                value={reportHours}
                onChange={(e) => setReportHours(e.target.value)}
                disabled={saving || keepReportsForever}
                className="md:max-w-xs"
                placeholder="e.g. 2160 (90 days)"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={keepReportsForever}
                  onCheckedChange={setKeepReportsForever}
                  disabled={saving}
                />
                Keep reports indefinitely
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Public verification page</span>
            <span className="text-xs text-muted-foreground">
              Allow anyone with a verification link to view the public
              verification status page. Disable to make verification private.
            </span>
          </div>
          <Switch
            checked={publicVerification}
            onCheckedChange={setPublicVerification}
            disabled={saving}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner data-icon="inline-start" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 data-icon="inline-start" />
                Saved
              </>
            ) : (
              "Save retention settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
