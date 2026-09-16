"use client";
import { Check, ShieldCheck, SlidersHorizontal, Building2 } from "lucide-react";
import { Switch } from "./ui/switch";
import { type CleaningOptions, ruleGroups } from "@/lib/cleaning-options";
export function CleaningSettings({
  options,
  onChange,
  disabled = false,
}: {
  options: CleaningOptions;
  onChange: (options: CleaningOptions) => void;
  disabled?: boolean;
}) {
  function update(key: keyof CleaningOptions, value: boolean | number) {
    onChange({ ...options, [key]: value });
  }
  return (
    <aside className="panel cleaning-settings">
      <div className="panel-title">
        <span className="soft-icon small">
          <SlidersHorizontal size={18} />
        </span>
        <div>
          <h2>Cleaning settings</h2>
          <p>You stay in control.</p>
        </div>
      </div>
      <div className="rule-section">
        <h3>
          Basic cleaning <span className="mini-label">ALWAYS ON</span>
        </h3>
        <p>Essentials for a usable clean list.</p>
        {["Invalid formatting", "Exact duplicates", "Empty values"].map(
          (label) => (
            <div className="rule-setting" key={label}>
              <span>{label}</span>
              <Check size={15} className="mandatory-check" />
            </div>
          ),
        )}
      </div>
      {ruleGroups.map((group) => (
        <div className="rule-section" key={group.title}>
          <h3>{group.title}</h3>
          <p>{group.description}</p>
          {group.rules.map(([key, label]) => (
            <div className="rule-setting" key={key}>
              <label htmlFor={key}>{label}</label>
              <Switch
                id={key}
                checked={options[key]}
                onCheckedChange={(value) => update(key, value)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      ))}
      <div className="rule-section">
        <h3>
          <Building2 size={15} /> Company filtering
        </h3>
        <p>Maximum usable emails per company domain.</p>
        <div className="domain-options">
          {[1, 2, 3, 5].map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-pressed={options.company_domain_limit === value}
              onClick={() => update("company_domain_limit", value)}
            >
              {value}
            </button>
          ))}
          <label className="custom-cap">
            Custom
            <input
              aria-label="Custom company-domain limit"
              type="number"
              min={1}
              max={100000}
              value={options.company_domain_limit}
              disabled={disabled}
              onChange={(event) =>
                update("company_domain_limit", Number(event.target.value))
              }
            />
          </label>
        </div>
        <p className="provider-note">
          Gmail, Outlook, and other listed public providers are exempt.
        </p>
      </div>
      <div className="settings-foot">
        <ShieldCheck size={15} />
        <span>Original values are always preserved.</span>
      </div>
    </aside>
  );
}
