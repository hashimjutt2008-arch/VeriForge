import assert from "node:assert/strict";
import { openApp, fixtureJob } from "./helpers.mjs";
const { browser, page } = await openApp();
await fixtureJob(page);
assert.match(await page.getByTestId("clean-count").textContent(), /122/);
await page.getByRole("tab", { name: /^Corrected/ }).click();
await page
  .getByRole("button", { name: "Inspect record 1", exact: true })
  .waitFor();
await page
  .getByRole("button", { name: "Inspect record 1", exact: true })
  .click();
await page.getByRole("dialog").waitFor();
assert.match(
  await page.getByRole("dialog").innerText(),
  /928-776-0050info@hoamco.com/,
);
assert.match(
  await page.getByRole("dialog").innerText(),
  /Removed phone prefix/,
);
await page.getByRole("button", { name: "Close record details" }).click();
await page.getByRole("tab", { name: /^Removed/ }).click();
await page
  .getByRole("button", { name: "Inspect record 2", exact: true })
  .waitFor();
await page.getByRole("tab", { name: /^Review/ }).click();
await page
  .getByRole("button", { name: "Inspect record 4", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByLabel("Search emails").fill("hoamco");
await page.getByText("Showing 1–1 of 1 records", { exact: true }).waitFor();
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByLabel("Category filter").selectOption("DUPLICATE");
await page
  .getByRole("button", { name: "Inspect record 5", exact: true })
  .waitFor();
await page.getByText("Showing 1–1 of 1 records", { exact: true }).waitFor();
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByLabel("Domain filter").fill("gmail.com");
await page.getByText("Showing 1–50 of 120 records", { exact: true }).waitFor();
await page.getByRole("button", { name: "Next page", exact: true }).click();
await page
  .getByText("Showing 51–100 of 120 records", { exact: true })
  .waitFor();
assert.equal(await page.locator(".results-table tbody tr").count(), 50);
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByText("Showing 1–50 of 125 records", { exact: true }).waitFor();
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({
  path: "../.runtime/results-desktop.png",
  caret: "initial",
});
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({
  path: "../.runtime/results-mobile.png",
  caret: "initial",
});
await browser.close();
console.log(
  "PASS: totals, all status tabs, original/correction audit, search, reason/domain filtering, pagination and mobile overflow.",
);
