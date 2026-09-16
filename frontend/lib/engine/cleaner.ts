import rules from "./rules.json";
import casefold from "./casefold.json";
import { defaultOptions, type CleaningOptions } from "../cleaning-options";
import type { ResultRecord, Summary } from "../types";

type Change = [string, string];
const roles = new Set(rules.role_mailboxes);
const free = new Set(rules.free_email_domains);
const assets = new Set(
  "webp png jpg jpeg gif svg css js ico woff woff2 ttf mp4 webm pdf zip".split(
    " ",
  ),
);
const matchesDomain = (domain: string, list: string[]) =>
  list.some((item) => domain === item || domain.endsWith("." + item));
// Python str.strip / re whitespace include these four ASCII separators.
const trim = (text: string) =>
  text.replace(/^[\s\u001c-\u001f]+|[\s\u001c-\u001f]+$/gu, "");
export function normalize(value: unknown): [string, string] {
  const original =
    value == null
      ? ""
      : typeof value === "boolean"
        ? value
          ? "True"
          : "False"
        : String(value);
  let text = trim(original.replace(/\p{Cf}/gu, "")).toLowerCase();
  if (text.length >= 2 && text[0] === text.at(-1) && "'\"".includes(text[0]))
    text = trim(text.slice(1, -1));
  text = text
    .replace(/[\s\u001c-\u001f]*@[\s\u001c-\u001f]*/gu, "@")
    .replace(
      /(?<=[\p{L}\p{N}_])[\s\u001c-\u001f]*\.[\s\u001c-\u001f]*(?=[\p{L}\p{N}_])/gu,
      ".",
    );
  return [original, text];
}
export function syntaxError(email: string): string | null {
  if (!email) return "Empty value";
  if ([...email].length > 254 || email.split("@").length !== 2)
    return "Expected one email address with one @ symbol";
  const [local, domain] = email.split("@");
  if (
    !local ||
    [...local].length > 64 ||
    !/^[a-z0-9!#$%&'*+/=?^_`{|}~.\-]+$/.test(local) ||
    /\n/.test(local)
  )
    return "Invalid local part";
  if (local.startsWith(".") || local.endsWith(".") || local.includes(".."))
    return "Invalid dot placement in local part";
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    !labels.every(
      (label) =>
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label) &&
        !/\n/.test(label),
    )
  )
    return "Invalid domain format";
  if (!/^[a-z]{2,}$/.test(labels.at(-1)!)) return "Invalid top-level domain";
  return null;
}
export function correct(
  email: string,
  options: CleaningOptions,
): [string, Change[]] {
  let candidate = email;
  const changes: Change[] = [];
  if (options.trailing_junk) {
    if (candidate.startsWith("mailto:")) {
      const extracted = candidate.slice(7).split("?")[0];
      if (!syntaxError(extracted)) {
        candidate = extracted;
        changes.push([
          "CORRECTED_EXTRACTED_EMAIL",
          "Extracted email from mailto link",
        ]);
      }
    }
    const match = /^[^<>\r\n]*<([^<>]+)>$/.exec(candidate);
    if (match && !syntaxError(match[1])) {
      candidate = match[1];
      changes.push([
        "CORRECTED_EXTRACTED_EMAIL",
        "Extracted email from display-name wrapper",
      ]);
    }
  }
  if (candidate.split("@").length !== 2) return [candidate, changes];
  let [local, domain] = candidate.split("@");
  if (options.phone_prefixes) {
    const m = /^([+()\p{Nd} .-]+)([a-z][a-z0-9._+-]*)$/u.exec(local);
    if (
      m &&
      [...m[1].replace(/[^\p{Nd}]/gu, "")].length >= 7 &&
      /[-()+ ]/.test(m[1])
    ) {
      local = m[2];
      changes.push(["CORRECTED_PHONE_PREFIX", "Removed phone prefix"]);
    }
  }
  if (
    options.accidental_20 &&
    local.startsWith("20") &&
    /^\p{L}+$/u.test(local.slice(2))
  ) {
    const rest = local.slice(2);
    const evidence: Record<string, string> = {
      ...rules.local_correction_evidence,
      ...options.local_corrections,
    };
    if (
      roles.has(rest) ||
      evidence[local + "@" + domain] === rest + "@" + domain ||
      ([...rest].length >= 4 &&
        domain.split(".")[0].startsWith(rest) &&
        rest !== "twenty")
    ) {
      local = rest;
      changes.push([
        "CORRECTED_20_PREFIX",
        "Removed accidental 20 prefix (role or supporting evidence)",
      ]);
    }
  }
  if (options.leading_junk) {
    const m = /^[e•|:;]([a-z]+)$/.exec(local);
    if (m && roles.has(m[1])) {
      local = m[1];
      changes.push([
        "CORRECTED_LEADING_JUNK_CHARACTER",
        "Removed stray leading character before role mailbox",
      ]);
    }
  }
  if (options.trailing_junk) {
    const half = domain.slice(0, domain.length / 2);
    if (
      domain.length % 2 === 0 &&
      half === domain.slice(domain.length / 2) &&
      !syntaxError("a@" + half)
    ) {
      domain = half;
      changes.push([
        "CORRECTED_TRAILING_JUNK",
        "Removed repeated scraped domain",
      ]);
    }
    for (const provider of free)
      if (domain === provider + "receive" || domain === provider + "contact") {
        domain = provider;
        changes.push([
          "CORRECTED_TRAILING_JUNK",
          "Removed known trailing scraped text",
        ]);
        break;
      }
  }
  if (options.tld_corrections) {
    const replacement = options.domain_corrections?.[domain];
    if (replacement && !syntaxError("a@" + replacement)) {
      domain = replacement;
      changes.push([
        "CORRECTED_TLD",
        "Corrected domain using operator-supplied evidence",
      ]);
    } else if (domain.endsWith(".comt")) {
      domain = domain.slice(0, -1);
      changes.push(["CORRECTED_TLD", "Removed trailing t after .com"]);
    }
  }
  const final = local + "@" + domain;
  return changes.length && syntaxError(final) ? [email, []] : [final, changes];
}
function isSystem(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2 || !matchesDomain(parts[1], rules.system_domains))
    return false;
  const local = parts[0];
  if (
    /^(?:[a-f0-9]{24,64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(
      local,
    )
  )
    return true;
  if (!/^[a-z0-9_-]{24,64}$/.test(local) || local.replace(/\D/g, "").length < 4)
    return false;
  const counts = new Map<string, number>();
  for (const c of local) counts.set(c, (counts.get(c) || 0) + 1);
  return (
    -[...counts.values()].reduce(
      (s, n) => s + (n / local.length) * Math.log2(n / local.length),
      0,
    ) >= 4
  );
}
function rejection(email: string, o: CleaningOptions): Change | null {
  const parts = email.split("@");
  const local = parts[0],
    domain = parts.at(-1)!;
  const assetDomain = domain.split("?")[0];
  if (
    o.assets &&
    parts.length > 1 &&
    (assets.has(assetDomain.split(".").at(-1)!) ||
      /^[234]x(?:[-.]|$)/.test(assetDomain))
  )
    return ["INVALID_ASSET_STRING", "Asset/file string"];
  if (o.system_generated && isSystem(email))
    return [
      "SYSTEM_GENERATED",
      "Machine identifier on an infrastructure domain",
    ];
  if (o.lead_routers && matchesDomain(domain, rules.lead_router_domains))
    return ["LEAD_ROUTER", "Lead-routing address"];
  if (
    o.sms_gateways &&
    parts.length > 1 &&
    matchesDomain(domain, rules.sms_gateway_domains)
  )
    return ["SMS_GATEWAY", "SMS/MMS gateway address"];
  if (
    o.placeholders &&
    parts.length === 2 &&
    (rules.placeholder_addresses.includes(email) ||
      (rules.placeholder_domains.includes(domain) &&
        rules.placeholder_usernames.includes(local)))
  )
    return ["PLACEHOLDER", "Known placeholder email"];
  if (
    o.strict_examples &&
    parts.length > 1 &&
    (matchesDomain(domain, ["example.com", "example.org", "example.net"]) ||
      rules.example_patterns.includes(email))
  )
    return ["EXAMPLE_EMAIL", "Known example email"];
  if (
    o.disposable &&
    parts.length > 1 &&
    matchesDomain(domain, rules.disposable_domains)
  )
    return ["DISPOSABLE", "Known disposable email domain"];
  const error = syntaxError(email);
  return error ? [email ? "INVALID_SYNTAX" : "EMPTY_VALUE", error] : null;
}
export function emptySummary(): Summary {
  return {
    total: 0,
    VALID: 0,
    CORRECTED: 0,
    REMOVED: 0,
    REVIEW: 0,
    clean: 0,
    repaired: 0,
    categories: {},
  };
}
export function accumulate(summary: Summary, record: ResultRecord) {
  summary.total++;
  summary[record.status]++;
  summary.clean = summary.VALID + summary.CORRECTED;
  summary.repaired += Number(record.was_corrected);
  summary.categories[record.category] =
    (summary.categories[record.category] || 0) + 1;
}
export function createCleaner(options: CleaningOptions = defaultOptions) {
  if (
    !Number.isInteger(options.company_domain_limit) ||
    options.company_domain_limit < 1 ||
    options.company_domain_limit > 100000
  )
    throw new Error("Company domain limit must be between 1 and 100000");
  const exact = new Set<string>(),
    finalSeen = new Set<string>(),
    domains = new Map<string, number>();
  let row = 0;
  // Display-name wrappers can contain Unicode even when the extracted email is ASCII.
  const duplicate = (seen: Set<string>, value: string) => {
    const key = /[^\x00-\x7f]/.test(value)
      ? [...value]
          .map(
            (char) =>
              (casefold as Record<string, string>)[char] ?? char.toLowerCase(),
          )
          .join("")
      : value.toLowerCase();
    const present = seen.has(key);
    seen.add(key);
    return present;
  };
  return (value: unknown): ResultRecord => {
    const [original, normalized] = normalize(value);
    const [final, changes] = correct(normalized, options);
    const domain = final.split("@").length === 2 ? final.split("@")[1] : "";
    const correctionReason = changes.map((c) => c[1]).join("; ");
    const result: ResultRecord = {
      original_email: original,
      normalized_email: normalized,
      final_email: final,
      status: "VALID",
      category: "VALID",
      reason: "Passed all checks",
      domain,
      was_corrected: !!changes.length,
      correction_type: changes.map((c) => c[0]).join(";"),
      row_number: ++row,
    };
    let rejected = rejection(final, options);
    const review = !rejected && /^\d+$/.test(final.split("@")[0]);
    if (!rejected && duplicate(exact, normalized))
      rejected = ["DUPLICATE", "Duplicate normalized email"];
    if (!rejected && duplicate(finalSeen, final))
      rejected = [
        "DUPLICATE",
        "Duplicate final email after normalization/correction",
      ];
    if (!rejected && !free.has(domain) && !review) {
      const count = (domains.get(domain) || 0) + 1;
      domains.set(domain, count);
      if (count > options.company_domain_limit)
        rejected = [
          "EXCESS_DOMAIN",
          `Company domain exceeds limit of ${options.company_domain_limit}`,
        ];
    }
    if (rejected) {
      result.status = "REMOVED";
      [result.category, result.reason] = rejected;
      if (
        ["INVALID_SYNTAX", "EMPTY_VALUE", "INVALID_ASSET_STRING"].includes(
          result.category,
        )
      )
        result.final_email = "";
    } else if (review) {
      result.status = "REVIEW";
      result.category = "SUSPICIOUS_NUMERIC_LOCAL";
      result.reason = "Numeric-only local part; manual review recommended";
    } else if (changes.length) {
      result.status = "CORRECTED";
      result.category = changes.at(-1)![0];
      result.reason = correctionReason;
    }
    if (
      changes.length &&
      (result.status === "REMOVED" || result.status === "REVIEW")
    )
      result.reason += "; correction applied: " + correctionReason;
    return result;
  };
}
