import { ArrowRight, Sparkles } from "lucide-react";
import type { Summary } from "@/lib/types";
import { number } from "@/lib/utils";
export function ListHealth({ summary }: { summary: Summary }) {
  const categories = summary.categories;
  const count = (...names: string[]) =>
    names.reduce((sum, name) => sum + (categories[name] || 0), 0);
  const rows = [
    ["Duplicates", count("DUPLICATE"), "0"],
    ["Invalid or empty", count("INVALID_SYNTAX", "EMPTY_VALUE"), "0"],
    [
      "System & junk",
      count(
        "SYSTEM_GENERATED",
        "LEAD_ROUTER",
        "SMS_GATEWAY",
        "PLACEHOLDER",
        "EXAMPLE_EMAIL",
        "FAKE_OR_JUNK",
        "DISPOSABLE",
      ),
      "0",
    ],
    ["Asset strings", count("INVALID_ASSET_STRING"), "0"],
    ["Over company limit", count("EXCESS_DOMAIN"), "0"],
    [
      "Correctable records",
      summary.repaired,
      number(summary.repaired) + " repaired",
    ],
  ] as const;
  return (
    <section className="panel health-panel" aria-labelledby="health-heading">
      <div className="health-story">
        <span className="eyebrow">LESS NOISE. SAME ORIGINALS.</span>
        <h2 id="health-heading">Your list, before & after</h2>
        <div className="health-totals">
          <div>
            <span>Before</span>
            <strong>{number(summary.total)}</strong>
            <small>records</small>
          </div>
          <ArrowRight size={20} />
          <div>
            <span>After</span>
            <strong>{number(summary.clean)}</strong>
            <small>clean emails</small>
          </div>
        </div>
        <div
          className="health-bar"
          aria-label={`${number(summary.VALID)} valid, ${number(summary.CORRECTED)} corrected, ${number(summary.REMOVED)} removed and ${number(summary.REVIEW)} review records`}
        >
          {(["VALID", "CORRECTED", "REMOVED", "REVIEW"] as const).map(
            (status) => (
              <span
                key={status}
                className={status.toLowerCase()}
                style={{
                  width: summary.total
                    ? (summary[status] / summary.total) * 100 + "%"
                    : "0%",
                }}
              />
            ),
          )}
        </div>
        <p>Review records are held out of the clean list.</p>
      </div>
      <div className="health-details">
        <table>
          <thead>
            <tr>
              <th>List health</th>
              <th>Before</th>
              <th>After cleaning</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, after]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{number(before)}</td>
                <td>{after}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <Sparkles size={13} />
          Repairs remain auditable even if a later rule removes the record.
        </p>
      </div>
    </section>
  );
}
