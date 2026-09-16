"use client";
import Link from "next/link";
import { Download, LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useHistory } from "@/lib/use-history";
import { useJob } from "@/lib/use-job";
import { PageHeading } from "./page-heading";
import { ExportDownloads } from "./export-downloads";
import { Button } from "./ui/button";

function SelectedExport({ id }: { id: string }) {
  const { job, error } = useJob(id);
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!job?.summary)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" size={23} />
      </div>
    );
  return <ExportDownloads job={job} />;
}
export function ExportCenter() {
  const { data, error } = useHistory();
  const [selected, setSelected] = useState("");
  const completed = data?.items.filter((job) => job.state === "complete") || [];
  const id = completed.some((job) => job.id === selected)
    ? selected
    : completed[0]?.id;
  return (
    <>
      <PageHeading
        title="Your exports"
        description="The right file for your next step."
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error ? (
        <div className="panel empty-state">
          <LoaderCircle className="spin" size={24} />
          <p>Loading your exports…</p>
        </div>
      ) : !completed.length ? (
        <section className="panel empty-state">
          <Download size={34} />
          <h2>Your files are ready after a clean</h2>
          <p>
            Run your first list to download its clean emails and audit reports.
          </p>
          <Button asChild>
            <Link href="/new">
              <Plus size={16} />
              New clean
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <div className="panel export-selection">
            <label htmlFor="export-job">Choose a completed list</label>
            <select
              id="export-job"
              value={id}
              onChange={(event) => setSelected(event.target.value)}
            >
              {completed.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.filename} ·{" "}
                  {new Date(job.created_at * 1000).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <SelectedExport key={id} id={id} />
        </>
      )}
    </>
  );
}
