import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const wh = new Webhook(webhookSecret);
  let evt: Record<string, unknown>;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type as string;
  const data = evt.data as Record<string, unknown>;

  if (
    eventType === "organization.created" ||
    eventType === "organization.updated"
  ) {
    const clerkOrgId = data.id as string;
    const name = (data.name as string) ?? "";

    await prisma.organization.upsert({
      where: { clerkOrgId },
      create: { clerkOrgId, name },
      update: { name },
    });
  }

  return NextResponse.json({ received: true });
}
