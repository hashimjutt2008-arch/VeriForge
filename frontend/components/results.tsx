"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  ListFilter,
  Plus,
  Search,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { CleanDownload, ExportDownloads } from "./export-downloads";
import { ListHealth } from "./list-health";
import { PageHeading } from "./page-heading";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useResults } from "@/lib/use-results";
import { number } from "@/lib/utils";
import type { Job, ResultRecord, Status } from "@/lib/types";

const statusNames: Record<Status, string> = {
  VALID: "Valid",
  CORRECTED: "Corrected",
  REMOVED: "Removed",
  REVIEW: "Review",
};
export function categoryLabel(category: string) {
  return category
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
}
export function StatusBadge({ status }: { status: Status }) {
  const Icon =
    status === "VALID"
      ? Check
      : status === "CORRECTED"
        ? Sparkles
        : status === "REMOVED"
          ? X
          : CircleHelp;
  return (
    <span className={"status-badge " + status.toLowerCase()}>
      <Icon size={12} />
      {statusNames[status]}
    </span>
  );
}
export function Results({ job }: { job: Job }) {
  const summary = job.summary!;
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [domain, setDomain] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<ResultRecord | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const query = new URLSearchParams({
    status,
    category,
    domain: domain.trim().toLowerCase(),
    search,
    offset: String(offset),
    limit: "50",
  }).toString();
  const { page, error, loading } = useResults(job.id, query);
  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setOffset(0);
  };
  function inspect(record: ResultRecord) {
    setSelected(record);
    dialog.current?.showModal();
  }
  return (
    <>
      <PageHeading
        eyebrow="CLEAN COMPLETE"
        title="A clearer list. Ready for what's next."
        description={
          job.filename + " · " + number(job.total) + " records processed"
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/new">
              <Plus size={17} />
              New clean
            </Link>
          </Button>
        }
      />
      <div className="result-metrics">
        {[
          {
            label: "Total processed",
            value: summary.total,
            icon: FileCheck2,
            type: "total",
          },
          {
            label: "Valid",
            value: summary.VALID,
            icon: CheckCircle2,
            type: "valid",
          },
          {
            label: "Corrected",
            value: summary.CORRECTED,
            icon: Sparkles,
            type: "corrected",
          },
          {
            label: "Removed",
            value: summary.REMOVED,
            icon: XCircle,
            type: "removed",
          },
          {
            label: "Review",
            value: summary.REVIEW,
            icon: CircleHelp,
            type: "review",
          },
        ].map(({ label, value, icon: Icon, type }) => (
          <section className={"panel metric " + type} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={16} />
            </div>
            <strong>
              <AnimatedNumber value={value} />
            </strong>
            <small>
              {type === "total"
                ? "Every record accounted for"
                : (summary.total
                    ? ((value / summary.total) * 100).toFixed(1)
                    : "0") + "% of your list"}
            </small>
          </section>
        ))}
      </div>
      <motion.section
        className="clean-banner"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="clean-banner-icon">
          <CheckCircle2 size={27} />
        </div>
        <div>
          <span>CLEAN · READY TO USE</span>
          <strong data-testid="clean-count">
            <AnimatedNumber value={summary.clean} /> <small>emails</small>
          </strong>
          <p>Valid + corrected. Unique and within your company limits.</p>
        </div>
        <CleanDownload id={job.id} />
      </motion.section>
      <ListHealth summary={summary} />
      <section className="panel results-panel">
        <div className="results-heading">
          <div>
            <h2>Every record. Every reason.</h2>
            <p>See exactly what changed, and why.</p>
          </div>
          <span className="results-record-count">
            {number(summary.total)} records
          </span>
        </div>
        <Tabs
          value={status}
          onValueChange={(value) => setFilter(setStatus, value)}
        >
          <TabsList className="result-tabs">
            <TabsTrigger value="">
              All results<span>{number(summary.total)}</span>
            </TabsTrigger>
            {(Object.keys(statusNames) as Status[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {statusNames[key]}
                <span>{number(summary[key])}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="result-filters">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search emails"
              value={search}
              placeholder="Search emails…"
              onChange={(event) => setFilter(setSearch, event.target.value)}
            />
          </div>
          <select
            aria-label="Status filter"
            value={status}
            onChange={(event) => setFilter(setStatus, event.target.value)}
          >
            <option value="">All statuses</option>
            {(Object.keys(statusNames) as Status[]).map((key) => (
              <option key={key} value={key}>
                {statusNames[key]}
              </option>
            ))}
          </select>
          <select
            aria-label="Category filter"
            value={category}
            onChange={(event) => setFilter(setCategory, event.target.value)}
          >
            <option value="">All reasons</option>
            {Object.keys(summary.categories)
              .sort()
              .map((key) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
          </select>
          <input
            className="domain-filter"
            aria-label="Domain filter"
            value={domain}
            placeholder="Filter by exact domain"
            onChange={(event) => setFilter(setDomain, event.target.value)}
          />
          <button
            className="icon-button"
            title="Reset filters"
            aria-label="Reset filters"
            onClick={() => {
              setStatus("");
              setCategory("");
              setDomain("");
              setSearch("");
              setOffset(0);
            }}
          >
            <ListFilter size={17} />
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="table-scroll" aria-busy={loading}>
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Original email</th>
                <th scope="col">Final email</th>
                <th scope="col">Status</th>
                <th scope="col">Reason</th>
                <th scope="col">Domain</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {page?.items.map((record) => (
                <tr key={record.row_number}>
                  <td className="row-index">{record.row_number}</td>
                  <td>
                    <span
                      className={
                        record.was_corrected
                          ? "email-cell original-corrected"
                          : "email-cell"
                      }
                      title={record.original_email}
                    >
                      {record.original_email || (
                        <span className="muted">(empty)</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        record.status === "CORRECTED"
                          ? "email-cell final-corrected"
                          : "email-cell"
                      }
                      title={record.final_email}
                    >
                      {record.was_corrected && record.final_email && (
                        <ArrowRight size={12} />
                      )}
                      {record.final_email || "—"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={record.status} />
                  </td>
                  <td>
                    <span className="reason-cell" title={record.reason}>
                      {record.reason}
                    </span>
                  </td>
                  <td>
                    <span className="domain-cell" title={record.domain}>
                      {record.domain || "—"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Inspect record " + record.row_number}
                      onClick={() => inspect(record)}
                    >
                      <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!page?.items.length && (
                <tr>
                  <td colSpan={7} className="no-results">
                    {loading
                      ? "Loading records…"
                      : "No records match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {loading
              ? "Updating…"
              : page?.total
                ? `Showing ${number(offset + 1)}–${number(Math.min(offset + 50, page.total))} of ${number(page.total)} records`
                : "0 matching records"}
          </span>
          <div>
            <span>50 per page</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={offset === 0 || loading}
              onClick={() => setOffset((value) => Math.max(0, value - 50))}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="page-number">{Math.floor(offset / 50) + 1}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={!page || offset + 50 >= page.total || loading}
              onClick={() => setOffset((value) => value + 50)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
      <ExportDownloads job={job} />
      <dialog
        aria-labelledby="record-title"
        ref={dialog}
        className="record-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onClose={() => setSelected(null)}
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">THE COMPLETE AUDIT TRAIL</p>
            <h2 id="record-title">Record {selected?.row_number}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close record details"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {selected && (
          <>
            <StatusBadge status={selected.status} />
            <dl className="record-fields">
              {[
                ["Original email", selected.original_email || "(empty)"],
                ["Normalized email", selected.normalized_email || "(empty)"],
                ["Final email", selected.final_email || "—"],
                ["Reason", selected.reason],
                ["Category", categoryLabel(selected.category)],
                ["Domain", selected.domain || "—"],
                ["Was corrected", selected.was_corrected ? "Yes" : "No"],
                ["Correction types", selected.correction_type || "None"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </dialog>
    </>
  );
}
