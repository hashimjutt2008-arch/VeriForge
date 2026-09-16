"use client";
import { useEffect, useState } from "react";
import { PageHeading } from "./page-heading";
import { CleaningSettings } from "./cleaning-settings";
import { Button } from "./ui/button";
import { defaultOptions } from "@/lib/cleaning-options";
import {
  getPreferences,
  savePreferences,
  clearLocalData,
  type Preferences,
} from "@/lib/services/storage";
import { notify } from "@/lib/services/events";
import { errorMessage } from "@/lib/errors";
export function WorkspaceSettings() {
  const [preferences, setPreferences] = useState<Preferences>({
    options: { ...defaultOptions },
    format: "csv",
  });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    void getPreferences()
      .then((p) => {
        setPreferences(p);
        setReady(true);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const n = preferences.options.company_domain_limit;
      if (!Number.isInteger(n) || n < 1 || n > 100000)
        throw new Error("Choose a company-domain limit between 1 and 100,000.");
      await savePreferences(preferences);
      setMessage("Defaults saved for this browser.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await clearLocalData();
      setPreferences({ options: { ...defaultOptions }, format: "csv" });
      setConfirm(false);
      notify();
      setMessage("Local history, results and preferences cleared.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Workspace settings"
        description="Cleaning defaults and local storage for this browser."
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="clean-grid">
        <div className="clean-main">
          <section className="panel settings-panel">
            <h2>Browser preferences</h2>
            <div className="setting-row">
              <div>
                <strong>Default export format</strong>
                <p>
                  Applies to report download cards. The quick clean-list button
                  always downloads CSV.
                </p>
              </div>
              <select
                aria-label="Default export format"
                value={preferences.format}
                disabled={!ready || busy}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    format: e.target.value as "csv" | "xlsx",
                  })
                }
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
              </select>
            </div>
            <div className="setting-row">
              <div>
                <strong>Maximum list size</strong>
                <p>CSV, TXT, or the first XLSX worksheet.</p>
              </div>
              <span className="pill">100,000 rows / 25 MB</span>
            </div>
            <Button onClick={save} disabled={!ready || busy}>
              Save defaults
            </Button>
          </section>
          <section className="panel settings-panel">
            <h2>History & storage</h2>
            <p>
              History and results stay on this browser and device. They are not
              synced to your team. Browser storage can be cleared or evicted;
              download important reports.
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Clear local data
            </Button>
            {confirm && (
              <div role="alert">
                <p>
                  This permanently removes all local jobs, results and
                  preferences from this browser. Download reports you need
                  first.
                </p>
                <Button disabled={busy} onClick={clear}>
                  Delete all local data
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Keep my data
                </Button>
              </div>
            )}
          </section>
          <section className="panel settings-panel">
            <h2>About VeriForge</h2>
            <p>
              Your email lists are processed locally in your browser and are not
              uploaded to VeriForge servers.
            </p>
            <p>
              No account, login or separate backend is required. VeriForge does
              not verify mailbox existence or guarantee delivery.
            </p>
          </section>
        </div>
        <CleaningSettings
          options={preferences.options}
          onChange={(options) => setPreferences({ ...preferences, options })}
          disabled={!ready || busy}
        />
      </div>
    </>
  );
}
