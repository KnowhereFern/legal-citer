import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function GET() {
  const { orgId: clerkOrgId } = await getAuthContext();

  if (!clerkOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const reports = await prisma.report.findMany({
    where: {
      run: { orgId: org.id },
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
