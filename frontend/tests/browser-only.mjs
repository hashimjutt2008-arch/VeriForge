import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";
import { base } from "./helpers.mjs";
await new Promise((resolveCheck, reject) => {
  const socket = net.connect(8000, "127.0.0.1");
  socket.once("connect", () => {
    socket.destroy();
    reject(new Error("Stop FastAPI on port 8000 before the browser-only test"));
  });
  socket.once("error", () => resolveCheck());
});
const browser = await chromium.launch({
  channel: process.env.VERIFORGE_TEST_BROWSER || "msedge",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const requests = [],
  errors = [];
context.on("request", (request) => {
  requests.push({
    url: request.url(),
    method: request.method(),
    body: request.postData() || "",
  });
});
await context.addInitScript(() => {
  window.__workerEvents = [];
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener("message", (event) => {
        if (event.data?.type)
          window.__workerEvents.push({
            type: event.data.type,
            progress: event.data.progress,
          });
      });
    }
    postMessage(message, ...rest) {
      if (message?.type) window.__workerEvents.push({ sent: message.type });
      return super.postMessage(message, ...rest);
    }
  };
});
context.setDefaultTimeout(30000);
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
async function localJob(id) {
  return page.evaluate(
    (id) =>
      new Promise((resolveJob, reject) => {
        const request = indexedDB.open("veriforge-browser", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("jobs");
          const get = tx.objectStore("jobs").get(id);
          get.onsuccess = () => resolveJob(get.result);
          tx.oncomplete = () => db.close();
        };
      }),
    id,
  );
}
async function paste(text) {
  await page.goto(base + "/new");
  await page.getByRole("tab", { name: "Paste emails" }).click();
  await page.getByLabel("One email address per line").fill(text);
  await page.getByRole("button", { name: "Use this list" }).click();
  await page.getByLabel("Email column", { exact: true }).selectOption("0");
}
async function largeFile(prefix) {
  await page.goto(base + "/new");
  await page.getByLabel("Upload email list").setInputFiles({
    name: prefix + ".txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      Array.from({ length: 100000 }, (_, i) => `${prefix}${i}@gmail.com`).join(
        "\n",
      ),
    ),
  });
  await page.getByLabel("Email column", { exact: true }).selectOption("0");
}

