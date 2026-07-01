import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

export async function GET() {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = workspace;

  const reports = await prisma.report.findMany({
    where: {
      run: { orgId },
    },
    orderBy: { createdAt: "desc" },
    include: {
      run: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          document: { select: { id: true, filename: true } },
        },
      },
    },
  });

  return NextResponse.json(reports);
}
