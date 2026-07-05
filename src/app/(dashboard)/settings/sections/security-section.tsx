"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { ClerkOrgMember } from "@/lib/clerk-backend";
import type { SettingsData } from "../settings-tabs";

type SecurityData = SettingsData["security"];

// Map raw audit eventType strings to plain-English labels so we never show
// "document.uploaded" or a Clerk UUID in the activity feed.
const EVENT_LABELS: Record<string, string> = {
  "document.uploaded": "Document uploaded",
  "settings.workspace_updated": "Workspace settings updated",
  "settings.retention_updated": "Retention settings updated",
  "settings.notifications_updated": "Notification settings updated",
  "settings.workspace_data_deleted": "Workspace data deleted",
  reviewer_acknowledgment: "Report acknowledged",
};

function labelForEvent(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

// Absolute timestamp (Intl.RelativeTimeFormat would be nicer but is a separate
// behavior change — rename keeps the contract honest rather than misnamed).
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

// Resolve a Clerk user id to a display name when possible; return null to omit the
// "by" line rather than leak a UUID.
function resolveActor(
  actorId: string | null,
  members: ClerkOrgMember[]
): string | null {
  if (!actorId) return null;
  const m = members.find((mem) => mem.id === actorId);
  if (!m) return null;
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return name || m.email || null;
}

export function SecuritySection({
  security,
  recentEvents,
  members,
}: {
  security: SecurityData;
  recentEvents: SettingsData["recentEvents"];
  members: ClerkOrgMember[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>Manage 2FA in your Clerk user profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={security.twoFactorEnabled ? "default" : "secondary"}>
              {security.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Manage 2FA <ExternalLink className="size-3.5" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            The most recent events recorded for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentEvents.map((e) => {
                const actor = resolveActor(e.actorId, members);
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {labelForEvent(e.eventType)}
                      </span>
                      {actor && (
                        <span className="text-xs text-muted-foreground">
                          by {actor}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(e.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Sessions are managed in Clerk. Revoke them from your Clerk profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {security.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active sessions found.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {security.sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {s.device ?? "Session"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.lastActiveAt
                      ? new Date(s.lastActiveAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Manage sessions <ExternalLink className="size-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
