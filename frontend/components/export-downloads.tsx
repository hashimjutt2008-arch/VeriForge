"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { Job } from "@/lib/types";
import {
  type ExportFormat,
  type ExportType as ExportKind,
} from "@/lib/services/contracts";
import { getPreferences } from "@/lib/services/storage";
import { number } from "@/lib/utils";
import { exportService } from "@/lib/services/export-service";
import { errorMessage } from "@/lib/errors";
import { Button } from "./ui/button";

export function CleanDownload({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="clean-download">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await exportService.download(id, "clean", "csv");
          } catch (error) {
            setError(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <Download size={17} />
        )}
        {busy ? "Preparing download…" : "Download clean list"}
      </Button>
      <span>CSV · Valid + corrected</span>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ExportDownloads({ job }: { job: Job }) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getPreferences()
      .then((p) => setFormat(p.format))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const s = job.summary!;
  const exports = [
    {
      kind: "clean" as const,
      label: "Clean list",
      count: s.clean,
      icon: CheckCircle2,
      detail: "Unique usable emails. Your final list.",
    },
    {
      kind: "valid" as const,
      label: "Valid emails",
      count: s.VALID,
      icon: CheckCircle2,
      detail: "Emails that passed without correction.",
    },
    {
      kind: "corrected" as const,
      label: "Corrected emails",
      count: s.CORRECTED,
      icon: Sparkles,
      detail: "Original, corrected email, and reason.",
    },
    {
      kind: "removed" as const,
      label: "Removed emails",
      count: s.REMOVED,
      icon: XCircle,
      detail: "Removed records and their reasons.",
    },
    {
      kind: "review" as const,
      label: "Review emails",
      count: s.REVIEW,
      icon: CircleHelp,
      detail: "Uncertain records for a closer look.",
    },
    {
      kind: "full" as const,
      label: "Full report",
      count: s.total,
      icon: FileSpreadsheet,
      detail: "Every record and its complete audit trail.",
    },
  ];
  async function download(kind: ExportKind) {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      await exportService.download(job.id, kind, format);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="exports-section" aria-labelledby="exports-heading">
      <div className="exports-heading">
        <div>
          <p className="eyebrow">TAKE THE NEXT STEP</p>
          <h2 id="exports-heading">Your list, your way.</h2>
          <p>Download exactly the records you need.</p>
        </div>
        <div className="format-control">
          <label htmlFor="export-format">File format</label>
          <select
            id="export-format"
            value={format}
            disabled={!!busy}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="export-grid">
        {exports.map(({ kind, label, count, icon: Icon, detail }) => (
          <article
            key={kind}
            className={
              "panel export-card " + (kind === "clean" ? "primary-export" : "")
            }
          >
            <div className="row">
              <span className="soft-icon">
                <Icon size={20} />
              </span>
              <span className="export-count">{number(count)} records</span>
            </div>
            <h3>{label}</h3>
            <p>{detail}</p>
            <Button
              variant={kind === "clean" ? "default" : "outline"}
              onClick={() => download(kind)}
              disabled={!!busy}
              aria-label={`Download ${label} as ${format.toUpperCase()}`}
            >
              {busy === kind ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <Download size={15} />
              )}
              Download {format.toUpperCase()}
            </Button>
          </article>
        ))}
      </div>
      <p className="export-note">
        CSV protects spreadsheet formula cells with a leading apostrophe. Choose
        XLSX to preserve those strings exactly.
      </p>
    </section>
  );
}
