import csv
import io
import socket

import pytest

from engine.exports import write_csv
from engine.models import Options, Status
from engine.processor import process_emails


def one(value, **options):
    return process_emails([value], Options(**options))[0]


@pytest.mark.parametrize(
    "raw,final",
    [
        ("928-776-0050info@hoamco.com", "info@hoamco.com"),
        ("85331602-850-7553info@grayhawkstructural.com", "info@grayhawkstructural.com"),
        ("245-4547inspiredrenovationsaz@gmail.com", "inspiredrenovationsaz@gmail.com"),
        ("520-349-0839chauncey@chaunceymeyer.com", "chauncey@chaunceymeyer.com"),
        ("592-3477arboriststandards@gmail.com", "arboriststandards@gmail.com"),
        ("888-9093sales@finessedesignstudio.com", "sales@finessedesignstudio.com"),
        ("20esther@estherboivininteriors.com", "esther@estherboivininteriors.com"),
        ("20info@stairs4less.com", "info@stairs4less.com"),
        ("20ryan@nelsondevelop.com", "ryan@nelsondevelop.com"),
        ("886-8401sellwithsusan1@gmail.comreceive", "sellwithsusan1@gmail.com"),
        ("429-9922info@werkurbandesign.comwerkurbandesign.com", "info@werkurbandesign.com"),
        ("acquisitions@grossmancompany.comt", "acquisitions@grossmancompany.com"),
        ("einfo@anticus.com", "info@anticus.com"),
        ("mailto:info@acme.com", "info@acme.com"),
        ("Jane Doe <jane@acme.com>", "jane@acme.com"),
    ],
)
def test_corrections(raw, final):
    result = one(raw)
    assert result.final_email == final
    assert result.status == Status.CORRECTED
    assert result.original_email == raw
    assert result.was_corrected and result.correction_type and result.reason


@pytest.mark.parametrize(
    "email",
    [
        "2020design@company.com",
        "20twenty@company.com",
        "eric@company.com",
        "4x4sedona@gmail.com",
        "aa@societygrouppr.com",
        "info@company.com",
        "sales@company.com",
        "admin@company.com",
        "support@company.com",
        "testengineer@acme.com",
        "test@realbusiness.com",
        "name@realbusiness.com",
        "a-very-long-but-real-personal-username@sentry.io",
        "person@business.company",
        "person@business.co",
        "acquisitions@grossmancompany.co",
        "person+tag@gmail.com",
        "a@sub.company.com",
        "20alex@company.com",
    ],
)
def test_conservative_keeps(email):
    result = one(email)
    assert result.status == Status.VALID
    assert result.final_email == email


@pytest.mark.parametrize(
    "email",
    [
        "204@3x.png",
        "4@3x.png",
        "8@2x-1.webp",
        "9@2x-2.webp",
        "ajax-loader@2x.gif",
        "banner@2x-scaled.jpg",
        "_@astro.cng6o1fu.css",
        "656924549d9b4a0707be08c0_01-phone-ui-one-maintenance@2x.webp",
        "656a207ae8d416267a3908a6_02-computer-ui-one-maintenance@2x-p-1080.webp",
    ],
)
def test_assets(email):
    assert one(email).category == "INVALID_ASSET_STRING"


@pytest.mark.parametrize(
    "email,category",
    [
        ("79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com", "SYSTEM_GENERATED"),
        ("88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com", "SYSTEM_GENERATED"),
        ("8c4075d5481d476e945486754f783364@sentry.io", "SYSTEM_GENERATED"),
        ("800201.lead.429097796@leads.leadrouter.com", "LEAD_ROUTER"),
        ("900630.lead.lag.101024223@leads.leadrouter.com", "LEAD_ROUTER"),
        ("5132910955@vtext.com", "SMS_GATEWAY"),
        ("5134903008@txt.att.net", "SMS_GATEWAY"),
        ("5132758569@txt.att.net", "SMS_GATEWAY"),
        ("filler@godaddy.com", "PLACEHOLDER"),
        ("test@test.com", "PLACEHOLDER"),
        ("fake@gmail.com", "PLACEHOLDER"),
        ("you@email.com", "PLACEHOLDER"),
        ("example@example.com", "EXAMPLE_EMAIL"),
        ("john@example.com", "EXAMPLE_EMAIL"),
        ("john@company.com", "EXAMPLE_EMAIL"),
        ("johns@gmail.com", "EXAMPLE_EMAIL"),
        ("alex@mailinator.com", "DISPOSABLE"),
    ],
)
def test_detectors(email, category):
    result = one(email)
    assert result.status == Status.REMOVED and result.category == category
    assert result.reason


@pytest.mark.parametrize(
    "email",
    [
        "abc",
        "a@@x.com",
        "a@x",
        ".a@x.com",
        "a..b@x.com",
        "a b@x.com",
        "a@-x.com",
        "a@x.c",
        "a@x.12",
        "a" * 65 + "@x.com",
    ],
)
def test_syntax(email):
    assert one(email).category == "INVALID_SYNTAX"


@pytest.mark.parametrize("email", ["", None, "  "])
def test_blanks(email):
    assert one(email).category == "EMPTY_VALUE"


