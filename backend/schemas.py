from pydantic import BaseModel, ConfigDict, Field

from engine.models import Options


class LoginInput(BaseModel):
    username: str = Field(max_length=256)
    password: str = Field(max_length=1024)


class PasteInput(BaseModel):
    text: str = Field(min_length=1, max_length=10_000_000)
    filename: str = Field(default="Pasted emails", max_length=120)


class CleaningOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    company_domain_limit: int = Field(default=2, ge=1, le=100000)
    placeholders: bool = True
    strict_examples: bool = True
    assets: bool = True
    system_generated: bool = True
    sms_gateways: bool = True
    lead_routers: bool = True
    disposable: bool = True
    phone_prefixes: bool = True
    accidental_20: bool = True
    trailing_junk: bool = True
    tld_corrections: bool = True
    leading_junk: bool = True

    def engine_options(self):
        return Options(**self.model_dump())


class ProcessInput(BaseModel):
    column: int = Field(ge=0)
    options: CleaningOptions = Field(default_factory=CleaningOptions)
