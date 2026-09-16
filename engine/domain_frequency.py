from collections import Counter

from engine.data import rule


class DomainFrequency:
    def __init__(self, limit: int):
        self.limit = limit
        self.counts: Counter[str] = Counter()
        self.exempt = frozenset(rule("free_email_domains"))

    def exceeds(self, domain: str, review: bool = False) -> bool:
        if domain in self.exempt or review:
            return False
        self.counts[domain] += 1
        return self.counts[domain] > self.limit
