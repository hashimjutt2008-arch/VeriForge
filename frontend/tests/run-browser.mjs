import { spawnSync } from "node:child_process";
for (const name of [
  "browser-only",
  "release",
  "results",
  "health",
  "downloads",
  "motion",
]) {
  const result = spawnSync(process.execPath, [`tests/${name}.mjs`], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
