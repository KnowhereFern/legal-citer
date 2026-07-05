"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ClerkOrgMember, ClerkUserSession } from "@/lib/clerk-backend";
import { WorkspaceSection } from "./sections/workspace-section";
import { RetentionSection } from "./sections/retention-section";
import { SecuritySection } from "./sections/security-section";
import { NotificationsSection } from "./sections/notifications-section";
import { BillingSection } from "./sections/billing-section";
import { DataSection } from "./sections/data-section";

export type SettingsData = {
  org: {
    id: string;
    name: string;
    isPersonal: boolean;
    defaultJurisdiction: string | null;
    defaultFilingType: string | null;
    publicVerificationEnabled: boolean;
    plan: string;
    notifyReportReady: boolean;
    notifyAttachPdf: boolean;
    notifyShareLink: boolean;
  };
  retention: {
    rawFileHours: number;
    extractedTextHours: number;
    reportHours: number | null;
  } | null;
  members: ClerkOrgMember[];
  security: {
    twoFactorEnabled: boolean;
    lastSignInAt: number | null;
    sessions: ClerkUserSession[];
  };
  recentEvents: {
    id: string;
    eventType: string;
    actorId: string | null;
    createdAt: string;
  }[];
  billing: {
    plan: string;
    totalRuns: number;
    monthRuns: number;
    reportCount: number;
  };
};

export function SettingsTabs({ data }: { data: SettingsData }) {
  return (
    <Tabs defaultValue="workspace">
      <TabsList
        variant="line"
        className="w-full max-w-full justify-start gap-2 overflow-x-auto flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        <TabsTrigger value="retention">Retention</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="workspace" className="mt-6">
        <WorkspaceSection
          org={data.org}
          members={data.members}
        />
      </TabsContent>
      <TabsContent value="retention" className="mt-6">
        <RetentionSection
          org={data.org}
          retention={data.retention}
        />
      </TabsContent>
      <TabsContent value="security" className="mt-6">
        <SecuritySection
          security={data.security}
          recentEvents={data.recentEvents}
          members={data.members}
        />
      </TabsContent>
      <TabsContent value="notifications" className="mt-6">
        <NotificationsSection org={data.org} />
      </TabsContent>
      <TabsContent value="billing" className="mt-6">
        <BillingSection billing={data.billing} />
      </TabsContent>
      <TabsContent value="data" className="mt-6">
        <DataSection org={data.org} />
      </TabsContent>
    </Tabs>
  );
}
