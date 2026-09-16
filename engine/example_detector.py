from engine.data import domain_matches, rule


def is_example(email: str) -> bool:
    if "@" not in email:
        return False
    return domain_matches(
        email.rsplit("@", 1)[-1], ["example.com", "example.org", "example.net"]
    ) or email in rule("example_patterns")
