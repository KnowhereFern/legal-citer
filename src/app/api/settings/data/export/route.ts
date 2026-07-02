import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";
import { dataExportFormatSchema } from "@/lib/constants";

export async function GET(request: Request) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgId } = workspace;

  const url = new URL(request.url);
  const formatParam = url.searchParams.get("format") ?? "csv";
  const parsed = dataExportFormatSchema.safeParse(formatParam);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "format must be 'csv' or 'json'" },
      { status: 400 }
    );
  }
  const format = parsed.data;

  const reports = await prisma.report.findMany({
    where: { run: { orgId } },
    include: { run: { include: { document: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = reports.map((r) => ({
    reportId: r.id,
    runId: r.runId,
    status: r.status,
    riskBand: r.riskBand ?? "",
    coveragePct: r.coveragePct ?? "",
    citationCount: r.citationCount ?? "",
    quoteIssues: r.quoteIssues ?? "",
    unresolvedItems: r.unresolvedItems ?? "",
    documentFilename: r.run.document?.filename ?? "",
    documentHash: r.documentHash ?? "",
    generatedAt: r.generatedAt?.toISOString() ?? "",
    createdAt: r.createdAt.toISOString(),
  }));

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="baddielegal-reports-${Date.now()}.json"`,
      },
    });
  }

  // CSV
  const headers = Object.keys(rows[0] ?? { notice: "" });
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="baddielegal-reports-${Date.now()}.csv"`,
    },
  });
}
