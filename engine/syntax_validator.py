import re

LOCAL = re.compile(r"[a-z0-9!#$%&'*+/=?^_`{|}~.-]+\Z")
LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")


def syntax_error(email: str) -> str | None:
    if not email:
        return "Empty value"
    if len(email) > 254 or email.count("@") != 1:
        return "Expected one email address with one @ symbol"
    local, domain = email.rsplit("@", 1)
    if not local or len(local) > 64 or not LOCAL.fullmatch(local):
        return "Invalid local part"
    if local.startswith(".") or local.endswith(".") or ".." in local:
        return "Invalid dot placement in local part"
    labels = domain.split(".")
    if len(labels) < 2 or not all(LABEL.fullmatch(label) for label in labels):
        return "Invalid domain format"
    if len(labels[-1]) < 2 or not labels[-1].isalpha():
        return "Invalid top-level domain"
    return None
