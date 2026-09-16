import { chromium } from "@playwright/test";
export const base = process.env.VERIFORGE_TEST_URL || "http://127.0.0.1:3000";
export async function openApp() {
  const browser = await chromium.launch({
    channel: process.env.VERIFORGE_TEST_BROWSER || "msedge",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(30000);
  await page.goto(base);
  await page.waitForURL("**/dashboard");
  return { browser, page };
}
export async function fixtureJob(page) {
  const emails = [
    "928-776-0050info@hoamco.com",
    "204@3x.png",
    "aaron@modernrenoaz.com",
    "2067@scottsdaleshadows.com",
    "aaron@modernrenoaz.com",
    ...Array.from({ length: 120 }, (_, i) => "person" + i + "@gmail.com"),
  ];
  await page.goto(base + "/new");
  await page.getByRole("tab", { name: "Paste emails" }).click();
  await page.getByLabel("One email address per line").fill(emails.join("\n"));
  await page.getByRole("button", { name: "Use this list" }).click();
  await page.getByLabel("Email column", { exact: true }).selectOption("0");
  await page
    .getByRole("button", { name: "Start cleaning", exact: true })
    .click();
  await page.getByTestId("clean-count").waitFor();
  return { id: page.url().split("/").at(-1) };
}
