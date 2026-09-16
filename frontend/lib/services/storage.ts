import { openDB, type DBSchema } from "idb";
import type { Job, ResultRecord } from "../types";
import type { ParsedFile } from "../engine/files";
import { defaultOptions, type CleaningOptions } from "../cleaning-options";

export interface Preferences {
  options: CleaningOptions;
  format: "csv" | "xlsx";
}
interface BrowserDB extends DBSchema {
  jobs: { key: string; value: Job };
  inputs: { key: string; value: string[][] };
  results: {
    key: [string, number];
    value: { jobId: string; batch: number; records: ResultRecord[] };
  };
  preferences: { key: string; value: Preferences };
}
let connection: ReturnType<typeof openDB<BrowserDB>> | undefined;
export function database() {
  return (connection ??= openDB<BrowserDB>("veriforge-browser", 1, {
    upgrade(db) {
      db.createObjectStore("jobs", { keyPath: "id" });
      db.createObjectStore("inputs");
      db.createObjectStore("results", { keyPath: ["jobId", "batch"] });
      db.createObjectStore("preferences");
    },
    blocking() {
      void connection?.then((db) => db.close());
      connection = undefined;
    },
    terminated() {
      connection = undefined;
    },
  }));
}
export const resultRange = (id: string) =>
  IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
export async function createJob(parsed: ParsedFile): Promise<Job> {
  const now = Date.now() / 1000;
  const job: Job = {
    id: crypto.randomUUID(),
    filename: parsed.metadata.filename,
    created_at: now,
    updated_at: now,
    state: "ready",
    stage: "Ready to clean",
    processed: 0,
    total: parsed.rows.length,
    counts: {},
    summary: null,
    error: null,
    options: null,
    metadata: parsed.metadata,
  };
  await navigator.locks.request(
    "veriforge-data",
    { mode: "shared" },
    async () => {
      const db = await database();
      const tx = db.transaction(["jobs", "inputs"], "readwrite");
      void tx.done.catch(() => {}); // Consume abort rejection even if an individual request fails first.
      await Promise.all([
        tx.objectStore("jobs").put(job),
        tx.objectStore("inputs").put(parsed.rows, job.id),
      ]);
      await tx.done;
    },
  );
  return job;
}
export async function getJob(id: string): Promise<Job> {
  const job = await (await database()).get("jobs", id);
  if (!job)
    throw new Error(
      "This clean is not stored in this browser. Open it on the original device or start a new clean.",
    );
  return job;
}
export async function failJob(id: string, message: string) {
  const db = await database();
  const tx = db.transaction(["jobs", "inputs", "results"], "readwrite");
  void tx.done.catch(() => {}); // Consume abort rejection even if an individual request fails first.
  const job = await tx.objectStore("jobs").get(id);
  if (job && job.state !== "complete") {
    job.state = "failed";
    job.stage = "Stopped";
    job.error = message;
    job.updated_at = Date.now() / 1000;
    await tx.objectStore("jobs").put(job);
    await tx.objectStore("inputs").delete(id);
    await tx.objectStore("results").delete(resultRange(id));
  }
  await tx.done;
}
export async function getPreferences(): Promise<Preferences> {
  return (
    (await (await database()).get("preferences", "defaults")) ?? {
      options: { ...defaultOptions },
      format: "csv",
    }
  );
}
export async function savePreferences(preferences: Preferences) {
  await (await database()).put("preferences", preferences, "defaults");
}
export async function clearLocalData() {
  await navigator.locks.request(
    "veriforge-data",
    { ifAvailable: true },
    async (lock) => {
      if (!lock)
        throw new Error(
          "Finish or cancel active cleans before clearing local data.",
        );
      const db = await database();
      const tx = db.transaction(
        ["jobs", "inputs", "results", "preferences"],
        "readwrite",
      );
      void tx.done.catch(() => {}); // Consume abort rejection even if an individual request fails first.
      await Promise.all(
        (["jobs", "inputs", "results", "preferences"] as const).map((name) =>
          tx.objectStore(name).clear(),
        ),
      );
      await tx.done;
    },
  );
}
