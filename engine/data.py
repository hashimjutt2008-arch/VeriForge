import json
from functools import lru_cache
from importlib.resources import files


@lru_cache
def rule(name: str):
    return json.loads(files("rules").joinpath(f"{name}.json").read_text(encoding="utf-8-sig"))


def domain_matches(domain: str, domains: list[str]) -> bool:
    return any(domain == item or domain.endswith("." + item) for item in domains)
