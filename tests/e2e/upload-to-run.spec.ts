import { expect, test } from "@playwright/test";
import path from "node:path";

test("uploads a document, processes it, and opens the generated report", async ({
  page,
}) => {
  // Override the default 60s test timeout — the pipeline includes a 2s
  // rate-limit sleep per citation and calls multiple external APIs, so a
  // real run takes 30-120s. Give the test enough room to complete.
  test.setTimeout(240_000);
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
    page.getByRole("heading", { name: "Check your citations" })
  ).toBeVisible();

  const fileName = "e2e-citation.docx";
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures", fileName));

  await expect(page.getByText(fileName).first()).toBeVisible();

  // The upload page is now a single-step "Check my citations" flow: clicking
  // the button uploads the document AND enqueues the verification run, then
  // redirects to /runs/{id}. (Previously it was two steps — separate Upload
  // Document and Start Verification buttons — but the UX was consolidated.)
  // We wait for the run-enqueue response because that's the terminal action
  // before the redirect.
  const runResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/runs") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Check my citations" }).click();
  const runResponse = await runResponsePromise;
  expect(runResponse.status()).toBe(201);

  await expect(page).toHaveURL(/\/runs\/[^/]+$/);
  // The run page heading is dynamic: "Checking your document" while in
  // progress, "Document check" once done. Either way it contains the
  // document filename in the description. Wait for the terminal heading
  // ("Document check") which implies the run completed.
  // Wait for the run to complete. The pipeline calls multiple external
  // APIs (CourtListener, GovInfo) and includes a rate-limit sleep per
  // citation, so completion can take 60-120s in the e2e environment.
  await expect(
    page.getByRole("heading", { name: "Document check" })
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(fileName).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "hash_document" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "persist_results" })).toBeVisible();

  // The "View report" element is a Base UI Button wrapping a Next.js Link,
  // which exposes as role=button (not link).
  await page.getByRole("button", { name: "View report" }).click();
  await expect(page).toHaveURL(/\/reports\/[^/]+$/);

  // The report page defaults to the public exhibit preview. The full report
  // (with risk band, citation table, etc.) is at ?view=full.
  await page.goto(`${page.url()}?view=full`);
  await expect(
    page.getByRole("heading", { name: "Your citation report" })
  ).toBeVisible();
  await expect(page.getByText(fileName).first()).toBeVisible();
  // The full report shows a risk badge ("Low risk" / "High risk" / etc.)
  // and a "Citations found" count row. Assert on the latter as a stable
  // signal that the report rendered with its summary content.
  await expect(page.getByText("Citations found")).toBeVisible();

  expect(pageErrors).toEqual([]);
  // Filter out Base UI dev-only accessibility warnings (Button/nativeButton
  // SSR warnings) — these are pre-existing framework noise unrelated to the
  // upload→run→report flow, not real application errors.
  const realConsoleErrors = consoleErrors.filter(
    (msg) => !msg.includes("Base UI:")
  );
  expect(realConsoleErrors).toEqual([]);
});
