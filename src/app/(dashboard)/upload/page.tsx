"use client";

import { useState, useRef, useCallback, useMemo } from "react";
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
import {
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  RETENTION_DEFAULT,
  RETENTION_MODES,
  FILING_TYPES,
  AI_ASSISTED_VALUES,
  AI_TOOLS,
} from "@/lib/constants";
import { JURISDICTIONS } from "@/lib/jurisdictions";
import { getDisclosureGuidance } from "@/lib/ai-disclosure";
import { UploadCloud, FileText, CheckCircle2, ShieldCheck, Info } from "lucide-react";

const RETENTION_OPTIONS = [
  {
    value: RETENTION_MODES.DELETE_RAW,
    title: "Delete raw file after verification",
    description: "Recommended. We keep the report and audit record, not the original upload.",
    recommended: true,
  },
  {
    value: RETENTION_MODES.KEEP_REPORT,
    title: "Keep report history",
    description: "Stores reports in your workspace for later review.",
    recommended: false,
  },
  {
    value: RETENTION_MODES.PRIVATE,
    title: "Private mode",
    description:
      "Deletes raw upload and extracted text after processing. Keeps limited audit metadata only.",
    recommended: false,
  },
];

const AI_ASSISTED_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unsure: "Not sure",
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [retentionMode, setRetentionMode] = useState<string>(RETENTION_DEFAULT);
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [filingType, setFilingType] = useState<string>("");
  const [aiAssisted, setAiAssisted] = useState<string>("");
  const [aiTool, setAiTool] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [startingRun, setStartingRun] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const guidance = useMemo(
    () =>
      getDisclosureGuidance({
        jurisdictionKey: jurisdiction || null,
        aiAssisted: aiAssisted || null,
        aiTool: aiTool || null,
      }),
    [jurisdiction, aiAssisted, aiTool]
  );

  const showAiTool = aiAssisted === "yes" || aiAssisted === "unsure";
  const showGuidance = Boolean(jurisdiction) && Boolean(aiAssisted);

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
    if (jurisdiction) formData.append("jurisdiction", jurisdiction);
    if (filingType) formData.append("filingType", filingType);
    if (aiAssisted) formData.append("aiAssisted", aiAssisted);
    if (aiTool) formData.append("aiTool", aiTool);

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
        body: JSON.stringify({ documentId }),
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

      {/* Filing context — helps determine whether AI disclosure is required. */}
      <Card>
        <CardHeader>
          <CardTitle>Filing context</CardTitle>
          <CardDescription>
            Optional, but it lets us tell you whether this court requires an
            AI-use disclosure on the filing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Court / jurisdiction</Label>
              <Select
                value={jurisdiction}
                onValueChange={(v: string | null) => { if (v) setJurisdiction(v); else setJurisdiction(""); }}
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
              <Label>Filing type</Label>
              <div className="flex flex-wrap gap-2">
                {FILING_TYPES.map((f) => (
                  <Button
                    key={f.value}
                    type="button"
                    variant={filingType === f.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFilingType((cur) => (cur === f.value ? "" : f.value))
                    }
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Was generative AI used to help prepare this filing?</Label>
              <div className="flex flex-wrap gap-2">
                {AI_ASSISTED_VALUES.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={aiAssisted === v ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setAiAssisted((cur) => (cur === v ? "" : v))
                    }
                  >
                    {AI_ASSISTED_LABELS[v]}
                  </Button>
                ))}
              </div>
            </div>

            {showAiTool && (
              <div className="flex flex-col gap-2">
                <Label>AI tool used, if any</Label>
                <Select
                  value={aiTool}
                  onValueChange={(v: string | null) => { if (v) setAiTool(v); else setAiTool(""); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_TOOLS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {showGuidance && (
            <Alert variant={guidance.tone === "action" ? "default" : undefined}>
              <AlertTitle className="flex items-center gap-2">
                {guidance.tone === "none" ? (
                  <ShieldCheck className="size-4 text-success" />
                ) : guidance.tone === "action" ? (
                  <CheckCircle2 className="size-4 text-warning" />
                ) : (
                  <Info className="size-4 text-info" />
                )}
                {guidance.heading}
              </AlertTitle>
              <AlertDescription>{guidance.body}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload box */}
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

          <p className="text-sm text-muted-foreground">
            We do not file anything with the court. You review the results before
            using them.
          </p>

          {/* Retention — single-select presets */}
          <div className="flex flex-col gap-3">
            <Label>Retention</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {RETENTION_OPTIONS.map((opt) => {
                const selected = retentionMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRetentionMode(opt.value)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{opt.title}</span>
                      {opt.recommended && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
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
