"""Stable engine contracts, using only the Python standard library."""

from dataclasses import asdict, dataclass, field
from enum import StrEnum


class Status(StrEnum):
    VALID = "VALID"
    CORRECTED = "CORRECTED"
    REMOVED = "REMOVED"
    REVIEW = "REVIEW"


@dataclass(slots=True)
class Result:
    original_email: str
    normalized_email: str
    final_email: str
    status: Status
    category: str
    reason: str
    domain: str = ""
    was_corrected: bool = False
    correction_type: str = ""
    row_number: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class Options:
    company_domain_limit: int = 2
    placeholders: bool = True
    strict_examples: bool = True
    assets: bool = True
    system_generated: bool = True
    sms_gateways: bool = True
    lead_routers: bool = True
    disposable: bool = True
    phone_prefixes: bool = True
    accidental_20: bool = True
    trailing_junk: bool = True
    tld_corrections: bool = True
    leading_junk: bool = True
    # Operator-supplied evidence; .co is never changed merely because .com exists.
    domain_corrections: dict[str, str] = field(default_factory=dict)
    local_corrections: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 1 <= self.company_domain_limit <= 100000:
            raise ValueError("Company domain limit must be between 1 and 100000")
