import re
import unicodedata


def normalize(value: object) -> tuple[str, str]:
    original = "" if value is None else str(value)
    normalized = "".join(c for c in original if unicodedata.category(c) != "Cf")
    normalized = normalized.strip().lower()
    if len(normalized) >= 2 and normalized[0] == normalized[-1] and normalized[0] in "'\"":
        normalized = normalized[1:-1].strip()
    # Only repair spacing around separators; internal words are never blindly joined.
    normalized = re.sub(r"\s*@\s*", "@", normalized)
    normalized = re.sub(r"(?<=\w)\s*\.\s*(?=\w)", ".", normalized)
    return original, normalized
