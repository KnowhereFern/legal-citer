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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { FILING_TYPES } from "@/lib/constants";
import type { SettingsData } from "../settings-tabs";
import type { ClerkOrgMember } from "@/lib/clerk-backend";
import { CheckCircle2, ExternalLink } from "lucide-react";

type OrgData = SettingsData["org"];

export function WorkspaceSection({
  org,
  members,
}: {
  org: OrgData;
  members: ClerkOrgMember[];
}) {
  const [name, setName] = useState(org.name);
  const [jurisdiction, setJurisdiction] = useState(org.defaultJurisdiction ?? "");
  const [filingType, setFilingType] = useState(org.defaultFilingType ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== org.name ||
    jurisdiction !== (org.defaultJurisdiction ?? "") ||
    filingType !== (org.defaultFilingType ?? "");

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultJurisdiction: jurisdiction || null,
          defaultFilingType: filingType || null,
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            These defaults are applied to every new upload in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Default jurisdiction</Label>
              <Select
                value={jurisdiction}
                onValueChange={(v: string | null) =>
                  setJurisdiction(v ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select court" />
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

            <div className="flex flex-col gap-2">
              <Label>Default filing type</Label>
              <Select
                value={filingType}
                onValueChange={(v: string | null) =>
                  setFilingType(v ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FILING_TYPES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!dirty || saving}>
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
                "Save changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            {org.isPersonal
              ? "Personal workspaces don't have a team. Create an organization to invite members."
              : "Members are managed in Clerk. Invite or remove people from your Clerk dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {org.isPersonal ? null : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members found.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {[m.firstName, m.lastName].filter(Boolean).join(" ") ||
                        "Unknown"}
                    </span>
                    {m.email && (
                      <span className="text-xs text-muted-foreground">
                        {m.email}
                      </span>
                    )}
                  </div>
                  <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {!org.isPersonal && (
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Manage in Clerk <ExternalLink className="size-3.5" />
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
