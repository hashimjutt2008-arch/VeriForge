export interface CleaningOptions {
  company_domain_limit: number;
  domain_corrections?: Record<string, string>;
  local_corrections?: Record<string, string>;
  placeholders: boolean;
  strict_examples: boolean;
  assets: boolean;
  system_generated: boolean;
  sms_gateways: boolean;
  lead_routers: boolean;
  disposable: boolean;
  phone_prefixes: boolean;
  accidental_20: boolean;
  trailing_junk: boolean;
  tld_corrections: boolean;
  leading_junk: boolean;
}
export const defaultOptions: CleaningOptions = {
  company_domain_limit: 2,
  placeholders: true,
  strict_examples: true,
  assets: true,
  system_generated: true,
  sms_gateways: true,
  lead_routers: true,
  disposable: true,
  phone_prefixes: true,
  accidental_20: true,
  trailing_junk: true,
  tld_corrections: true,
  leading_junk: true,
};
export const ruleGroups = [
  {
    title: "Junk detection",
    description: "Remove addresses that do not belong.",
    rules: [
      ["placeholders", "Placeholder emails"],
      ["strict_examples", "Strict example-email matching"],
      ["assets", "Website assets"],
      ["system_generated", "System-generated emails"],
      ["sms_gateways", "SMS gateways"],
      ["lead_routers", "Lead-routing addresses"],
      ["disposable", "Disposable emails"],
    ],
  },
  {
    title: "Smart corrections",
    description: "Recover useful emails, conservatively.",
    rules: [
      ["phone_prefixes", "Phone prefixes"],
      ["accidental_20", "Accidental 20 prefixes"],
      ["trailing_junk", "Trailing scraped text"],
      ["tld_corrections", "TLD & trailing corruption"],
      ["leading_junk", "Stray leading characters"],
    ],
  },
] as const;
