import assert from "node:assert/strict";
import { openApp, fixtureJob } from "./helpers.mjs";
const { browser, page } = await openApp();
await fixtureJob(page);
await page
  .getByRole("button", { name: "Download clean list", exact: true })
  .hover();
assert.equal(
  await page
    .getByRole("button", { name: "Download clean list", exact: true })
    .evaluate((el) => getComputedStyle(el).transform),
  "none",
);
assert.match(await page.getByTestId("clean-count").textContent(), /122/);
await page.emulateMedia({ reducedMotion: "no-preference" });
await fixtureJob(page);
await page.waitForFunction(() =>
  document
    .querySelector('[data-testid="clean-count"]')
    ?.textContent.includes("122"),
);
await page.getByText("Showing 1–50 of 125 records", { exact: true }).waitFor();
assert.equal(await page.locator(".results-table tbody tr").count(), 50);
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({
  path: "../.runtime/polished-results.png",
  caret: "initial",
});
await browser.close();
console.log(
  "PASS: reduced-motion disables hover movement; animated counts settle correctly; table remains paginated.",
);
