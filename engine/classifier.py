from engine.asset_detector import is_asset
from engine.disposable_detector import is_disposable
from engine.example_detector import is_example
from engine.models import Options
from engine.placeholder_detector import is_placeholder
from engine.sms_gateway_detector import is_sms_gateway
from engine.syntax_validator import syntax_error
from engine.system_detector import is_lead_router, is_system


def rejection(email: str, options: Options) -> tuple[str, str] | None:
    checks = [
        (options.assets, is_asset, "INVALID_ASSET_STRING", "Asset/file string"),
        (
            options.system_generated,
            is_system,
            "SYSTEM_GENERATED",
            "Machine identifier on an infrastructure domain",
        ),
        (options.lead_routers, is_lead_router, "LEAD_ROUTER", "Lead-routing address"),
        (options.sms_gateways, is_sms_gateway, "SMS_GATEWAY", "SMS/MMS gateway address"),
        (options.placeholders, is_placeholder, "PLACEHOLDER", "Known placeholder email"),
        (options.strict_examples, is_example, "EXAMPLE_EMAIL", "Known example email"),
        (options.disposable, is_disposable, "DISPOSABLE", "Known disposable email domain"),
    ]
    for enabled, detector, category, reason in checks:
        if enabled and detector(email):
            return category, reason
    error = syntax_error(email)
    return ("EMPTY_VALUE" if not email else "INVALID_SYNTAX", error) if error else None
