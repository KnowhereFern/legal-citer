"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [retentionMode, setRetentionMode] = useState<string>("standard");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [startingRun, setStartingRun] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
      return `Unsupported file type. Accepted: ${SUPPORTED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return "File size exceeds the 50MB limit.";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setError(null);
      setFile(f);
      setDocumentId(null);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFileSelect(selectedFile);
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("retentionMode", retentionMode);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Upload failed");
      }

      const data = await res.json();
      setDocumentId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleStartRun = async () => {
    if (!documentId) return;
    setStartingRun(true);
    setError(null);

    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          retentionMode,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to start verification");
      }

      const data = await res.json();
      router.push(`/runs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start verification");
    } finally {
      setStartingRun(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upload & Verify"
        description="Upload a legal document to verify its citations."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>
            Accepted formats: {SUPPORTED_EXTENSIONS.join(", ")} (max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div
            className={cn(
              "flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
              dragOver && "border-primary bg-primary/5 scale-[1.01]",
              file && !dragOver && "border-primary/40 bg-primary/5",
              !file && !dragOver && "border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="size-6 text-primary" />
                </div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                  <UploadCloud className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Drop your document here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SUPPORTED_EXTENSIONS.join(", ")} up to 50MB
                  </p>
                </div>
              </div>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Retention Mode</Label>
            <Select
              value={retentionMode}
              onValueChange={(v: string | null) => { if (v) setRetentionMode(v); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standard (files retained per policy)
                </SelectItem>
                <SelectItem value="no_retention">
                  No Retention (files deleted after processing)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={handleUpload}
              disabled={!file || uploading || !!documentId}
            >
              {uploading ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Uploading...
                </>
              ) : documentId ? (
                <>
                  <CheckCircle2 data-icon="inline-start" />
                  Uploaded
                </>
              ) : (
                "Upload Document"
              )}
            </Button>

            {documentId && (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleStartRun}
                disabled={startingRun}
              >
                {startingRun ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Starting...
                  </>
                ) : (
                  "Start Verification"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
