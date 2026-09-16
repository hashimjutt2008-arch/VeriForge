import type { ProcessingService } from "./contracts";
import type { CleanerResponse } from "../../workers/email-cleaner.worker";
import { database, getJob, failJob } from "./storage";
import { notify } from "./events";
import { errorMessage } from "../errors";
const workers = new Map<string, Worker>();
let control: BroadcastChannel | undefined;
function controls() {
  if (!control) {
    control = new BroadcastChannel("veriforge-worker-control");
    control.onmessage = (event: MessageEvent<{ cancel?: string }>) => {
      if (event.data.cancel)
        workers.get(event.data.cancel)?.postMessage({
          type: "CANCEL_PROCESSING",
          jobId: event.data.cancel,
        });
    };
  }
  return control;
}
export const processingService: ProcessingService & {
  cancel(id: string): void;
} = {
  async get(id) {
    let job = await getJob(id);
    if (job.state === "processing") {
      const locks = await navigator.locks.query();
      if (!locks.held?.some((lock) => lock.name === "veriforge-job-" + id)) {
        await failJob(
          id,
          "Processing was interrupted when the tab closed or reloaded. Start a new clean; completed history is kept.",
        );
        job = await getJob(id);
      }
    }
    return job;
  },
  start(id, column, options) {
    return new Promise((resolve, reject) => {
      void navigator.locks
        .request("veriforge-data", { mode: "shared" }, () =>
          navigator.locks.request(
            "veriforge-job-" + id,
            { ifAvailable: true },
            async (lock) => {
              if (!lock)
                throw new Error(
                  "This clean is already processing in another tab.",
                );
              const job = await getJob(id);
              if (job.state !== "ready")
                throw new Error(
                  "This clean has already started. Create a new clean to process again.",
                );
              if (
                !Number.isInteger(column) ||
                column < 0 ||
                column >= job.metadata.columns.length
              )
                throw new Error("Select an available email column");
              if (
                !Number.isInteger(options.company_domain_limit) ||
                options.company_domain_limit < 1 ||
                options.company_domain_limit > 100000
              )
                throw new Error(
                  "Choose a company-domain limit between 1 and 100,000.",
                );
              const db = await database();
              const rows = await db.get("inputs", id);
              if (!rows)
                throw new Error(
                  "The local source file is unavailable. Choose your file again.",
                );
              const worker = new Worker(
                new URL(
                  "../../workers/email-cleaner.worker.ts",
                  import.meta.url,
                ),
                { type: "module" },
              );
              workers.set(id, worker);
              controls();
              job.state = "processing";
              job.stage = "Starting local cleaner";
              job.options = options;
              job.updated_at = Date.now() / 1000;
              try {
                await db.put("jobs", job);
              } catch (error) {
                worker.terminate();
                workers.delete(id);
                throw error;
              }
              await new Promise<void>((done) => {
                const finish = () => {
                  worker.terminate();
                  workers.delete(id);
                  notify();
                  done();
                };
                const fail = async (message: string) => {
                  try {
                    await failJob(id, message);
                  } catch {
                    // A storage failure is surfaced by the next local read.
                  } finally {
                    finish();
                  }
                };
                worker.onmessage = (event: MessageEvent<CleanerResponse>) => {
                  if (event.data.type === "PROGRESS") notify();
                  else if (event.data.type === "COMPLETE") finish();
                  else void fail(event.data.error);
                };
                worker.onerror = () => {
                  void fail(
                    "The local cleaner stopped unexpectedly. Try a smaller list or reload the app.",
                  );
                };
                worker.postMessage({
                  type: "START_PROCESSING",
                  jobId: id,
                  emails: rows.map((row) => row[column] ?? ""),
                  cleaningOptions: options,
                });
                notify();
                resolve(job);
              });
            },
          ),
        )
        .catch((error) => reject(new Error(errorMessage(error))));
    });
  },
  cancel(id) {
    workers.get(id)?.postMessage({ type: "CANCEL_PROCESSING", jobId: id });
    controls().postMessage({ cancel: id });
  },
};
