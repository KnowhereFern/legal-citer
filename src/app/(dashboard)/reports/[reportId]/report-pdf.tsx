import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { BRAND, publicVerificationUrl } from "@/lib/brand";
import type {
  PublicExhibitData,
  ReportData,
} from "@/lib/report-data";
import { pdfPalette as p } from "./pdf-palette";

export type { PublicExhibitData, ReportData } from "@/lib/report-data";

const shared = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { fontSize: 10, lineHeight: 1.6 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
    fontSize: 8,
    color: p.faint,
    textAlign: "center",
    borderTop: `1 solid ${p.rule}`,
    paddingTop: 8,
  },
});

// ---------------------------------------------------------------------------
// PUBLIC EXHIBIT — bare, brand-forward, safe for the public docket.
// ---------------------------------------------------------------------------

const pub = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `2 solid ${p.ink}`,
    paddingBottom: 10,
    marginBottom: 20,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: p.ink,
    color: p.paper,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    paddingTop: 6,
  },
  brandName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  brandDomain: {
    fontSize: 8,
    color: p.faint,
  },
  exhibitLabel: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginBottom: 2,
  },
  exhibitTitle: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  preparedBy: {
    textAlign: "center",
    fontSize: 9,
    color: p.subtle,
    marginBottom: 24,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 210, color: p.muted, fontSize: 9 },
  value: { flex: 1, fontSize: 9 },
  valueMono: { flex: 1, fontFamily: "Courier", fontSize: 8 },
  scopeItem: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 10,
  },
  scopeMark: { width: 16, color: p.ink, fontFamily: "Helvetica-Bold" },
  scopeLabel: { flex: 1 },
  scopeStatus: {
    fontSize: 8,
    color: p.faint,
    fontFamily: "Helvetica-Oblique",
  },
  statusBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 4,
    border: `1 solid ${p.ink}`,
    backgroundColor: p.surfaceTint,
  },
  statusLabel: { fontSize: 8, color: p.subtle, textTransform: "uppercase", letterSpacing: 1 },
  statusValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  limitation: { fontSize: 9, color: p.muted, marginBottom: 4 },
  supports: {
    marginTop: 10,
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: p.muted,
  },
});

