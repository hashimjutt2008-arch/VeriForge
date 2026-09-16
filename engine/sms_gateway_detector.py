from engine.data import domain_matches, rule


def is_sms_gateway(email: str) -> bool:
    return "@" in email and domain_matches(email.rsplit("@", 1)[-1], rule("sms_gateway_domains"))
