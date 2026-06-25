import { expect, test } from "@playwright/test";
import path from "node:path";

test("uploads a document, processes it, and opens the generated report", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: "Upload & Verify" })
  ).toBeVisible();

  const fileName = "e2e-citation.docx";
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures", fileName));

  await expect(page.getByText(fileName).first()).toBeVisible();

  const uploadResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/documents") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Upload Document" }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.status()).toBe(201);

  await expect(
    page.getByRole("button", { name: "Start Verification" })
  ).toBeVisible();

  const runResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/runs") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Start Verification" }).click();
  const runResponse = await runResponsePromise;
  expect(runResponse.status()).toBe(201);

  await expect(page).toHaveURL(/\/runs\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Run Details" })).toBeVisible();
  await expect(page.getByText(fileName).first()).toBeVisible();
  await expect(page.getByText("completed").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("cell", { name: "hash_document" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "persist_results" })).toBeVisible();

  await page.getByRole("link", { name: "View Report" }).click();
  await expect(page).toHaveURL(/\/reports\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Verification Report" })
  ).toBeVisible();
  await expect(page.getByText(fileName).first()).toBeVisible();
  await expect(page.getByText("Risk Band")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
