import re

EXTENSIONS = frozenset(
    "webp png jpg jpeg gif svg css js ico woff woff2 ttf mp4 webm pdf zip".split()
)


def is_asset(email: str) -> bool:
    if "@" not in email:
        return False
    domain = email.rsplit("@", 1)[-1].split("?", 1)[0]
    if domain.rsplit(".", 1)[-1] in EXTENSIONS:
        return True
    return bool(re.match(r"^[234]x(?:[-.]|$)", domain))