try {
  page.setDefaultTimeout(30000);
  await page.goto(base);
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("heading", { name: "Your lists, in good shape." })
    .waitFor();
  assert.equal(await page.getByLabel("Password", { exact: true }).count(), 0);
  assert.equal((await context.cookies()).length, 0);
  await page.goto(base + "/login");
  await page.waitForURL("**/dashboard");
  for (const path of ["/history", "/rules", "/exports", "/settings", "/help"]) {
    await page.goto(base + path);
    assert.equal(new URL(page.url()).pathname, path);
  }
  console.log("Checking browser preferences");
  await page.goto(base + "/settings");
  await page
    .getByRole("button", { name: "Save defaults", exact: true })
    .waitFor();
  await expect(
    page.getByRole("button", { name: "Save defaults", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Custom company-domain limit").fill("3");
  await page.getByLabel("Default export format").selectOption("xlsx");
  await page
    .getByRole("button", { name: "Save defaults", exact: true })
    .click();
  await page.getByText("Defaults saved for this browser.").waitFor();
  console.log("Checking local paste and persistence");
  await paste(
    "local-sentinel-938@corp.com\nb@corp.com\nc@corp.com\nd@corp.com\n1234@corp.com",
  );
  await expect(page.getByLabel("Custom company-domain limit")).toHaveValue("3");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByTestId("clean-count").waitFor();
  const id = page.url().split("/").at(-1);
  assert.match(id, /^[0-9a-f-]{36}$/);
  const job = await localJob(id);
  assert.equal(job.summary.clean, 3);
  assert.equal(job.summary.REVIEW, 1);
  assert.equal(job.summary.REMOVED, 1);
  await expect(page.getByLabel("File format", { exact: true })).toHaveValue(
    "xlsx",
  );
  assert(
    (await page.evaluate(() => window.__workerEvents)).some(
      (e) => e.sent === "START_PROCESSING",
    ),
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download clean list", exact: true })
    .click();
  assert(
    readFileSync(await (await download).path(), "utf8").includes(
      "local-sentinel-938@corp.com",
    ),
  );
  await page.reload();
  await page.getByTestId("clean-count").waitFor();
  assert.equal((await localJob(id)).summary.clean, 3);
  const second = await context.newPage();
  await second.goto(base + "/jobs/" + id);
  await second.getByTestId("clean-count").waitFor();
  await second.close();
  await page.goto(base + "/history");
  await page
    .getByRole("link", { name: "Open Pasted emails.txt", exact: true })
    .first()
    .click();
  await page.getByTestId("clean-count").waitFor();
  console.log("Checking selected-column parsing");
  // Change selected column, keeping every source-row position (including an empty email).
  await page.goto(base + "/new");
  await page.getByLabel("Upload email list").setInputFiles({
    name: "columns.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Name,Primary,Alternative\nA,wrong@x.com,first@gmail.com\nB,,second@gmail.com\nC,wrong@x.com,\n",
    ),
  });
  await page.getByLabel("Email column", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByTestId("clean-count").waitFor();
  assert.equal((await localJob(page.url().split("/").at(-1))).summary.clean, 2);
  console.log("Starting 100,000-row workflow");
  // A full-size list runs in a worker while the UI continues receiving animation frames.
  await largeFile("scale");
  await page.evaluate(() => {
    window.__frames = 0;
    const tick = () => {
      window.__frames++;
      window.__raf = requestAnimationFrame(tick);
    };
    tick();
  });
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByRole("progressbar").waitFor();
  await page.getByTestId("clean-count").waitFor({ timeout: 180000 });
  const bigId = page.url().split("/").at(-1),
    big = await localJob(bigId);
  assert.equal(big.summary.clean, 100000);
  assert((await page.evaluate(() => window.__frames)) > 5);
  const progress = await page.evaluate(() =>
    window.__workerEvents.filter((e) => e.type === "PROGRESS"),
  );
  assert(
    progress.some(
      (e) => e.progress.processedRows > 0 && e.progress.processedRows < 100000,
    ),
  );
  assert(
    progress.every(
      (e) =>
        e.progress.validCount +
          e.progress.correctedCount +
          e.progress.removedCount +
          e.progress.reviewCount ===
        e.progress.processedRows,
    ),
  );
  await page
    .getByText("Showing 1–50 of 100,000 records", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".results-table tbody tr").count(), 50);
  const largeExport = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download clean list", exact: true })
    .click();
  assert.equal(
    readFileSync(await (await largeExport).path(), "utf8")
      .trim()
      .split(/\r?\n/).length,
    100001,
  );
  console.log(
    "PASS: 100,000 rows, real worker progress, responsive UI, durable results and local export.",
  );
  await largeFile("cancel");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel cleaning", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "We couldn't finish this list" })
    .waitFor();
  assert.equal((await localJob(page.url().split("/").at(-1))).state, "failed");
  await largeFile("interrupt");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByRole("progressbar").waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "We couldn't finish this list" })
    .waitFor();
  await page.getByText(/Processing was interrupted/).waitFor();
  await page.goto(base + "/settings");
  await page
    .getByRole("button", { name: "Clear local data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete all local data", exact: true })
    .click();
  await page
    .getByText("Local history, results and preferences cleared.")
    .waitFor();
  await page.goto(base + "/history");
  await page.getByRole("heading", { name: "No cleans to show yet" }).waitFor();
  assert.equal((await context.cookies()).length, 0);
  assert.deepEqual(
    requests
      .filter((r) => !r.url.startsWith("edge://"))
      .filter(
        (r) =>
          !r.url.startsWith(base) ||
          r.method !== "GET" ||
          r.url.includes("/api/") ||
          r.body.includes("@") ||
          r.url.includes("local-sentinel") ||
          r.url.includes("%40"),
      ),
    [],
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: direct dashboard, no auth/cookies/backend/network data, preferences, paste, column selection, history reload/reopen, cancellation, interruption and clear data.",
  );
} catch (error) {
  console.error(String(error).slice(0, 2000));
  console.error(
    await page
      .locator("body")
      .innerText({ timeout: 3000 })
      .catch(() => "Page not responsive"),
  );
  await page
    .screenshot({
      path: resolve("../.runtime/browser-only-failure.png"),
      caret: "initial",
      timeout: 5000,
    })
    .catch(() => {});
  throw new Error(String(error).slice(0, 2000));
} finally {
  await browser.close();
}
