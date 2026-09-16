from engine.data import rule


def is_placeholder(email: str) -> bool:
    if email.count("@") != 1:
        return False
    local, domain = email.split("@")
    if email in rule("placeholder_addresses"):
        return True
    # Ambiguous words such as name/user/test require a placeholder-domain context.
    return domain in rule("placeholder_domains") and local in rule("placeholder_usernames")
