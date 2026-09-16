import math
import re
from collections import Counter

from engine.data import domain_matches, rule


def is_system(email: str) -> bool:
    if email.count("@") != 1:
        return False
    local, domain = email.split("@")
    if not domain_matches(domain, rule("system_domains")):
        return False
    if re.fullmatch(r"[a-f0-9]{24,64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}", local):
        return True
    if not re.fullmatch(r"[a-z0-9_-]{24,64}", local) or sum(c.isdigit() for c in local) < 4:
        return False
    frequencies = Counter(local)
    entropy = -sum((n / len(local)) * math.log2(n / len(local)) for n in frequencies.values())
    return entropy >= 4.0


def is_lead_router(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1]
    return domain_matches(domain, rule("lead_router_domains"))
