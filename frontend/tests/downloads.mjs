import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openApp, fixtureJob } from "./helpers.mjs";
const { browser, page } = await openApp();
await fixtureJob(page);
const counts = {
  "Clean list": 122,
  "Valid emails": 121,
  "Corrected emails": 1,
  "Removed emails": 2,
  "Review emails": 1,
  "Full report": 125,
};
for (const [name, count] of Object.entries(counts)) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download " + name + " as CSV", exact: true })
    .click();
  const download = await pending;
  const text = readFileSync(await download.path(), "utf8")
    .replace(/^\uFEFF/, "")
    .trim();
  assert.equal(text.split(/\r?\n/).length, count + 1);
  if (name === "Clean list") {
    const emails = text.split(/\r?\n/).slice(1);
    assert.equal(new Set(emails).size, 122);
    assert(emails.includes("info@hoamco.com"));
    assert(!text.includes("204@3x.png") && !text.includes("2067@"));
  }
}
await page.getByLabel("File format", { exact: true }).selectOption("xlsx");
const pending = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Download Full report as XLSX", exact: true })
  .click();
const file = await pending;
assert.equal(
  readFileSync(await file.path())
    .subarray(0, 2)
    .toString(),
  "PK",
);
const clean = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Download clean list", exact: true })
  .click();
assert.match((await clean).suggestedFilename(), /clean.*\.csv/);
await browser.close();
console.log(
  "PASS: six CSV downloads match counts; clean is unique and excludes removed/review; XLSX and primary clean CTA work.",
);
