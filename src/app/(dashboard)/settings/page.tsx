import { redirect } from "next/navigation";
import { getAuthContext, getCurrentAppUser } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";

export default async function SettingsPage() {
  const { userId, orgId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const user = await getCurrentAppUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your account and workspace settings."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">
              {user?.firstName} {user?.lastName}
            </dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">
              {user?.emailAddresses[0]?.emailAddress ?? "—"}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            Your documents are scoped to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">
              {orgId ? "Organization" : "Personal"}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
