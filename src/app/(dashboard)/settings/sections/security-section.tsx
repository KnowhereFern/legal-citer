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
import type { SettingsData } from "../settings-tabs";

type SecurityData = SettingsData["security"];

function formatRelative(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function SecuritySection({
  security,
  recentEvents,
}: {
  security: SecurityData;
  recentEvents: SettingsData["recentEvents"];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Manage 2FA in your Clerk user profile.
          </CardDescription>
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
              {recentEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{e.eventType}</span>
                    {e.actorId && (
                      <span className="text-xs text-muted-foreground">
                        by {e.actorId}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(e.createdAt)}
                  </span>
                </div>
              ))}
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
                  <span className="text-sm font-medium">{s.id}</span>
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
