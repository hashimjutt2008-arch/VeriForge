from collections.abc import Iterable, Iterator

from engine.classifier import rejection
from engine.corrections import correct
from engine.domain_frequency import DomainFrequency
from engine.duplicate_detector import DuplicateDetector
from engine.models import Options, Result, Status
from engine.normalizer import normalize
from engine.suspicious_detector import suspicious_reason


def iter_results(values: Iterable[object], options: Options | None = None) -> Iterator[Result]:
    options = options or Options()
    exact = DuplicateDetector()
    final_seen = DuplicateDetector()
    domains = DomainFrequency(options.company_domain_limit)
    for row_number, value in enumerate(values, 1):
        original, normalized = normalize(value)
        final, changes = correct(normalized, options)
        domain = final.rsplit("@", 1)[-1] if final.count("@") == 1 else ""
        correction_types = ";".join(kind for kind, _ in changes)
        correction_reason = "; ".join(reason for _, reason in changes)
        result = Result(
            original,
            normalized,
            final,
            Status.VALID,
            "VALID",
            "Passed all checks",
            domain,
            bool(changes),
            correction_types,
            row_number,
        )
        rejected = rejection(final, options)
        review = suspicious_reason(final) if not rejected else None
        if not rejected and exact.is_duplicate(normalized):
            rejected = "DUPLICATE", "Duplicate normalized email"
        # Post-correction collisions are removed before consuming company capacity.
        if not rejected and final_seen.is_duplicate(final):
            rejected = "DUPLICATE", "Duplicate final email after normalization/correction"
        if not rejected and domains.exceeds(domain, bool(review)):
            rejected = (
                "EXCESS_DOMAIN",
                f"Company domain exceeds limit of {options.company_domain_limit}",
            )
        if rejected:
            result.status, result.category, result.reason = Status.REMOVED, *rejected
            if result.category in {"INVALID_SYNTAX", "EMPTY_VALUE", "INVALID_ASSET_STRING"}:
                result.final_email = ""
        elif review:
            result.status, result.category, result.reason = Status.REVIEW, *review
        elif changes:
            result.status = Status.CORRECTED
            result.category = changes[-1][0]
            result.reason = correction_reason
        if changes and result.status in (Status.REMOVED, Status.REVIEW):
            result.reason += "; correction applied: " + correction_reason
        yield result


def process_emails(emails: Iterable[object], options: Options | None = None) -> list[Result]:
    return list(iter_results(emails, options))
