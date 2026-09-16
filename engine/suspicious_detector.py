def suspicious_reason(email: str) -> tuple[str, str] | None:
    local = email.split("@", 1)[0]
    if local.isdigit():
        return "SUSPICIOUS_NUMERIC_LOCAL", "Numeric-only local part; manual review recommended"
    return None
