import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openApp, base } from "./helpers.mjs";
const { browser, page } = await openApp();
const consoleErrors = [];
const externalRequests = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("request", (request) => {
  if (!request.url().startsWith(base) && !request.url().startsWith("data:"))
    externalRequests.push(request.url());
});
const counts = {
  "Clean list": 10,
  "Valid emails": 7,
  "Corrected emails": 3,
  "Removed emails": 5,
  "Review emails": 1,
  "Full report": 16,
};
for (const format of ["csv", "txt", "xlsx"]) {
  await page.goto(base + "/new");
  await page
    .getByLabel("Upload email list")
    .setInputFiles(resolve("../tests/fixtures/acceptance." + format));
  await page.getByText("16 rows detected", { exact: false }).waitFor();
  await page
    .getByLabel("Email column", { exact: true })
    .selectOption(format === "txt" ? "0" : "1");
  await page.getByLabel("Custom company-domain limit").fill("2");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByTestId("clean-count").waitFor();
  assert.match(await page.getByTestId("clean-count").textContent(), /10/);
  await page.getByRole("tab", { name: /^Corrected/ }).click();
  await page
    .getByRole("button", { name: "Inspect record 2", exact: true })
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
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /^Removed/ }).click();
  await page
    .getByRole("button", { name: "Inspect record 8", exact: true })
    .click();
  assert.match(
    await page.getByRole("dialog").innerText(),
    /Company domain exceeds limit of 2/,
  );
  await page.getByRole("button", { name: "Close record details" }).click();
  await page.getByRole("tab", { name: /^Review/ }).click();
  await page
    .getByRole("button", { name: "Inspect record 4", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Reset filters" }).click();
  for (const [label, count] of Object.entries(counts)) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Download " + label + " as CSV",
        exact: true,
      })
      .click();
    const file = await pending;
    const content = readFileSync(await file.path(), "utf8")
      .replace(/^\uFEFF/, "")
      .trim();
    const lines = content.split(/\r?\n/);
    assert.equal(lines.length, count + 1);
    if (label === "Clean list") {
      const emails = lines.slice(1);
      assert.equal(new Set(emails).size, 10);
      for (const email of [
        "info@hoamco.com",
        "info@anticus.com",
        "acquisitions@grossmancompany.com",
        "acquisitions@grossmancompany.co",
        "karen@retsy.com",
        "chris@retsy.com",
        "person-three@gmail.com",
      ])
        assert(emails.includes(email));
      for (const email of [
        "204@3x.png",
        "2067@scottsdaleshadows.com",
        "shawna@retsy.com",
        "lara@retsy.com",
      ])
        assert(!emails.includes(email));
    }
  }
  await page.getByLabel("File format", { exact: true }).selectOption("xlsx");
  for (const label of Object.keys(counts)) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Download " + label + " as XLSX",
        exact: true,
      })
      .click();
    assert.equal(
      readFileSync(await (await pending).path())
        .subarray(0, 2)
        .toString(),
      "PK",
    );
  }
  console.log(
    "PASS: " +
      format.toUpperCase() +
      " upload → column/settings → process → inspect statuses → six CSV and six XLSX downloads.",
  );
}
await page.getByRole("link", { name: "History", exact: true }).click();
await page.getByRole("heading", { name: "Cleaning history" }).waitFor();
await page.getByLabel("Search history").fill("acceptance.xlsx");
await page
  .getByRole("link", { name: "Open acceptance.xlsx", exact: true })
  .first()
  .click();
await page.getByTestId("clean-count").waitFor();
await page.getByRole("tab", { name: /^All results/ }).click();
await page.getByText("Showing 1–16 of 16 records", { exact: true }).waitFor();
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({
  path: "../.runtime/release-desktop.png",
  caret: "initial",
});
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({
  path: "../.runtime/release-mobile.png",
  caret: "initial",
});
await page.emulateMedia({ reducedMotion: "reduce" });
await page.getByRole("button", { name: "Open navigation" }).click();
await page.getByRole("link", { name: "History", exact: true }).click();
await page.getByRole("heading", { name: "Cleaning history" }).waitFor();
await page.reload();
await page.getByRole("heading", { name: "Cleaning history" }).waitFor();
assert.equal((await page.context().cookies()).length, 0);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(externalRequests, []);
await browser.close();
console.log(
  "PASS: history reopen, desktop/mobile layout, account-free access, no browser errors and no external data requests.",
);
