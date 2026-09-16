"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { Job } from "@/lib/types";
import { useHistory } from "@/lib/use-history";
import { number } from "@/lib/utils";
import { PageHeading } from "./page-heading";
import { Button } from "./ui/button";
export type HistoryJob = Pick<
  Job,
  | "id"
  | "filename"
  | "created_at"
  | "state"
  | "stage"
  | "total"
  | "processed"
  | "summary"
  | "error"
>;
export interface JobHistory {
  items: HistoryJob[];
  total: number;
}
export function HistoryTable({ jobs }: { jobs: HistoryJob[] }) {
  if (!jobs.length)
    return (
      <div className="empty-state">
        <History size={31} />
        <h2>No cleans to show yet</h2>
        <p>Your completed and in-progress lists will appear here.</p>
        <Button asChild>
          <Link href="/new">
            <Plus size={16} />
            New clean
          </Link>
        </Button>
      </div>
    );
  return (
    <div className="table-scroll history-scroll">
      <table className="history-table">
        <thead>
          <tr>
            <th>List name</th>
            <th>Processed</th>
            <th>Valid</th>
            <th>Corrected</th>
            <th>Removed</th>
            <th>Review</th>
            <th>Clean</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <Link className="history-file" href={"/jobs/" + job.id}>
                  <FileSpreadsheet size={20} />
                  <span>
                    <strong>{job.filename}</strong>
                    <small>
                      {new Date(job.created_at * 1000).toLocaleString()}
                    </small>
                  </span>
                </Link>
              </td>
              <td>{number(job.total)}</td>
              {(["VALID", "CORRECTED", "REMOVED", "REVIEW"] as const).map(
                (status) => (
                  <td key={status}>
                    {job.summary ? number(job.summary[status]) : "—"}
                  </td>
                ),
              )}
              <td className="history-clean">
                {job.summary ? number(job.summary.clean) : "—"}
              </td>
              <td>
                <span className={"job-state " + job.state}>
                  {job.state === "complete" ? (
                    <CheckCircle2 size={12} />
                  ) : job.state === "processing" ? (
                    <LoaderCircle size={12} className="spin" />
                  ) : null}
                  {job.state}
                </span>
              </td>
              <td>
                <Link
                  className="icon-button"
                  href={"/jobs/" + job.id}
                  aria-label={"Open " + job.filename}
                >
                  <ArrowRight size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function HistoryPageContent({
  overview = false,
}: {
  overview?: boolean;
}) {
  const { data, error, refresh } = useHistory();
  const [search, setSearch] = useState("");
  const jobs = (data?.items || []).filter((job) => job.state !== "ready");
  const complete = jobs.filter((job) => job.summary);
  const totals = complete.reduce(
    (sum, job) => ({
      total: sum.total + job.summary!.total,
      clean: sum.clean + job.summary!.clean,
      corrected: sum.corrected + job.summary!.CORRECTED,
    }),
    { total: 0, clean: 0, corrected: 0 },
  );
  return (
    <>
      <PageHeading
        eyebrow={
          overview ? "YOUR WORKSPACE, AT A GLANCE" : "EVERY LIST HAS A STORY"
        }
        title={overview ? "Your lists, in good shape." : "Cleaning history"}
        description={
          overview
            ? "A clear view of your recent cleaning activity."
            : "Revisit your lists and the changes made to them."
        }
        action={
          <Button asChild>
            <Link href="/new">
              <Plus size={17} />
              New clean
            </Link>
          </Button>
        }
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {overview && (
        <>
          <div className="overview-metrics">
            {[
              {
                label: "Records processed",
                value: totals.total,
                icon: FileSpreadsheet,
              },
              {
                label: "Clean emails produced",
                value: totals.clean,
                icon: CheckCircle2,
              },
              {
                label: "Corrections retained",
                value: totals.corrected,
                icon: Sparkles,
              },
            ].map(({ label, value, icon: Icon }) => (
              <section className="panel overview-metric" key={label}>
                <span className="soft-icon">
                  <Icon size={21} />
                </span>
                <div>
                  <p>{label}</p>
                  <strong>{number(value)}</strong>
                </div>
              </section>
            ))}
          </div>
          <p className="overview-note">
            Totals across {complete.length} completed clean
            {complete.length !== 1 ? "s" : ""} in this browser.
          </p>
        </>
      )}
      <section className="panel history-panel">
        <div className="history-heading">
          <div>
            <h2>{overview ? "Recent cleans" : "Your lists"}</h2>
            <p>History stays on this browser and device until you clear it.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh history"
            onClick={refresh}
          >
            <RefreshCw size={17} />
          </Button>
        </div>
        {!overview && (
          <div className="history-search search-field">
            <Search size={16} />
            <input
              aria-label="Search history"
              placeholder="Find a list by name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}
        {!data && !error ? (
          <div className="empty-state" role="status">
            <LoaderCircle size={25} className="spin" />
            <p>Loading your workspace…</p>
          </div>
        ) : (
          <HistoryTable
            jobs={jobs
              .filter((job) =>
                job.filename.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, overview ? 6 : undefined)}
          />
        )}
        {overview && jobs.length > 6 && (
          <div className="history-footer">
            <Link href="/history">
              View all history
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </section>
      {overview && (
        <div className="overview-cta">
          <span className="soft-icon">
            <Sparkles size={23} />
          </span>
          <div>
            <h2>Another list. Another fresh start.</h2>
            <p>Upload a file or paste your emails to begin.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/new">
              Clean a list
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
