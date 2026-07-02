"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, type Plan } from "@/lib/constants";
import type { SettingsData } from "../settings-tabs";

type BillingData = SettingsData["billing"];

export function BillingSection({ billing }: { billing: BillingData }) {
  const plan = (PLAN_LABELS[billing.plan as Plan] ?? "Free");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            Your current subscription plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge variant="secondary">{plan}</Badge>
          <span className="text-sm text-muted-foreground">
            Upgrading and downgrading is coming soon.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Verification activity in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-muted-foreground">Verification runs (total)</dt>
            <dd className="font-medium">{billing.totalRuns}</dd>
            <dt className="text-muted-foreground">Verification runs (this month)</dt>
            <dd className="font-medium">{billing.monthRuns}</dd>
            <dt className="text-muted-foreground">Reports generated</dt>
            <dd className="font-medium">{billing.reportCount}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Billing history and downloadable invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No invoices yet — the Free plan has no invoices. They will appear
            here once you upgrade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
