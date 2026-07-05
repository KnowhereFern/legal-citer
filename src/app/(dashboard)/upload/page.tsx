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
import { Progress } from "@/components/ui/progress";
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
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Info,
  Lock,
} from "lucide-react";

const RETENTION_OPTIONS = [
  {
    value: RETENTION_MODES.DELETE_RAW,
    title: "Delete raw file after verification",
    description:
      "Recommended. We keep the report and audit record, not the original upload.",
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

// Standard visually-hidden technique: clips the element out of the visual flow but
// KEEPS it focusable and in the accessibility tree (unlike `hidden`/display:none,
// which would drop the file input from the keyboard order entirely — WCAG fail).
const VISUALLY_HIDDEN_CLASS = "sr-only";

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
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [stageLabel, setStageLabel] = useState<string>("");
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
    if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
      return `Unsupported file type. We can check .pdf and .docx files.`;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return "That file is over the 50MB limit. Try a smaller document.";
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
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) {
        setError(
          "That didn't look like a file. Try dropping a .pdf or .docx."
        );
        return;
      }
      handleFileSelect(droppedFile);
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

  // Open the native file picker — used by both the dropzone button and its label.
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Safely parse a JSON response body. A 502/HTML gateway returns non-JSON
  // and would throw on `res.json()`, masking the real network/server error.
  const parseJson = useCallback(async (res: Response): Promise<{ error?: string } & Record<string, unknown>> => {
    try {
      return (await res.json()) as { error?: string } & Record<string, unknown>;
    } catch {
      return { error: undefined };
    }
  }, []);

  // One click. We chain upload → start-run → redirect so a pro se filer
  // never sees the two-backend-concept split. The button reflects "working" across
  // both calls via `working` + a stage label + a progress bar (XHR).
  const handleCheck = async () => {
    if (!file) return;
    setWorking(true);
    setError(null);
    setProgress(0);
    setStageLabel("Uploading…");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("retentionMode", retentionMode);
    if (jurisdiction) formData.append("jurisdiction", jurisdiction);
    if (filingType) formData.append("filingType", filingType);
    if (aiAssisted) formData.append("aiAssisted", aiAssisted);
    if (aiTool) formData.append("aiTool", aiTool);

    // Use XHR (not fetch) so we get upload progress events. fetch
    // gives no native progress; on flaky mobile a big PDF looks frozen.
    let uploadedDocumentId: string;
    try {
      uploadedDocumentId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/documents");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.upload.onerror = () => {
          reject(
            new Error(
              "We couldn't reach the server. Check your connection and try again."
            )
          );
        };
        xhr.onerror = () => {
          reject(
            new Error(
              "We couldn't reach the server. Check your connection and try again."
            )
          );
        };
        xhr.onload = () => {
          try {
            const body = JSON.parse(xhr.responseText) as {
              id?: string;
              error?: string;
            };
            if (xhr.status >= 400) {
              reject(
                new Error(
                  body.error ||
                    (xhr.status >= 500
                      ? "The server had a problem on its end. Try again in a moment."
                      : "Upload was rejected. Check the file and try again.")
                )
              );
              return;
            }
            if (!body.id) {
              reject(
                new Error(
                  "Upload finished, but no document came back. Try again."
                )
              );
              return;
            }
            resolve(body.id);
          } catch {
            // Non-JSON response (e.g. an HTML 502 page).
            reject(
              new Error(
                "We couldn't reach the server. Check your connection and try again."
              )
            );
          }
        };
        xhr.send(formData);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setWorking(false);
      setStageLabel("");
      return;
    }

    // Upload succeeded — immediately start the verification run, then redirect.
    setProgress(100);
    setStageLabel("Starting verification…");
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: uploadedDocumentId }),
      });

      if (!res.ok) {
        const body = await parseJson(res);
        throw new Error(
          body.error ||
            (res.status >= 500
              ? "The server had a problem starting your check. Try again in a moment."
              : "We couldn't start the check. Try again.")
        );
      }

      const data = (await parseJson(res)) as { id?: string };
      if (!data.id) {
        throw new Error("Verification started, but no run came back. Try again.");
      }
      router.push(`/runs/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't start the check. Try again."
      );
      setWorking(false);
      setStageLabel("");
    }
  };

  const workingOverall = working;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check your citations"
        description="Upload your draft. We'll tell you which cites check out — before you file."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload + CTA come first. A stressed user lands on the action,
          not a wall of dropdowns. */}
      <Card>
        <CardHeader>
          <CardTitle>Add your document</CardTitle>
          <CardDescription>
            {SUPPORTED_EXTENSIONS.join(", ")} up to 50MB. You can also drag a file in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* The dropzone is a real <button> so it's keyboard/screen-reader
              reachable, and it triggers the visually-hidden (NOT display:none)
              file input. */}
          <button
            type="button"
            aria-label="Upload document, PDF or DOCX"
            onClick={openFilePicker}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "focus-ring flex h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
              dragOver && "border-primary bg-primary/5 scale-[1.01]",
              file && !dragOver && "border-primary/40 bg-primary/5",
              !file && !dragOver &&
                "border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/50"
            )}
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
          </button>
          <Input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(",")}
            className={VISUALLY_HIDDEN_CLASS}
            onChange={handleInputChange}
          />

          {/* One-line reassurance a first-timer sees immediately. */}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            Your document is processed securely and never shared.
          </p>

          {/* Progress while uploading / starting — proves the app is alive. */}
          {workingOverall && (
            <div className="flex flex-col gap-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground tabular-nums">
                {stageLabel}
                {progress > 0 && progress < 100 ? ` · ${progress}%` : null}
              </p>
            </div>
          )}

          {/* Retention — single-select presets. */}
          <div className="flex flex-col gap-3">
            <Label>Retention</Label>
            <div
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
              role="group"
              aria-label="Retention mode"
            >
              {RETENTION_OPTIONS.map((opt) => {
                const selected = retentionMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRetentionMode(opt.value)}
                    disabled={workingOverall}
                    className={cn(
                      "focus-ring flex min-h-11 flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
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

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={handleCheck}
              disabled={!file || workingOverall}
            >
              {workingOverall ? (
                <>
                  <Spinner data-icon="inline-start" />
                  {stageLabel || "Working…"}
                </>
              ) : (
                "Check my citations"
              )}
            </Button>
            {!file && (
              <p className="text-xs text-muted-foreground">
                Pick a document above to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filing context is secondary: court / type / AI use. Optional, but it lets us
          flag AI-disclosure issues in the report. */}
      <Card>
        <CardHeader>
          <CardTitle>Filing context (optional)</CardTitle>
          <CardDescription>
            Helps us flag AI-disclosure issues in your report. Leave it blank if
            you&apos;re not sure.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-jurisdiction">Court / jurisdiction</Label>
              <Select
                value={jurisdiction}
                onValueChange={(v: string | null) => {
                  if (v) setJurisdiction(v);
                  else setJurisdiction("");
                }}
              >
                <SelectTrigger id="upload-jurisdiction" className="w-full">
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

            <div
              className="flex flex-col gap-2"
              role="group"
              aria-label="Filing type"
            >
              <Label>Filing type</Label>
              <div className="flex flex-wrap gap-2">
                {FILING_TYPES.map((f) => (
                  <Button
                    key={f.value}
                    type="button"
                    variant={filingType === f.value ? "default" : "outline"}
                    onClick={() =>
                      setFilingType((cur) => (cur === f.value ? "" : f.value))
                    }
                    className="min-h-11"
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <div
              className="flex flex-col gap-2"
              role="group"
              aria-label="Was generative AI used to help prepare this filing?"
            >
              <Label>Was generative AI used to help prepare this filing?</Label>
              <div className="flex flex-wrap gap-2">
                {AI_ASSISTED_VALUES.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={aiAssisted === v ? "default" : "outline"}
                    onClick={() =>
                      setAiAssisted((cur) => (cur === v ? "" : v))
                    }
                    className="min-h-11"
                  >
                    {AI_ASSISTED_LABELS[v]}
                  </Button>
                ))}
              </div>
            <p className="text-xs text-muted-foreground">
                We won&apos;t file anything with the court. You review the results first.
              </p>
            </div>

            {showAiTool && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="upload-ai-tool">AI tool used, if any</Label>
                <Select
                  value={aiTool}
                  onValueChange={(v: string | null) => {
                    if (v) setAiTool(v);
                    else setAiTool("");
                  }}
                >
                  <SelectTrigger id="upload-ai-tool" className="w-full">
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
    </div>
  );
}
