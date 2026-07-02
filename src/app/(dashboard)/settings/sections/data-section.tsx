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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import type { SettingsData } from "../settings-tabs";
import { Download, Trash2, ShieldCheck } from "lucide-react";

type OrgData = SettingsData["org"];

export function DataSection({ org }: { org: OrgData }) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/settings/data/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `baddielegal-reports-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // surfaced via disabled state; keep simple for MVP
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/settings/data/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete");
      }
      setDeleteOpen(false);
      setConfirmText("");
      // Refresh so the rest of the page reflects the wiped state.
      window.location.reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const privacyContact =
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || "privacy@baddielegal.com";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Export reports</CardTitle>
          <CardDescription>
            Download all reports generated in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Format</Label>
            <Select
              value={format}
              onValueChange={(v: string | null) =>
                setFormat((v ?? "csv") as "csv" | "json")
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download data-icon="inline-start" />
                  Export reports ({format.toUpperCase()})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete workspace data</CardTitle>
          <CardDescription>
            Permanently delete all documents, runs, findings, and reports from
            this workspace. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) {
                setConfirmText("");
                setDeleteError(null);
              }
            }}
          >
            <DialogTrigger
              render={
                <Button variant="destructive">
                  <Trash2 data-icon="inline-start" />
                  Delete all data
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete all workspace data?</DialogTitle>
                <DialogDescription>
                  This permanently removes every document, run, finding, and
                  report from <strong>{org.name}</strong>. The workspace itself
                  and its audit trail are kept. To confirm, type the workspace
                  name below.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-name">Workspace name</Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={org.name}
                  autoFocus
                />
              </div>

              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={
                    deleting ||
                    confirmText.trim().toLowerCase() !==
                      org.name.trim().toLowerCase()
                  }
                >
                  {deleting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Deleting...
                    </>
                  ) : (
                    "Delete forever"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy requests</CardTitle>
          <CardDescription>
            For access, deletion, or other privacy requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              Privacy contact
            </AlertTitle>
            <AlertDescription>
              Contact us at{" "}
              <a
                href={`mailto:${privacyContact}`}
                className="text-primary hover:underline"
              >
                {privacyContact}
              </a>{" "}
              to submit a privacy request.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
