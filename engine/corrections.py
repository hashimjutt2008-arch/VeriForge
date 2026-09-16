import re

from engine.data import rule
from engine.models import Options
from engine.syntax_validator import syntax_error

PHONE = re.compile(r"^([+()\d .-]+)([a-z][a-z0-9._+-]*)$")
ROLE_PREFIX = re.compile(r"^[e•|:;]([a-z]+)$")


def correct(email: str, options: Options) -> tuple[str, list[tuple[str, str]]]:
    changes = []
    candidate = email
    if options.trailing_junk:
        if candidate.startswith("mailto:"):
            extracted = candidate[7:].split("?", 1)[0]
            if not syntax_error(extracted):
                candidate = extracted
                changes.append(("CORRECTED_EXTRACTED_EMAIL", "Extracted email from mailto link"))
        match = re.fullmatch(r"[^<>\r\n]*<([^<>]+)>", candidate)
        if match and not syntax_error(match[1]):
            candidate = match[1]
            changes.append(
                ("CORRECTED_EXTRACTED_EMAIL", "Extracted email from display-name wrapper")
            )
    if candidate.count("@") != 1:
        return candidate, changes
    local, domain = candidate.split("@")
    roles = set(rule("role_mailboxes"))
    if options.phone_prefixes:
        match = PHONE.fullmatch(local)
        if match and len(re.sub(r"\D", "", match[1])) >= 7 and re.search(r"[-()+ ]", match[1]):
            local = match[2]
            changes.append(("CORRECTED_PHONE_PREFIX", "Removed phone prefix"))
    if options.accidental_20 and local.startswith("20") and local[2:].isalpha():
        remainder = local[2:]
        evidence = {**rule("local_correction_evidence"), **options.local_corrections}
        explicit = evidence.get(local + "@" + domain) == remainder + "@" + domain
        domain_evidence = len(remainder) >= 4 and domain.split(".")[0].startswith(remainder)
        if remainder in roles or explicit or (domain_evidence and remainder != "twenty"):
            local = remainder
            changes.append(
                (
                    "CORRECTED_20_PREFIX",
                    "Removed accidental 20 prefix (role or supporting evidence)",
                )
            )
    if options.leading_junk:
        match = ROLE_PREFIX.fullmatch(local)
        if match and match[1] in roles:
            local = match[1]
            changes.append(
                (
                    "CORRECTED_LEADING_JUNK_CHARACTER",
                    "Removed stray leading character before role mailbox",
                )
            )
    if options.trailing_junk:
        # Exact duplicated domain: x.comx.com. Do not truncate .company or arbitrary suffixes.
        if len(domain) % 2 == 0 and domain[: len(domain) // 2] == domain[len(domain) // 2 :]:
            half = domain[: len(domain) // 2]
            if not syntax_error("a@" + half):
                domain = half
                changes.append(("CORRECTED_TRAILING_JUNK", "Removed repeated scraped domain"))
        for provider in rule("free_email_domains"):
            if domain in (provider + "receive", provider + "contact"):
                domain = provider
                changes.append(("CORRECTED_TRAILING_JUNK", "Removed known trailing scraped text"))
                break
    if options.tld_corrections:
        replacement = options.domain_corrections.get(domain)
        if replacement and not syntax_error("a@" + replacement):
            domain = replacement
            changes.append(("CORRECTED_TLD", "Corrected domain using operator-supplied evidence"))
        elif domain.endswith(".comt"):
            domain = domain[:-1]
            changes.append(("CORRECTED_TLD", "Removed trailing t after .com"))
    final = local + "@" + domain
    # Never call a transformation successful when it creates invalid syntax.
    if changes and syntax_error(final):
        return email, []
    return final, changes
