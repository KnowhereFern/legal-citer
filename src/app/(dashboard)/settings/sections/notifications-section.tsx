"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2 } from "lucide-react";
import type { SettingsData } from "../settings-tabs";

type OrgData = SettingsData["org"];

export function NotificationsSection({ org }: { org: OrgData }) {
  const [reportReady, setReportReady] = useState(org.notifyReportReady);
  const [attachPdf, setAttachPdf] = useState(org.notifyAttachPdf);
  const [shareLink, setShareLink] = useState(org.notifyShareLink);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    reportReady !== org.notifyReportReady ||
    attachPdf !== org.notifyAttachPdf ||
    shareLink !== org.notifyShareLink;

  const save = async (
    next: { reportReady: boolean; attachPdf: boolean; shareLink: boolean }
  ) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyReportReady: next.reportReady,
          notifyAttachPdf: next.attachPdf,
          notifyShareLink: next.shareLink,
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

  // Persist on change for a toggle-style UX.
  const handleToggle =
    (field: "reportReady" | "attachPdf" | "shareLink") =>
    (checked: boolean) => {
      const next = { reportReady, attachPdf, shareLink, [field]: checked };
      if (field === "reportReady") setReportReady(checked);
      if (field === "attachPdf") setAttachPdf(checked);
      if (field === "shareLink") setShareLink(checked);
      void save(next);
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose which emails this workspace receives. Preferences are saved
          instantly; email delivery is enabled on paid plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ToggleRow
          title="Report ready emails"
          description="Send an email when a verification report finishes generating."
          checked={reportReady}
          onCheckedChange={handleToggle("reportReady")}
          disabled={saving}
        />
        <ToggleRow
          title="Attach PDF to email"
          description="Include the generated report PDF as an attachment."
          checked={attachPdf}
          onCheckedChange={handleToggle("attachPdf")}
          disabled={saving}
        />
        <ToggleRow
          title="Share-link emails"
          description="Email a link when a report is shared with a colleague."
          checked={shareLink}
          onCheckedChange={handleToggle("shareLink")}
          disabled={saving}
        />

        <div className="mt-4 flex items-center gap-3">
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Spinner data-icon="inline-start" />
              Saving...
            </span>
          )}
          {saved && !dirty && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" />
              Saved
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
