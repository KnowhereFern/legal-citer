import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as nextEnv from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());

const authFile = path.join(process.cwd(), "playwright/.clerk/user.json");

setup.describe.configure({ mode: "serial" });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for deployed E2E tests.`);
  }

  return value;
}

async function ensureTestOrganization() {
  const clerkOrgId = requiredEnv("E2E_CLERK_ORG_ID");
  const prisma = new PrismaClient();

  try {
    await prisma.organization.upsert({
      where: { clerkOrgId },
      update: {
        name: process.env.E2E_CLERK_ORG_NAME ?? "Legal Citer E2E",
      },
      create: {
        clerkOrgId,
        name: process.env.E2E_CLERK_ORG_NAME ?? "Legal Citer E2E",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

setup("configure Clerk testing", async () => {
  await clerkSetup();
  await ensureTestOrganization();
  await fs.mkdir(path.dirname(authFile), { recursive: true });
});

setup("authenticate Clerk test user", async ({ page }) => {
  const emailAddress = requiredEnv("E2E_CLERK_USER_EMAIL");
  const organizationId = requiredEnv("E2E_CLERK_ORG_ID");

  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await page.evaluate(async (activeOrganizationId) => {
    await window.Clerk.setActive({ organization: activeOrganizationId });
  }, organizationId);

  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: "Upload & Verify" })
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
