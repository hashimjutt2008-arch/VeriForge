import assert from "node:assert/strict";
import { openApp, fixtureJob } from "./helpers.mjs";
const { browser, page } = await openApp();
await fixtureJob(page);
const health = page.getByRole("region", { name: "Your list, before & after" });
await health.waitFor();
assert.match(await health.innerText(), /125/);
assert.match(await health.innerText(), /122/);
assert.match(
  await health.getByRole("row").filter({ hasText: "Duplicates" }).innerText(),
  /1\s+0/,
);
assert.match(
  await health
    .getByRole("row")
    .filter({ hasText: "Asset strings" })
    .innerText(),
  /1\s+0/,
);
assert.match(
  await health
    .getByRole("row")
    .filter({ hasText: "Correctable records" })
    .innerText(),
  /1\s+1 repaired/,
);
await browser.close();
console.log(
  "PASS: list-health visualization reflects the actual before/after and category counts.",
);
