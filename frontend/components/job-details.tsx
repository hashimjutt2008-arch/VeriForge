"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  FileSpreadsheet,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Results } from "./results";
import { processingService } from "@/lib/services/processing-service";
import { useJob } from "@/lib/use-job";
import { number } from "@/lib/utils";
import { PageHeading } from "./page-heading";
import { Button } from "./ui/button";

export function JobDetails({ id }: { id: string }) {
  const { job, error, retry } = useJob(id);
  if (error)
    return (
      <section className="panel empty-state">
        <XCircle size={32} />
        <h1>We couldn&apos;t load this clean</h1>
        <p role="alert">{error}</p>
        <Button onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/new">Start a new clean</Link>
        </Button>
      </section>
    );
  if (!job)
    return (
      <div className="panel empty-state" role="status">
        <LoaderCircle className="spin" size={29} />
        <h2>Loading your clean…</h2>
      </div>
    );
  if (job.state === "failed")
    return (
      <section className="panel empty-state">
        <XCircle size={32} />
        <h1>We couldn&apos;t finish this list</h1>
        <p role="alert">{job.error}</p>
        <Button asChild>
          <Link href="/new">Try a new clean</Link>
        </Button>
      </section>
    );
  if (job.state === "ready")
    return (
      <section className="panel empty-state">
        <FileSpreadsheet size={32} />
        <h1>This list hasn&apos;t started yet</h1>
        <p>Return to New clean to upload your file and choose settings.</p>
        <Button asChild>
          <Link href="/new">New clean</Link>
        </Button>
      </section>
    );
  if (job.state === "complete") return <Results job={job} />;
  const percent = Math.min(
    99,
    Math.floor((job.processed / Math.max(1, job.total)) * 100),
  );
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE LESS NOISE, ONE RECORD AT A TIME"
        title="Your list is getting a fresh start."
        description="Every correction is recorded. Every original is kept."
      />
      <section className="panel processing-panel">
        <div className="processing-file">
          <span className="soft-icon">
            <FileSpreadsheet size={23} />
          </span>
          <div>
            <h2>{job.filename}</h2>
            <p>{number(job.total)} records</p>
          </div>
          <span className="pill">
            <LoaderCircle size={13} className="spin" />
            In progress
          </span>
        </div>
        <div className="progress-head">
          <h3>Cleaning {number(job.total)} emails…</h3>
          <strong>{percent}%</strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Cleaning progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <motion.div initial={false} animate={{ width: percent + "%" }} />
        </div>
        <div className="progress-meta">
          <span>
            {number(job.processed)} of {number(job.total)} records processed
          </span>
          <span>Keep this tab open while cleaning</span>
        </div>
        <div className="live-counts">
          {(["VALID", "CORRECTED", "REMOVED", "REVIEW"] as const).map(
            (status) => (
              <div key={status} className={status.toLowerCase()}>
                <span>{status.toLowerCase()}</span>
                <strong>{number(job.counts[status] || 0)}</strong>
              </div>
            ),
          )}
        </div>
        <div className="current-stage" role="status">
          <span className="soft-icon">
            <Sparkles size={21} />
          </span>
          <div>
            <span>WORKING ON YOUR LIST</span>
            <motion.strong
              key={job.stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {job.stage}
            </motion.strong>
          </div>
          <LoaderCircle size={18} className="spin push-right" />
        </div>
        <Button variant="outline" onClick={() => processingService.cancel(id)}>
          Cancel cleaning
        </Button>
        <div className="processing-promises">
          <span>
            <Check size={14} />
            Original values preserved
          </span>
          <span>
            <Check size={14} />
            Conservative corrections
          </span>
          <span>
            <LockKeyhole size={13} />
            Private processing
          </span>
        </div>
      </section>
    </>
  );
}
