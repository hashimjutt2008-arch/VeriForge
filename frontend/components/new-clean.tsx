"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { PageHeading } from "./page-heading";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CleaningSettings } from "./cleaning-settings";
import { errorMessage } from "@/lib/errors";
import { fileService } from "@/lib/services/file-service";
import { processingService } from "@/lib/services/processing-service";
import { getPreferences } from "@/lib/services/storage";
import { defaultOptions } from "@/lib/cleaning-options";
import { number } from "@/lib/utils";
import type { Job } from "@/lib/types";

export function NewClean() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("upload");
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const [header, setHeader] = useState("auto");
  const [job, setJob] = useState<Job | null>(null);
  const [column, setColumn] = useState("");
  const [options, setOptions] = useState({ ...defaultOptions });
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (job) void fileService.discard(job.id).catch(() => {});
    },
    [job],
  );
  useEffect(() => {
    void getPreferences()
      .then((p) => setOptions(p.options))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  function acceptJob(result: Job) {
    setJob(result);
    setColumn(
      result.metadata.suggested_column === null
        ? ""
        : String(result.metadata.suggested_column),
    );
  }
  async function upload(file?: File) {
    if (!file || busy || started) return;
    setError("");
    if (!/\.(csv|txt|xlsx)$/i.test(file.name)) {
      setError("Choose a CSV, TXT or XLSX file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("The file must be 25 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      acceptJob(
        await fileService.read(
          file,
          header === "auto" ? undefined : header === "true",
        ),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function preparePaste() {
    if (busy || !paste.trim()) return;
    setBusy(true);
    setError("");
    try {
      acceptJob(await fileService.paste(paste));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!job || column === "" || busy || started) return;
    if (
      !Number.isInteger(options.company_domain_limit) ||
      options.company_domain_limit < 1 ||
      options.company_domain_limit > 100000
    ) {
      setError("Choose a company-domain limit between 1 and 100,000.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await processingService.start(job.id, Number(column), options);
      setStarted(true);
      router.push("/jobs/" + job.id);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FROM MESSY TO MEANINGFUL"
        title="Let's clean your list."
        description="Upload your emails. Set your rules. Leave with a clearer list."
      />
      <div className="step-track">
        <span className="current">
          <b>1</b>Add your list
        </span>
        <i />
        <span>
          <b>2</b>Clean & correct
        </span>
        <i />
        <span>
          <b>3</b>Review & export
        </span>
      </div>
      <div className="clean-grid">
        <div className="clean-main">
          <section className="panel input-panel">
            <div className="panel-heading">
              <h2>Add your email list</h2>
              <span className="mini-label">STEP 01</span>
            </div>
            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (!busy && !started) {
                  setTab(value);
                  setJob(null);
                  setError("");
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="upload" disabled={busy || started}>
                  <UploadCloud size={17} />
                  Upload file
                </TabsTrigger>
                <TabsTrigger value="paste" disabled={busy || started}>
                  <FileText size={17} />
                  Paste emails
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div
                  className={drag ? "drop-zone dragging" : "drop-zone"}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!busy && !started) setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDrag(false);
                    if (event.dataTransfer.files.length > 1) {
                      setError("Upload one file at a time.");
                      return;
                    }
                    void upload(event.dataTransfer.files[0]);
                  }}
                >
                  <span className="upload-icon">
                    <UploadCloud size={29} strokeWidth={1.6} />
                  </span>
                  <h3>
                    {busy
                      ? "Reading your file…"
                      : "Drag & drop your email list"}
                  </h3>
                  <p>or choose a file from your computer</p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || started}
                    onClick={() => input.current?.click()}
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      "Browse file"
                    )}
                  </Button>
                  <div className="file-formats">
                    <span>CSV</span>
                    <span>XLSX</span>
                    <span>TXT</span>
                    <b>Up to 25 MB · 100,000 rows</b>
                  </div>
                  <input
                    ref={input}
                    type="file"
                    aria-label="Upload email list"
                    accept=".csv,.xlsx,.txt"
                    hidden
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </div>
                <div className="header-choice">
                  <label htmlFor="header">First row</label>
                  <select
                    id="header"
                    value={header}
                    disabled={busy || !!job}
                    onChange={(event) => setHeader(event.target.value)}
                  >
                    <option value="auto">Detect automatically</option>
                    <option value="true">Contains column headers</option>
                    <option value="false">Contains email data</option>
                  </select>
                </div>
              </TabsContent>
              <TabsContent value="paste">
                <div className="paste-area">
                  <label htmlFor="paste-emails">
                    One email address per line
                  </label>
                  <textarea
                    id="paste-emails"
                    spellCheck={false}
                    autoComplete="off"
                    value={paste}
                    onChange={(event) => {
                      setPaste(event.target.value);
                      setJob(null);
                    }}
                    rows={9}
                    placeholder={
                      "alex@company.com\ninfo@anothercompany.com\nsarah@gmail.com"
                    }
                    disabled={busy || started}
                    maxLength={10000000}
                  />
                  <div className="paste-footer">
                    <span>Original values stay in your report.</span>
                    <Button
                      variant="outline"
                      disabled={busy || started || !paste.trim()}
                      onClick={preparePaste}
                    >
                      {busy ? "Reading…" : "Use this list"}
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            {job && (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="file-added"
              >
                <span className="file-icon">
                  <FileSpreadsheet size={23} />
                </span>
                <div>
                  <strong>{job.filename}</strong>
                  <p>
                    {number(job.total)} rows detected ·{" "}
                    {job.metadata.columns.length} column
                    {job.metadata.columns.length !== 1 ? "s" : ""}
                    {job.metadata.sheet && " · First worksheet"}
                  </p>
                </div>
                <CheckCircle2 size={19} className="success-icon" />
                <button
                  className="icon-button"
                  aria-label="Remove selected file"
                  disabled={busy || started}
                  onClick={() => setJob(null)}
                >
                  <X size={17} />
                </button>
              </motion.div>
            )}
            <div className="input-privacy">
              <LockKeyhole size={13} />
              Your email lists are processed locally in your browser and are not
              uploaded to VeriForge servers.
            </div>
          </section>
          {job && (
            <section className="panel column-panel">
              <div className="panel-heading">
                <h2>Choose your email column</h2>
                {job.metadata.suggested_column !== null && (
                  <span className="pill">
                    <Sparkles size={13} />
                    Suggested for you
                  </span>
                )}
              </div>
              <label htmlFor="email-column">Email column</label>
              <select
                id="email-column"
                value={column}
                onChange={(event) => setColumn(event.target.value)}
                disabled={busy || started}
              >
                <option value="" disabled>
                  Select a column
                </option>
                {job.metadata.columns.map((name, i) => (
                  <option value={i} key={i}>
                    {name}
                  </option>
                ))}
              </select>
              {column !== "" && (
                <div className="column-preview">
                  <span className="mini-label">FIRST RECORDS</span>
                  {job.metadata.sample.slice(0, 3).map((row, i) => (
                    <div key={i}>
                      <span>{i + 1}</span>
                      <code>{row[Number(column)] || "(empty)"}</code>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {started ? (
            <section className="panel started-notice" role="status">
              <CheckCircle2 size={23} />
              <div>
                <h2>Cleaning started</h2>
                <p>Your list is being processed.</p>
              </div>
            </section>
          ) : (
            <div className="start-row">
              <p>
                <Info size={15} />
                Review records stay out of your clean list.
              </p>
              <Button disabled={!job || column === "" || busy} onClick={start}>
                {busy ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                Start cleaning
                <ArrowRight size={17} />
              </Button>
            </div>
          )}
          <section className="how-it-works">
            <h3>A cleaner list. A complete picture.</h3>
            <div>
              <article>
                <span className="soft-icon">
                  <ListChecks size={19} />
                </span>
                <strong>Remove the noise</strong>
                <p>Duplicates, junk, and invalid addresses.</p>
              </article>
              <article>
                <span className="soft-icon">
                  <Sparkles size={19} />
                </span>
                <strong>Recover what matters</strong>
                <p>Safe corrections with a clear audit trail.</p>
              </article>
              <article>
                <span className="soft-icon">
                  <Check size={19} />
                </span>
                <strong>Keep the useful ones</strong>
                <p>One unique, ready-to-use clean list.</p>
              </article>
            </div>
          </section>
        </div>
        <CleaningSettings
          options={options}
          onChange={setOptions}
          disabled={busy || started}
        />
      </div>
    </>
  );
}
