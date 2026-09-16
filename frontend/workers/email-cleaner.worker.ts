import { createCleaner, emptySummary, accumulate } from "../lib/engine/cleaner";
import { database, getJob } from "../lib/services/storage";
import { errorMessage } from "../lib/errors";
import type {
  CleaningOptions,
  ProcessingProgress,
} from "../lib/services/contracts";
export type CleanerRequest =
  | {
      type: "START_PROCESSING";
      jobId: string;
      emails: string[];
      cleaningOptions: CleaningOptions;
    }
  | { type: "CANCEL_PROCESSING"; jobId: string };
export type CleanerResponse =
  | { type: "PROGRESS"; progress: ProcessingProgress }
  | { type: "COMPLETE"; jobId: string }
  | { type: "ERROR"; jobId: string; error: string };
let cancelled = false;
const send = (message: CleanerResponse) => self.postMessage(message);
self.onmessage = async (event: MessageEvent<CleanerRequest>) => {
  if (event.data.type === "CANCEL_PROCESSING") {
    cancelled = true;
    return;
  }
  const { jobId, emails, cleaningOptions } = event.data;
  try {
    const clean = createCleaner(cleaningOptions),
      summary = emptySummary(),
      db = await database();
    const job = await getJob(jobId);
    const progress = () =>
      send({
        type: "PROGRESS",
        progress: {
          jobId,
          processedRows: summary.total,
          totalRows: emails.length,
          percent: Math.floor(
            (summary.total / Math.max(1, emails.length)) * 100,
          ),
          currentStage: job.stage,
          validCount: summary.VALID,
          correctedCount: summary.CORRECTED,
          removedCount: summary.REMOVED,
          reviewCount: summary.REVIEW,
        },
      });
    progress();
    for (let offset = 0; offset < emails.length; offset += 500) {
      if (cancelled)
        throw new Error(
          "Cleaning cancelled. Start a new clean when you are ready.",
        );
      const records = emails.slice(offset, offset + 500).map((value) => {
        const record = clean(value);
        accumulate(summary, record);
        return record;
      });
      job.processed = summary.total;
      job.counts = {
        VALID: summary.VALID,
        CORRECTED: summary.CORRECTED,
        REMOVED: summary.REMOVED,
        REVIEW: summary.REVIEW,
      };
      job.updated_at = Date.now() / 1000;
      job.stage = "Cleaning and saving local results";
      const tx = db.transaction(["results", "jobs"], "readwrite");
      void tx.done.catch(() => {}); // Consume abort rejection even if an individual request fails first.
      await tx
        .objectStore("results")
        .put({ jobId, batch: offset / 500, records });
      await tx.objectStore("jobs").put(job);
      await tx.done;
      progress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (cancelled)
      throw new Error(
        "Cleaning cancelled. Start a new clean when you are ready.",
      );
    job.summary = summary;
    job.state = "complete";
    job.stage = "Complete";
    job.updated_at = Date.now() / 1000;
    const tx = db.transaction(["jobs", "inputs"], "readwrite");
    void tx.done.catch(() => {}); // Consume abort rejection even if an individual request fails first.
    await tx.objectStore("jobs").put(job);
    await tx.objectStore("inputs").delete(jobId);
    await tx.done;
    send({ type: "COMPLETE", jobId });
  } catch (error) {
    send({ type: "ERROR", jobId, error: errorMessage(error) });
  }
};
