import type { HistoryService } from "./contracts";
import { database } from "./storage";
import { processingService } from "./processing-service";
export const historyService: HistoryService = {
  async list() {
    const jobs = await (await database()).getAll("jobs");
    const items = await Promise.all(
      jobs.map((job) =>
        job.state === "processing" ? processingService.get(job.id) : job,
      ),
    );
    items.sort((a, b) => b.created_at - a.created_at);
    return { items, total: items.length };
  },
};
