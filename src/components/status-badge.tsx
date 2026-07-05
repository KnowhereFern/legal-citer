import type { ComponentType, SVGProps } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  type LucideProps,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for citation/run status presentation.
 *
 * DESIGN.md mandates that every status signal is conveyed by **icon + label +
 * color**, never color alone (PRODUCT.md a11y rule #2 — deuteranopia/protanopia
 * hazard). The legacy `*BadgeClass` helpers in `status-colors.ts` returned color
 * classes only; this component emits the full icon + plain-English label + color
 * triple so every surface (runs list, run detail, report, sample, public /v) is
 * consistent and accessible.
 *
 * Keep new statuses mapping to the DESIGN.md status table:
 * success → CheckCircle2, warning → AlertTriangle, destructive → XCircle/ShieldAlert,
 * info → Info.
 */

type Icon = ComponentType<SVGProps<SVGSVGElement> & LucideProps>;

type StatusTone = "success" | "warning" | "destructive" | "info" | "muted";

type StatusMeta = {
  label: string;
  icon: Icon;
  tone: StatusTone;
};

const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-info/25 bg-info/10 text-info",
  muted: "border-muted-foreground/25 bg-muted text-muted-foreground",
};

/** Run-level status (the `Run.status` enum). */
export const RUN_STATUS_META: Record<string, StatusMeta> = {
  queued: { label: "Queued", icon: Loader2, tone: "warning" },
  running: { label: "Running", icon: Loader2, tone: "info" },
  completed: { label: "Done", icon: CheckCircle2, tone: "success" },
  failed: { label: "Failed", icon: XCircle, tone: "destructive" },
  cancelled: { label: "Cancelled", icon: MinusCircle, tone: "muted" },
};

/** Pipeline-stage status (the `PipelineStage.status` enum). */
export const STAGE_STATUS_META: Record<string, StatusMeta> = {
  pending: { label: "Pending", icon: MinusCircle, tone: "muted" },
  running: { label: "Running", icon: Loader2, tone: "info" },
  completed: { label: "Done", icon: CheckCircle2, tone: "success" },
  failed: { label: "Failed", icon: XCircle, tone: "destructive" },
  skipped: { label: "Skipped", icon: MinusCircle, tone: "muted" },
};

/** Finding / exception result (the `Finding.result` enum). */
export const RESULT_META: Record<string, StatusMeta> = {
  pass: { label: "Checks out", icon: CheckCircle2, tone: "success" },
  fail: { label: "Doesn't check out", icon: XCircle, tone: "destructive" },
  unresolved: { label: "Couldn't verify", icon: AlertTriangle, tone: "warning" },
  not_applicable: { label: "Not applicable", icon: MinusCircle, tone: "muted" },
  error: { label: "Error", icon: AlertTriangle, tone: "destructive" },
};

/** Report risk band (the `Report.riskBand` enum). */
export const RISK_META: Record<string, StatusMeta> = {
  low: { label: "Low risk", icon: ShieldCheck, tone: "success" },
  medium: { label: "Medium risk", icon: Info, tone: "info" },
  high: { label: "High risk", icon: AlertTriangle, tone: "warning" },
  critical: {
    label: "Do not file without fixing",
    icon: ShieldAlert,
    tone: "destructive",
  },
};

function metaFor(kind: MetaKind, value: string): StatusMeta | undefined {
  switch (kind) {
    case "run":
      return RUN_STATUS_META[value];
    case "stage":
      return STAGE_STATUS_META[value];
    case "result":
      return RESULT_META[value];
    case "risk":
      return RISK_META[value];
  }
}

type MetaKind = "run" | "stage" | "result" | "risk";

const FALLBACK_META: StatusMeta = {
  label: "Unknown",
  icon: Info,
  tone: "muted",
};

type StatusBadgeProps = {
  kind: MetaKind;
  /** The raw enum value from the database (e.g. "completed", "pass", "high"). */
  value: string;
  /** Override the label (e.g. to shorten for a tight table cell). */
  label?: string;
  /** Override the icon. */
  icon?: Icon;
  /** Hide the label (icon + accessible sr-only text only). */
  iconOnly?: boolean;
  className?: string;
};

/**
 * Renders a status badge with the matching icon + plain-English label + brand
 * tone. Drop-in replacement for `<Badge className={riskBadgeClass(x)}>{x}</Badge>`.
 *
 * Icon gets `data-icon="inline-start"` so the Badge component's icon-aware
 * padding (`has-data-[icon=inline-start]:pl-1.5`) kicks in.
 */
export function StatusBadge({
  kind,
  value,
  label,
  icon,
  iconOnly,
  className,
}: StatusBadgeProps) {
  const meta = metaFor(kind, value) ?? FALLBACK_META;
  const Icon = icon ?? meta.icon;
  const text = label ?? meta.label;

  return (
    <Badge
      variant="outline"
      className={cn(TONE_BADGE_CLASS[meta.tone], className)}
    >
      <Icon data-icon="inline-start" className={cn(Icon === Loader2 && "animate-spin")} />
      {iconOnly ? <span className="sr-only">{text}</span> : text}
    </Badge>
  );
}

/** Convenience wrappers so call sites read clearly. */
export function RunStatusBadge(props: Omit<StatusBadgeProps, "kind">) {
  return <StatusBadge {...props} kind="run" />;
}
export function StageStatusBadge(props: Omit<StatusBadgeProps, "kind">) {
  return <StatusBadge {...props} kind="stage" />;
}
export function ResultBadge(props: Omit<StatusBadgeProps, "kind">) {
  return <StatusBadge {...props} kind="result" />;
}
export function RiskBadge(props: Omit<StatusBadgeProps, "kind">) {
  return <StatusBadge {...props} kind="risk" />;
}

/**
 * Inline (non-badge) result tone for places that color a single word/number
 * inside flowing text. Replaces `resultTextClass`. Pairs the color with an
 * accessible label so it is never color-only.
 */
export function ResultTone({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const meta = RESULT_META[value] ?? FALLBACK_META;
  const toneText: Record<StatusTone, string> = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-info",
    muted: "text-muted-foreground",
  };
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", toneText[meta.tone], className)}>
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}

export { TONE_BADGE_CLASS };
export type { StatusTone, StatusMeta, MetaKind };