export function PublicExhibitPdf({ data }: { data: PublicExhibitData }) {
  const id = data.verificationId ?? data.reportId;
  return (
    <Document title={`${BRAND.artifactSummary} — ${id}`}>
      <Page key="public" size="LETTER" style={shared.page}>
        {/* Brand header */}
        <View style={pub.brandRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={pub.mark}>{BRAND.company.charAt(0)}</Text>
            <View>
              <Text style={pub.brandName}>{BRAND.company}</Text>
              <Text style={pub.brandDomain}>{BRAND.domain}</Text>
            </View>
          </View>
        </View>

        <Text style={pub.exhibitLabel}>EXHIBIT A</Text>
        <Text style={pub.exhibitTitle}>AI USE &amp; VERIFICATION SUMMARY</Text>
        <Text style={pub.preparedBy}>
          Prepared by {BRAND.company} | {BRAND.domain}
        </Text>

        {/* Identity */}
        <View style={shared.section}>
          <View style={pub.row}>
            <Text style={pub.label}>Verification ID</Text>
            <Text style={[pub.value, { fontFamily: "Courier", fontSize: 8 }]}>
              {id}
            </Text>
          </View>
          <View style={pub.row}>
            <Text style={pub.label}>Document Hash (SHA-256)</Text>
            <Text style={pub.valueMono}>{data.documentHash}</Text>
          </View>
          <View style={pub.row}>
            <Text style={pub.label}>Reviewed Version Timestamp</Text>
            <Text style={pub.value}>{data.generatedAt}</Text>
          </View>
          <View style={pub.row}>
            <Text style={pub.label}>
              Generative drafting tools disclosed by filer
            </Text>
            <Text style={pub.value}>{data.aiToolsDisclosed}</Text>
          </View>
          <View style={pub.row}>
            <Text style={pub.label}>Verification vendor / system</Text>
            <Text style={pub.value}>{data.verificationVendor}</Text>
          </View>
        </View>

        {/* Scope */}
        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Verification scope</Text>
          {data.verificationScope.map((item, i) => (
            <View key={i} style={pub.scopeItem}>
              <Text style={pub.scopeMark}>•</Text>
              <Text style={pub.scopeLabel}>
                {item.label}{" "}
                <Text style={pub.scopeStatus}>
                  {item.status === "not_enabled" ? "[if run — not run]" : ""}
                </Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Status */}
        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Summary status</Text>
          <View style={pub.statusBox}>
            <Text style={pub.statusLabel}>Final workflow status</Text>
            <Text style={pub.statusValue}>{data.finalStatus}</Text>
          </View>
        </View>

        {/* Limitations */}
        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Limitations</Text>
          {data.limitations.map((lim, i) => (
            <Text key={i} style={pub.limitation}>
              {lim}
            </Text>
          ))}
          <Text style={pub.supports}>{data.supportsNote}</Text>
        </View>

        <Text style={shared.footer} fixed>
          {BRAND.product} — {publicVerificationUrl(id)}
          {"\n"}Page {"$page"} of {"$pages"}
        </Text>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// FULL PRIVATE REPORT — identification, purpose, counts, exceptions,
// attorney acknowledgment, Appendix A. Not for the public docket.
// ---------------------------------------------------------------------------

const full = StyleSheet.create({
  courtCaption: {
    textAlign: "center",
    fontSize: 9,
    color: p.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  exhibitTitle: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 2,
  },
  exhibitSubtitle: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 20,
  },
  hr: { borderBottom: `1 solid ${p.rule}`, marginVertical: 12 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 190, color: p.muted, fontSize: 9 },
  value: { flex: 1, fontSize: 9 },
  valueMono: { flex: 1, fontFamily: "Courier", fontSize: 8 },
  scopeItem: { flexDirection: "row", marginBottom: 3, fontSize: 10 },
  scopeNum: { width: 18, fontFamily: "Helvetica-Bold" },
  scopeLabel: { flex: 1 },
  scopeStatus: { fontSize: 8, color: p.faint, fontFamily: "Helvetica-Oblique" },
  summaryRow: { flexDirection: "row", marginBottom: 3 },
  summaryLabel: { width: 240, fontSize: 10 },
  summaryValue: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  finalStatusBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 4,
    backgroundColor: p.surface,
    border: `1 solid ${p.rule}`,
  },
  finalStatusLabel: { fontSize: 9, color: p.muted },
  finalStatusValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  exceptionItem: { marginBottom: 4, fontSize: 10 },
  exceptionCite: { fontFamily: "Courier", fontSize: 9, color: p.ink },
  warn: {
    backgroundColor: p.warnFill,
    border: `1 solid ${p.warnBorder}`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  warnText: { fontSize: 8, color: p.warnText },
  limitation: { fontSize: 9, color: p.muted, marginBottom: 4 },
  appendixHeader: {
    flexDirection: "row",
    borderBottom: `1 solid ${p.faint}`,
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    backgroundColor: p.bandFill,
  },
  appendixRow: {
    flexDirection: "row",
    fontSize: 7.5,
    marginBottom: 2,
    paddingBottom: 2,
    borderBottom: `1 solid ${p.rowRule}`,
  },
  col: { paddingLeft: 3 },
  cParagraph: { width: "8%" },
  cCitation: { width: "16%" },
  cCanonical: { width: "20%" },
  cSource: { width: "9%" },
  cQuote: { width: "8%" },
  cMeta: { width: "8%" },
  cReview: { width: "11%" },
  cTime: { width: "20%" },
  signatureLine: { marginTop: 30, fontSize: 10 },
  signatureDetail: { fontSize: 9, color: p.muted, marginTop: 2 },
});

function Identification({ data }: { data: ReportData }) {
  return (
    <View style={shared.section}>
      {data.identification.caseNumber === "[CASE NUMBER]" && (
        <Text style={full.courtCaption}>[COURT CAPTION]</Text>
      )}
      <View style={full.row}>
        <Text style={full.label}>Case No.</Text>
        <Text style={full.value}>{data.identification.caseNumber}</Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>Filing Title</Text>
        <Text style={full.value}>{data.identification.filingTitle}</Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>Reviewed Version Date/Time</Text>
        <Text style={full.value}>{data.identification.reviewedVersionAt}</Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>Verification Run ID</Text>
        <Text style={[full.value, { fontFamily: "Courier", fontSize: 8 }]}>
          {data.identification.runId}
        </Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>Document Hash (SHA-256)</Text>
        <Text style={full.valueMono}>{data.identification.documentHash}</Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>AI Tool(s) Disclosed</Text>
        <Text style={full.value}>{data.identification.aiToolsDisclosed}</Text>
      </View>
      <View style={full.row}>
        <Text style={full.label}>Verification Vendor / System</Text>
        <Text style={full.value}>{data.identification.verificationVendor}</Text>
      </View>
    </View>
  );
}

function SummaryOfResults({ data }: { data: ReportData }) {
  const s = data.summary;
  const recordLine = s.recordCitationsChecked === null;
  return (
    <View style={shared.section}>
      <Text style={shared.sectionTitle}>Summary of Results</Text>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Authorities extracted</Text>
        <Text style={full.summaryValue}>{s.authoritiesExtracted}</Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Authorities verified</Text>
        <Text style={full.summaryValue}>{s.authoritiesVerified}</Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Authorities unresolved at first pass</Text>
        <Text style={full.summaryValue}>{s.authoritiesUnresolved}</Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Quotations checked</Text>
        <Text style={full.summaryValue}>{s.quotationsChecked}</Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Quotations matched</Text>
        <Text style={full.summaryValue}>{s.quotationsMatched}</Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Record citations checked</Text>
        <Text style={full.summaryValue}>
          {recordLine ? "N/A — not enabled" : s.recordCitationsChecked}
        </Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Record citations unresolved</Text>
        <Text style={full.summaryValue}>
          {recordLine ? "N/A — not enabled" : s.recordCitationsUnresolved}
        </Text>
      </View>
      <View style={full.summaryRow}>
        <Text style={full.summaryLabel}>Exceptions remaining at final review</Text>
        <Text style={full.summaryValue}>{s.exceptionsRemaining}</Text>
      </View>
      <View style={full.finalStatusBox}>
        <Text style={full.finalStatusLabel}>Final workflow status</Text>
        <Text style={full.finalStatusValue}>{s.finalStatus}</Text>
      </View>
    </View>
  );
}

function AttorneyAcknowledgment({ data }: { data: ReportData }) {
  return (
    <View style={shared.section}>
      <Text style={shared.sectionTitle}>Attorney Acknowledgment</Text>
      <Text style={shared.body}>
        The undersigned reviewed this summary and the underlying verification
        results for the identified filing version. Any unresolved items
        remaining at the time of filing are expressly identified below or in the
        filing itself.
      </Text>
      <Text style={full.signatureLine}>Dated: {data.signature.datedLabel}</Text>
      <Text style={{ marginTop: 24, fontSize: 10 }}>____________________________________</Text>
      <Text style={full.signatureDetail}>{data.signature.attorneyName}</Text>
      <Text style={full.signatureDetail}>{data.signature.barNumber}</Text>
      <Text style={full.signatureDetail}>{data.signature.lawFirm}</Text>
      <Text style={full.signatureDetail}>
        Counsel for {data.signature.party}
      </Text>
    </View>
  );
}

function ExceptionsRemaining({ data }: { data: ReportData }) {
  if (data.exceptions.length === 0) {
    return (
      <View style={shared.section}>
        <Text style={shared.sectionTitle}>Exceptions Remaining at Filing</Text>
        <Text style={shared.body}>None.</Text>
      </View>
    );
  }
  return (
    <View style={shared.section}>
      <Text style={shared.sectionTitle}>
        Exceptions Remaining at Filing ({data.exceptions.length})
      </Text>
      {data.exceptions.map((exc, i) => (
        <View key={i} style={full.exceptionItem}>
          <Text>
            {i + 1}. [{exc.result}] {exc.checkType}
          </Text>
          {exc.citationText && (
            <Text style={full.exceptionCite}>{exc.citationText}</Text>
          )}
          {exc.detail && (
            <Text style={{ fontSize: 8, color: p.subtle }}>{exc.detail}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function AppendixA({ data }: { data: ReportData }) {
  if (!data.appendix || data.appendix.length === 0) return null;
  return (
    <View style={shared.section}>
      <Text style={shared.sectionTitle}>
        Appendix A — Itemized Findings ({data.appendix.length})
      </Text>
      <View style={full.appendixHeader}>
        <Text style={[full.col, full.cParagraph]}>¶ / Page</Text>
        <Text style={[full.col, full.cCitation]}>Citation as written</Text>
        <Text style={[full.col, full.cCanonical]}>Canonical authority resolved</Text>
        <Text style={[full.col, full.cSource]}>Source</Text>
        <Text style={[full.col, full.cQuote]}>Quote</Text>
        <Text style={[full.col, full.cMeta]}>Metadata</Text>
        <Text style={[full.col, full.cReview]}>Reviewer</Text>
        <Text style={[full.col, full.cTime]}>Timestamp</Text>
      </View>
      {data.appendix.map((row, i) => (
        <View key={i} style={full.appendixRow} wrap={false}>
          <Text style={[full.col, full.cParagraph]}>{row.paragraph ?? "—"}</Text>
          <Text style={[full.col, full.cCitation]}>{row.citationAsWritten ?? "—"}</Text>
          <Text style={[full.col, full.cCanonical]}>{row.canonicalAuthority ?? "—"}</Text>
          <Text style={[full.col, full.cSource]}>{row.sourceUsed ?? "—"}</Text>
          <Text style={[full.col, full.cQuote]}>{row.quoteMatch ?? "—"}</Text>
          <Text style={[full.col, full.cMeta]}>{row.metadataMatch ?? "—"}</Text>
          <Text style={[full.col, full.cReview]}>{row.reviewerDisposition}</Text>
          <Text style={[full.col, full.cTime]}>{row.timestamp}</Text>
        </View>
      ))}
    </View>
  );
}

export function FullReportPdf({ data }: { data: ReportData }) {
  return (
    <Document
      title={`${BRAND.artifactSummary} — ${data.identification.filingTitle}`}
    >
      <Page key="main" size="LETTER" style={shared.page}>
        <Text style={full.exhibitSubtitle}>EXHIBIT A</Text>
        <Text style={full.exhibitTitle}>AI Use and Verification Summary</Text>
        <View style={full.hr} />

        <Identification data={data} />

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Purpose</Text>
          <Text style={shared.body}>{data.purpose}</Text>
        </View>

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Verification Scope</Text>
          <Text style={[shared.body, { marginBottom: 6 }]}>
            The following checks were run on the identified version of the filing:
          </Text>
          {data.verificationScope.map((item, i) => (
            <View key={i} style={full.scopeItem}>
              <Text style={full.scopeNum}>{i + 1}.</Text>
              <Text style={full.scopeLabel}>
                {item.label}{" "}
                <Text style={full.scopeStatus}>
                  {item.status === "not_enabled" ? "[if enabled — not enabled]" : ""}
                </Text>
              </Text>
            </View>
          ))}
        </View>

        <SummaryOfResults data={data} />

        <AttorneyAcknowledgment data={data} />

        <ExceptionsRemaining data={data} />

        <View style={shared.section}>
          <Text style={shared.sectionTitle}>Limitations</Text>
          {data.limitations.map((lim, i) => (
            <Text key={i} style={full.limitation}>
              • {lim}
            </Text>
          ))}
          <Text style={full.limitation}>
            • This exhibit confirms only that the listed verification steps were
            run on the identified document version. It does not certify legal
            merit, strategic soundness, completeness of the record, or likelihood
            of success.
          </Text>
        </View>

        <Text style={shared.footer} fixed>
          Generated by {BRAND.product}
          {data.verificationId
            ? ` — ${publicVerificationUrl(data.verificationId)}`
            : ""}
          {"\n"}Page {"$page"} of {"$pages"}
        </Text>
      </Page>

      {data.appendix && data.appendix.length > 0 && (
        <Page key="appendix" size="LETTER" orientation="landscape" style={shared.page}>
          <AppendixA data={data} />
          <Text style={shared.footer} fixed>
            {BRAND.product} — Appendix A — Page {"$page"} of {"$pages"}
          </Text>
        </Page>
      )}
    </Document>
  );
}
