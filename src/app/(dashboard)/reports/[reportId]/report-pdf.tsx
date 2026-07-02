import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { FilingBlockResult } from "@/lib/filing-block";

export interface ReportPdfData {
  reportId: string;
  filename: string;
  riskBand: string | null;
  coveragePct: number | null;
  citationCount: number | null;
  quoteIssues: number | null;
  unresolvedItems: number | null;
  documentHash: string;
  generatedAt: string;
  runId: string;
  filingBlock: FilingBlockResult;
  isPublicView: boolean;
  exceptions: Array<{
    checkType: string;
    result: string;
    citationText: string | null;
  }>;
  findings?: Array<{
    checkType: string;
    result: string;
    citationText: string | null;
    sourceQueried: string | null;
    isAiAssisted: boolean;
    aiModelName: string | null;
  }>;
  pipelineStages?: Array<{
    stageName: string;
    status: string;
    failureDetail: string | null;
  }>;
  passedCount: number;
  failedCount: number;
  totalFindings: number;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    borderBottom: "1 solid #ddd",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 160,
    color: "#666",
  },
  value: {
    flex: 1,
  },
  mono: {
    fontFamily: "Courier",
    fontSize: 8,
  },
  block: {
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  blockText: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  note: {
    fontSize: 8,
    color: "#666",
    marginTop: 4,
  },
  limitation: {
    fontSize: 9,
    color: "#444",
    marginBottom: 4,
  },
  finding: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: "1 solid #eee",
  },
  badge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    padding: "2 6",
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    fontSize: 9,
    marginBottom: 2,
  },
  col1: { width: "35%" },
  col2: { width: "20%" },
  col3: { width: "45%" },
  warn: {
    backgroundColor: "#fff8e1",
    border: "1 solid #ffc107",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  warnText: {
    fontSize: 8,
    color: "#856404",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTop: "1 solid #ddd",
    paddingTop: 8,
  },
});

export function ReportPdf({ data }: { data: ReportPdfData }) {
  const pages = [];

  pages.push(
    <Page key="main" size="LETTER" style={styles.page}>
      <Text style={styles.title}>
        {data.isPublicView
          ? "AI Use & Verification Summary"
          : "Pre-Filing Verification Report"}
      </Text>
      <Text style={styles.subtitle}>
        {data.filename} — Generated {new Date(data.generatedAt).toLocaleString()}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Risk Band</Text>
          <Text style={styles.value}>{data.riskBand ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Coverage</Text>
          <Text style={styles.value}>{(data.coveragePct ?? 0).toFixed(1)}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Authorities Extracted</Text>
          <Text style={styles.value}>{data.citationCount ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Authorities Verified</Text>
          <Text style={styles.value}>{data.passedCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unresolved</Text>
          <Text style={styles.value}>{data.unresolvedItems ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quote Issues</Text>
          <Text style={styles.value}>{data.quoteIssues ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Document Hash (SHA-256)</Text>
          <Text style={[styles.value, styles.mono]}>{data.documentHash}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Run ID</Text>
          <Text style={[styles.value, styles.mono]}>{data.runId}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filing Block</Text>
        <Text style={styles.note}>Source: {data.filingBlock.source}</Text>
        {data.filingBlock.superseded && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026. Included as optional enhanced disclosure.
            </Text>
          </View>
        )}
        <View style={styles.block}>
          <Text style={styles.blockText}>{data.filingBlock.certificationText}</Text>
        </View>
        <Text style={styles.note}>{data.filingBlock.placementNote}</Text>
      </View>

      {data.exceptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exceptions Remaining ({data.exceptions.length})</Text>
          {data.exceptions.map((exc, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={styles.limitation}>
                {i + 1}. [{exc.result}] {exc.checkType}
                {exc.citationText ? ` — ${exc.citationText}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Record</Text>
        <View style={styles.block}>
          <Text style={styles.mono}>{data.filingBlock.verificationSummary}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Limitations</Text>
        {data.filingBlock.limitations.map((lim, i) => (
          <Text key={i} style={styles.limitation}>
            • {lim}
          </Text>
        ))}
        <Text style={styles.limitation}>
          • This verification confirms only that the listed checks were run on the identified document version. It does not certify legal merit, strategic soundness, completeness of the record, or likelihood of success.
        </Text>
      </View>

      {!data.isPublicView && data.findings && data.findings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itemized Findings ({data.findings.length})</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Check Type</Text>
            <Text style={styles.col2}>Result</Text>
            <Text style={styles.col3}>Citation / Source</Text>
          </View>
          {data.findings.map((f, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{f.checkType}</Text>
              <Text style={styles.col2}>{f.result}</Text>
              <Text style={styles.col3}>
                {f.citationText ?? "—"}
                {f.sourceQueried ? `\n[${f.sourceQueried}]` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attorney Acknowledgment</Text>
        <Text style={styles.limitation}>
          The undersigned reviewed this {data.isPublicView ? "summary" : "report"} and the
          underlying verification results for the identified filing version. Any unresolved items
          remaining at the time of filing are expressly identified above. The undersigned accepts
          full responsibility for the contents of the filing.
        </Text>
        <Text style={{ marginTop: 20, fontSize: 9, color: "#666" }}>
          Dated: _____________________________
        </Text>
        <Text style={{ marginTop: 30, fontSize: 9, color: "#666" }}>
          ____________________________________
        </Text>
        <Text style={{ fontSize: 9, color: "#666" }}>Attorney Name / Bar No.</Text>
      </View>

      <Text style={styles.footer} fixed>
        Legal Citer Verification Report — {data.reportId} — Page {"$page"} of {"$pages"}
      </Text>
    </Page>
  );

  return <Document>{pages}</Document>;
}
