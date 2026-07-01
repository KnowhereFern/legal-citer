import { redirect } from "next/navigation";
import { getAuthContext, getCurrentAppUser } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const { userId, orgId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const user = await getCurrentAppUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and workspace settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>
            Your documents are scoped to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm">
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
