import { PageHeading } from "@/components/page-heading";
export default function HelpPage() {
  return (
    <>
      <PageHeading
        title="A little help, when you need it."
        description="Everything you need to get from a messy list to a useful one."
      />
      <div className="help-grid">
        <section className="panel">
          <h2>Your first clean</h2>
          <ol>
            <li>
              Upload a CSV, TXT or XLSX file, or paste one email per line.
            </li>
            <li>Select the email column and review your cleaning rules.</li>
            <li>Start the clean and inspect the results.</li>
            <li>Download the clean list or the full audit report.</li>
          </ol>
        </section>
        <section className="panel">
          <h2>What makes it into the clean list?</h2>
          <p>
            Valid and successfully corrected emails, after duplicate removal and
            company-domain limits. Removed and review records are excluded.
          </p>
          <h2>Need to check a correction?</h2>
          <p>
            Every record retains its original value. The full report includes
            normalized and final values, reasons, and correction types.
          </p>
        </section>
        <section className="panel">
          <h2>File tips</h2>
          <p>
            Use UTF-8 or UTF-16 text. TXT files use one email per line. XLSX
            imports the first worksheet. If a header is guessed incorrectly,
            change the header option before uploading.
          </p>
        </section>
        <section className="panel">
          <h2>Local history & support</h2>
          <p>
            Your email lists are processed locally in your browser and are not
            uploaded to VeriForge servers. No account or separate backend is
            required.
          </p>
          <p>
            Keep this tab open while cleaning. History belongs to this browser
            and device. Download reports you want to keep; clearing browser data
            or changing the website domain can make local history unavailable.
          </p>
          <p>
            VeriForge cleans lists; it does not promise delivery or verify
            mailbox existence.
          </p>
        </section>
      </div>
    </>
  );
}
