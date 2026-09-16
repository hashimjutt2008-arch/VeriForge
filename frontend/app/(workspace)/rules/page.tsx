import { Check, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
const rules = [
  [
    "Basic cleaning",
    "Normalizes spacing and case, checks formatting, and removes empty values and duplicates.",
  ],
  [
    "Junk detection",
    "Identifies known placeholders, example addresses, assets, system identifiers, SMS gateways, lead routers and disposable domains.",
  ],
  [
    "Smart corrections",
    "Repairs phone prefixes, supported 20 prefixes, known trailing corruption and stray characters before role mailboxes.",
  ],
  [
    "Company filtering",
    "Keeps the first two usable addresses per exact company domain by default. Listed public email providers are exempt.",
  ],
  [
    "Manual review",
    "Numeric-only local parts are kept for review and excluded from the clean list.",
  ],
];
export default function RulesPage() {
  return (
    <>
      <PageHeading
        title="Cleaning rules"
        description="Conservative by design. Clear about every decision."
      />
      <div className="rules-overview">
        {rules.map(([title, text]) => (
          <section className="panel rule-overview" key={title}>
            <span className="soft-icon">
              <Check size={20} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="notice">
        <ShieldCheck size={20} />
        <p>
          Clean means valid formatting and list hygiene. VeriForge does not
          check whether a mailbox exists or perform SMTP verification.
        </p>
      </div>
    </>
  );
}
