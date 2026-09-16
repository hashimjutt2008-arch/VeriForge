import type { FileService } from "./contracts";
import { notify } from "./events";
import type { Job } from "../types";
import { database } from "./storage";
export const fileService: FileService = {
  async discard(id) {
    const db = await database();
    const tx = db.transaction(["jobs", "inputs"], "readwrite");
    void tx.done.catch(() => {});
    const job = await tx.objectStore("jobs").get(id);
    if (job?.state === "ready") {
      await tx.objectStore("jobs").delete(id);
      await tx.objectStore("inputs").delete(id);
    }
    await tx.done;
  },
  read(file, header) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("../../workers/file-reader.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (
        event: MessageEvent<{ job?: Job; error?: string }>,
      ) => {
        worker.terminate();
        if (event.data.job) {
          notify();
          resolve(event.data.job);
        } else reject(new Error(event.data.error));
      };
      worker.onerror = () => {
        worker.terminate();
        reject(
          new Error(
            "The local file reader could not start. Reload and try again.",
          ),
        );
      };
      worker.postMessage({ file, header });
    });
  },
  paste(text) {
    return this.read(
      new File([text], "Pasted emails.txt", { type: "text/plain" }),
      false,
    );
  },
};
