"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, CheckCircle2 } from "lucide-react";

export interface FilingDetails {
  caseNumber: string;
  filingTitle: string;
  aiToolsDisclosed: string;
  attorneyName: string;
  barNumber: string;
  lawFirm: string;
  party: string;
  verificationVendor: string;
}

export function FilingDetailsForm({
  reportId,
  initial,
}: {
  reportId: string;
  initial: FilingDetails;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<FilingDetails>(initial);

  const update = (key: keyof FilingDetails, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to save filing details");
        }
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filing Identification</CardTitle>
        <CardDescription>
          Identifies this exhibit. Saved to the report and pre-filled on return.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Case No." value={values.caseNumber} onChange={(v) => update("caseNumber", v)} placeholder="e.g., 24-12345-CV" />
          <Field label="Filing Title" value={values.filingTitle} onChange={(v) => update("filingTitle", v)} placeholder="e.g., Defendant's Motion to Dismiss" />
          <Field label="AI Tool(s) Disclosed" value={values.aiToolsDisclosed} onChange={(v) => update("aiToolsDisclosed", v)} placeholder="e.g., ChatGPT-4, Claude 3" />
          <Field label="Verification Vendor / System" value={values.verificationVendor} onChange={(v) => update("verificationVendor", v)} placeholder="BaddieLegal Verify v1" />
          <Field label="Attorney Name" value={values.attorneyName} onChange={(v) => update("attorneyName", v)} placeholder="Attorney name" />
          <Field label="Bar Number" value={values.barNumber} onChange={(v) => update("barNumber", v)} placeholder="e.g., Florida Bar No." />
          <Field label="Law Firm" value={values.lawFirm} onChange={(v) => update("lawFirm", v)} placeholder="Law firm" />
          <Field label="Party" value={values.party} onChange={(v) => update("party", v)} placeholder="e.g., Defendant" />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              "Saving..."
            ) : saved ? (
              <>
                <CheckCircle2 data-icon="inline-start" />
                Saved
              </>
            ) : (
              <>
                <Save data-icon="inline-start" />
                Save Filing Details
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
