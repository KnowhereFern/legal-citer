export interface DiffFinding {
  id: string;
  citationText?: string | null;
  checkType: string;
  result: string;
  severity?: string | null;
}

export interface ChangedSeverityItem {
  previous: DiffFinding;
  current: DiffFinding;
}

export interface DiffSummary {
  totalPrevious: number;
  totalCurrent: number;
  newCount: number;
  resolvedCount: number;
  unchangedCount: number;
  changedRiskCount: number;
}

export interface DiffResult {
  newIssues: DiffFinding[];
  resolvedIssues: DiffFinding[];
  unchangedIssues: DiffFinding[];
  changedRisk: ChangedSeverityItem[];
  summary: DiffSummary;
}

function findingKey(f: DiffFinding): string {
  return `${f.checkType}::${f.citationText ?? "null"}`;
}

export function computeDiff(params: {
  previousFindings: Record<string, unknown>[];
  currentFindings: Record<string, unknown>[];
}): DiffResult {
  const previous: DiffFinding[] = params.previousFindings.map((f) => ({
    id: String(f.id),
    citationText: f.citationText != null ? String(f.citationText) : null,
    checkType: String(f.checkType),
    result: String(f.result),
    severity: f.severity != null ? String(f.severity) : null,
  }));

  const current: DiffFinding[] = params.currentFindings.map((f) => ({
    id: String(f.id),
    citationText: f.citationText != null ? String(f.citationText) : null,
    checkType: String(f.checkType),
    result: String(f.result),
    severity: f.severity != null ? String(f.severity) : null,
  }));

  const previousMap = new Map<string, DiffFinding>();
  for (const f of previous) {
    previousMap.set(findingKey(f), f);
  }

  const currentMap = new Map<string, DiffFinding>();
  for (const f of current) {
    currentMap.set(findingKey(f), f);
  }

  const newIssues: DiffFinding[] = [];
  const resolvedIssues: DiffFinding[] = [];
  const unchangedIssues: DiffFinding[] = [];
  const changedRisk: ChangedSeverityItem[] = [];

  for (const f of current) {
    const key = findingKey(f);
    const prev = previousMap.get(key);
    if (!prev) {
      newIssues.push(f);
    } else if (f.result === prev.result && f.severity === prev.severity) {
      unchangedIssues.push(f);
    } else if (f.result !== prev.result) {
      changedRisk.push({ previous: prev, current: f });
    } else if (f.severity !== prev.severity) {
      changedRisk.push({ previous: prev, current: f });
    }
  }

  for (const f of previous) {
    const key = findingKey(f);
    if (!currentMap.has(key)) {
      resolvedIssues.push(f);
    }
  }

  return {
    newIssues,
    resolvedIssues,
    unchangedIssues,
    changedRisk,
    summary: {
      totalPrevious: previous.length,
      totalCurrent: current.length,
      newCount: newIssues.length,
      resolvedCount: resolvedIssues.length,
      unchangedCount: unchangedIssues.length,
      changedRiskCount: changedRisk.length,
    },
  };
}
