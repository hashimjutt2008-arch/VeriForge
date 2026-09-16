class DuplicateDetector:
    def __init__(self):
        self.seen: set[str] = set()

    def is_duplicate(self, email: str) -> bool:
        key = email.casefold()
        if key in self.seen:
            return True
        self.seen.add(key)
        return False
