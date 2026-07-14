import Link from "next/link";
import { buildSampleReportData } from "@/lib/sample-report";
import { BRAND } from "@/lib/brand";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { RiskBadge, ResultBadge } from "@/components/status-badge";
import {
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Public, static sample report. No auth, no database reads. Shows a realistic
 * preview of what a BaddieLegal verification report looks like so landing-page
 * visitors can evaluate the output before signing up.
 */
export default function SampleReportPage() {
  const data = buildSampleReportData();

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />

      <header className="relative z-content mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5 lg:px-0">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <Button size="default" nativeButton={false} render={<Link href="/sign-up" />}>
          Try it free
        </Button>
      </header>

      <main className="relative z-content mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 pb-24 lg:px-0">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Sample report</AlertTitle>
          <AlertDescription>
            This is an illustrative example with fictional data. It shows what a BaddieLegal
            verification report looks like once a filing has been checked.
          </AlertDescription>
        </Alert>

        <PageHeader
          title="AI Use & Verification Summary"
          description={data.filename}
        >
          {data.riskBand && <RiskBadge value={data.riskBand} />}
        </PageHeader>

        {/* Identification block */}
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
            <CardDescription>EXHIBIT A — AI Use and Verification Summary</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <DetailRow label="Case No." value={data.identification.caseNumber} />
              <DetailRow label="Filing Title" value={data.identification.filingTitle} />
              <DetailRow label="Reviewed Version Date/Time" value={data.identification.reviewedVersionAt} />
              <DetailRow label="Verification Run ID" value={data.identification.runId} mono />
              <DetailRow label="Document Hash (SHA-256)" value={data.identification.documentHash} mono />
              <DetailRow label="AI Tool(s) Disclosed" value={data.identification.aiToolsDisclosed} />
              <DetailRow label="Verification Vendor / System" value={data.identification.verificationVendor} />
            </dl>
          </CardContent>
        </Card>

        {/* Purpose */}
        <Card>
          <CardHeader>
            <CardTitle>Purpose</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.purpose}</p>
          </CardContent>
        </Card>

        {/* Verification Scope */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Scope</CardTitle>
            <CardDescription>
              The following checks were run on the identified version of the filing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {data.verificationScope.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="font-semibold tabular-nums">{i + 1}.</span>
                  <span className="flex-1">{item.label}</span>
                  {item.status === "not_enabled" && (
                    <span className="text-xs italic text-muted-foreground">(not run)</span>
                  )}
                </li>
              ))}
            </ol>
            {/* Source attribution — PRODUCT.md says citations verify against
                real case law; naming the sources is a high-value trust signal
                for a viewer who has never used the product. */}
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Citations checked against CourtListener and gov.uscourts sources.
            </p>
          </CardContent>
        </Card>

        {/* Summary of Results */}
        <Card>
          <CardHeader>
            <CardTitle>Summary of Results</CardTitle>
            {/* Status legend — color alone is a deuteranopia hazard. One
                compact line keys the tones used in counts + badges below. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-success" />
                Verified
              </span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-warning" />
                Needs attention
              </span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1">
                <XCircle className="size-3.5 text-destructive" />
                Doesn&apos;t check out
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <CountRow label="Authorities extracted" value={data.summary.authoritiesExtracted} />
              <CountRow label="Authorities verified" value={data.summary.authoritiesVerified} tone="success" />
              <CountRow label="Authorities unresolved at first pass" value={data.summary.authoritiesUnresolved} tone="warning" />
              <CountRow label="Quotations checked" value={data.summary.quotationsChecked} />
              <CountRow label="Quotations matched" value={data.summary.quotationsMatched} tone="success" />
              <CountRow
                label="Record citations checked"
                value={data.summary.recordCitationsChecked === null ? "N/A — not enabled" : data.summary.recordCitationsChecked}
              />
              <CountRow
                label="Record citations unresolved"
                value={data.summary.recordCitationsUnresolved === null ? "N/A — not enabled" : data.summary.recordCitationsUnresolved}
                tone={data.summary.recordCitationsUnresolved ? "warning" : undefined}
              />
              <CountRow label="Exceptions remaining at final review" value={data.summary.exceptionsRemaining} tone={data.summary.exceptionsRemaining ? "destructive" : undefined} />
            </div>
            <Alert className="mt-4">
              <AlertTitle>Final workflow status</AlertTitle>
              <AlertDescription className="font-semibold">
                {data.summary.finalStatus}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Filing Block */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Filing Block</CardTitle>
                <CardDescription>
                  Paste this certification text into your filing. Source: {data.filingBlockSource}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {data.filingBlock.certificationText}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{data.filingBlock.placementNote}</p>
          </CardContent>
        </Card>

        {/* Attorney Acknowledgment */}
        <Card>
          <CardHeader>
            <CardTitle>Attorney Acknowledgment</CardTitle>
            <CardDescription>For counsel review. This section does not constitute legal advice.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The undersigned reviewed this summary and the underlying verification results for the
              identified filing version. Any unresolved items remaining at the time of filing are
              expressly identified below or in the filing itself.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <p>Dated: {data.signature.datedLabel}</p>
              </div>
              <div>
                <p>____________________________________</p>
                <p>{data.signature.attorneyName}</p>
                <p>{data.signature.barNumber}</p>
                <p>{data.signature.lawFirm}</p>
                <p>Counsel for {data.signature.party}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exceptions Remaining at Filing */}
        <Card>
          <CardHeader>
            <CardTitle>Exceptions Remaining at Filing ({data.exceptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.exceptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">None.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.exceptions.map((exc, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <span className="mt-0.5 font-mono text-xs text-muted-foreground">{idx + 1}.</span>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <ResultBadge value={exc.result} />
                        <span className="text-xs text-muted-foreground">{exc.checkType}</span>
                      </div>
                      {exc.citationText && (
                        <p className="font-mono text-sm">{exc.citationText}</p>
                      )}
                      {exc.detail && (
                        <p className="text-xs text-muted-foreground">{exc.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limitations */}
        <Card>
          <CardHeader>
            <CardTitle>Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {data.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-xs">•</span>
                  <span>{lim}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="mt-1 text-xs">•</span>
                <span>
                  This exhibit confirms only that the listed verification steps were run on the
                  identified document version. It does not certify legal merit, strategic soundness,
                  completeness of the record, or likelihood of success.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Appendix A — itemized findings */}
        {data.appendix && data.appendix.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Appendix A — Itemized Findings ({data.appendix.length})</CardTitle>
              <CardDescription>
                Per-finding detail. Not filed with the court unless required in a dispute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Stacked cards on phones — the 8-column table forces horizontal
                  scroll on a 360px viewport, which PRODUCT.md forbids for any
                  report view. Drop Reviewer + Timestamp (low value on mobile)
                  and render one finding per card; reserve the table for sm: up. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {data.appendix.map((row, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {row.paragraph && <span className="font-mono">{row.paragraph}</span>}
                      {row.sourceUsed && <span>{row.sourceUsed}</span>}
                      <span className="font-mono">{row.timestamp}</span>
                    </div>
                    {row.citationAsWritten && (
                      <p className="mt-2 break-words font-mono text-sm">{row.citationAsWritten}</p>
                    )}
                    {row.canonicalAuthority && (
                      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{row.canonicalAuthority}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {row.quoteMatch && (
                        <span>Quote: <span className="text-foreground">{row.quoteMatch}</span></span>
                      )}
                      {row.metadataMatch && (
                        <span>Metadata: <span className="text-foreground">{row.metadataMatch}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>¶ / Page</TableHead>
                      <TableHead>Citation as written</TableHead>
                      <TableHead>Canonical authority resolved</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Quote</TableHead>
                      <TableHead>Metadata</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.appendix.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{row.paragraph ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.citationAsWritten ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.canonicalAuthority ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.sourceUsed ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.quoteMatch ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.metadataMatch ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.reviewerDisposition}</TableCell>
                        <TableCell className="font-mono text-xs">{row.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-lg font-semibold text-foreground">
              Run this check on your own filing
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Upload a DOCX or PDF. {BRAND.company} checks citations, quotes, and AI-use disclosure,
              then gives you a report like the one above.
            </p>
            <Button size="lg" nativeButton={false} render={<Link href="/sign-up" />}>
              Get Started Free
            </Button>
            <p className="text-xs text-muted-foreground">
              Not a law firm. Not legal advice. You stay responsible for the filing.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function CountRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}
