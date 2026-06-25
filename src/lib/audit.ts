import { prisma } from "@/lib/db";

interface LogAuditEventParams {
  orgId: string;
  eventType: string;
  actorId?: string;
  subjectType?: string;
  subjectId?: string;
  detail?: Record<string, unknown>;
}

export async function logAuditEvent(params: LogAuditEventParams) {
  return prisma.auditEvent.create({
    data: {
      orgId: params.orgId,
      eventType: params.eventType,
      actorId: params.actorId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      detail: JSON.parse(JSON.stringify(params.detail)) as never,
    },
  });
}
