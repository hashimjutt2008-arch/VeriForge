import type { ResultService } from "./contracts";
import { runReport } from "./report-worker";
export const resultService: ResultService = {
  page: (id, query, signal) =>
    runReport({ type: "PAGE", jobId: id, query }, signal),
};
