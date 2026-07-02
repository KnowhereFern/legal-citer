export function statusBadgeClass(status: string): string {
  switch (status) {
    case "queued":
      return "border-warning/25 bg-warning/10 text-warning";
    case "running":
      return "border-info/25 bg-info/10 text-info";
    case "completed":
      return "border-success/25 bg-success/10 text-success";
    case "failed":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "cancelled":
      return "border-muted-foreground/25 bg-muted text-muted-foreground";
    default:
      return "";
  }
}

export function stageStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "border-muted-foreground/25 bg-muted text-muted-foreground";
    case "running":
      return "border-info/25 bg-info/10 text-info";
    case "completed":
      return "border-success/25 bg-success/10 text-success";
    case "failed":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "skipped":
      return "border-muted-foreground/25 bg-muted text-muted-foreground";
    default:
      return "";
  }
}

export function riskBadgeClass(risk: string): string {
  switch (risk) {
    case "low":
      return "border-success/25 bg-success/10 text-success";
    case "medium":
      return "border-warning/25 bg-warning/10 text-warning";
    case "high":
      return "border-warning/25 bg-warning/10 text-warning";
    case "critical":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function resultBadgeClass(result: string): string {
  switch (result) {
    case "pass":
      return "border-success/25 bg-success/10 text-success";
    case "fail":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "unresolved":
      return "border-warning/25 bg-warning/10 text-warning";
    case "not_applicable":
      return "border-muted-foreground/25 bg-muted text-muted-foreground";
    case "error":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function resultTextClass(result: string): string {
  switch (result) {
    case "pass":
      return "text-success";
    case "fail":
      return "text-destructive";
    case "unresolved":
      return "text-warning";
    default:
      return "text-foreground";
  }
}
