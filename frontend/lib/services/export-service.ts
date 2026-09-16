import type { ExportService } from "./contracts";
import { runReport } from "./report-worker";
export const exportService: ExportService = {
  async download(id, kind, format) {
    const blob = await runReport<Blob>({
      type: "EXPORT",
      jobId: id,
      kind,
      format,
    });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `veriforge-${kind}-${id.slice(0, 8)}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
