import { database, getJob, resultRange } from "../lib/services/storage";
import { createExport } from "../lib/engine/exports";
import { errorMessage } from "../lib/errors";
import type { ResultRecord } from "../lib/types";
import type { ExportType, ExportFormat } from "../lib/services/contracts";
type Request =
  | { type: "PAGE"; jobId: string; query: string }
  | { type: "EXPORT"; jobId: string; kind: ExportType; format: ExportFormat };
self.onmessage = async (event: MessageEvent<Request>) => {
  try {
    const request = event.data;
    const job = await getJob(request.jobId);
    if (job.state !== "complete")
      throw new Error("Results are available after the clean is complete.");
    const db = await database();
    const batches = await db.getAll("results", resultRange(request.jobId));
    if (request.type === "EXPORT") {
      self.postMessage({
        result: createExport(
          batches.flatMap((batch) => batch.records),
          request.kind,
          request.format,
        ),
      });
      return;
    }
    const query = new URLSearchParams(request.query),
      status = query.get("status"),
      category = query.get("category"),
      domain = query.get("domain"),
      search = (query.get("search") || "").toLowerCase();
    const offset = Math.max(0, Number(query.get("offset")) || 0),
      limit = Math.min(500, Math.max(1, Number(query.get("limit")) || 50));
    let total = 0;
    const items: ResultRecord[] = [];
    for (const batch of batches)
      for (const record of batch.records) {
        if (
          (status && record.status !== status) ||
          (category && record.category !== category) ||
          (domain && record.domain !== domain)
        )
          continue;
        if (
          search &&
          !record.original_email.toLowerCase().includes(search) &&
          !record.final_email.toLowerCase().includes(search)
        )
          continue;
        if (total >= offset && items.length < limit) items.push(record);
        total++;
      }
    self.postMessage({ result: { items, total, offset, limit } });
  } catch (error) {
    self.postMessage({ error: errorMessage(error) });
  }
};