def test_normalization_preserves_raw():
    raw = '  "IN\u200bFO @ acme . com"  '
    result = one(raw)
    assert result.original_email == raw
    assert result.normalized_email == "info@acme.com"


def test_co_requires_explicit_evidence():
    result = one(
        "acquisitions@grossmancompany.co",
        domain_corrections={"grossmancompany.co": "grossmancompany.com"},
    )
    assert result.status == Status.CORRECTED
    assert result.final_email.endswith(".com")


@pytest.mark.parametrize("email", ["2067@scottsdaleshadows.com", "2080@scottsdaleshadows.com"])
def test_numeric_review(email):
    assert one(email).status == Status.REVIEW


def test_exact_and_corrected_duplicates_and_domain_cap():
    values = ["A@corp.com", "a@corp.com", "info@corp.comt", "info@corp.com", "b@corp.com"]
    results = process_emails(values)
    assert [r.status for r in results] == [
        Status.VALID,
        Status.REMOVED,
        Status.CORRECTED,
        Status.REMOVED,
        Status.REMOVED,
    ]
    assert results[-1].category == "EXCESS_DOMAIN"
    assert results[3].category == "DUPLICATE"


def test_corrected_rejection_keeps_audit():
    result = process_emails(["info@acme.com", "einfo@acme.com"])[1]
    assert result.status == Status.REMOVED and result.was_corrected
    assert "correction applied" in result.reason
    assert result.final_email == "info@acme.com"


def test_domain_cap_first_two():
    results = process_emails([f"{p}@retsy.com" for p in ("karen", "chris", "shawna", "lara")])
    assert [r.category for r in results] == ["VALID", "VALID", "EXCESS_DOMAIN", "EXCESS_DOMAIN"]


def test_free_providers_exempt_and_reviews_do_not_consume_capacity():
    for provider in [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "icloud.com",
        "aol.com",
    ]:
        assert all(
            r.status == Status.VALID
            for r in process_emails([f"person{i}@{provider}" for i in range(5)])
        )
    results = process_emails(["1234@corp.com", "one@corp.com", "two@corp.com"])
    assert [r.status for r in results] == [Status.REVIEW, Status.VALID, Status.VALID]


@pytest.mark.parametrize(
    "email,option",
    [
        ("johns@gmail.com", "strict_examples"),
        ("fake@gmail.com", "placeholders"),
        ("foo@mailinator.com", "disposable"),
        ("person@vtext.com", "sms_gateways"),
        ("a@leads.leadrouter.com", "lead_routers"),
        ("8c4075d5481d476e945486754f783364@sentry.io", "system_generated"),
    ],
)
def test_optional_rules(email, option):
    assert one(email, **{option: False}).status == Status.VALID


@pytest.mark.parametrize(
    "email,option",
    [
        ("928-776-0050info@hoamco.com", "phone_prefixes"),
        ("20info@acme.com", "accidental_20"),
        ("einfo@acme.com", "leading_junk"),
        ("a@acme.comt", "tld_corrections"),
        ("a@gmail.comreceive", "trailing_junk"),
    ],
)
def test_corrections_can_be_disabled(email, option):
    result = one(email, **{option: False})
    assert result.final_email == email and not result.was_corrected


def test_clean_export_and_formula_safety():
    results = process_emails(
        ["a@corp.com", "b@corp.comt", "a@corp.com", "123@corp.com", "=1+1", None]
    )
    stream = io.StringIO()
    assert write_csv(results, stream, "clean") == 2
    assert list(csv.reader(io.StringIO(stream.getvalue()))) == [
        ["email"],
        ["a@corp.com"],
        ["b@corp.com"],
    ]
    stream = io.StringIO()
    write_csv(results, stream, "full")
    assert "'=1+1" in stream.getvalue()


def test_engine_has_no_network(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Network access forbidden")

    monkeypatch.setattr(socket, "socket", forbidden)
    assert one("alex@corp.com").status == Status.VALID


@pytest.mark.parametrize("limit", [1, 2, 3, 5, 9])
def test_custom_domain_caps(limit):
    results = process_emails(
        [f"person{i}@business.com" for i in range(12)], Options(company_domain_limit=limit)
    )
    assert sum(r.status == Status.VALID for r in results) == limit
    assert all(r.category == "EXCESS_DOMAIN" for r in results[limit:])


@pytest.mark.parametrize(
    "extension",
    [
        "webp",
        "png",
        "jpg",
        "jpeg",
        "gif",
        "svg",
        "css",
        "js",
        "ico",
        "woff",
        "woff2",
        "ttf",
        "mp4",
        "webm",
        "pdf",
        "zip",
    ],
)
def test_all_asset_extensions(extension):
    assert one("asset@150x150." + extension).category == "INVALID_ASSET_STRING"


def test_high_entropy_requires_infrastructure_context():
    local = "a1z9k4m7p2r8t5w3x6n0bqsv"
    assert one(local + "@sentry.io").category == "SYSTEM_GENERATED"
    assert one(local + "@ordinary-business.com").status == Status.VALID
