from __future__ import annotations

from pydantic import BaseModel, field_validator


class AuditConfig(BaseModel):
    """Configuration for the SEO auditor."""

    run_lighthouse: bool = True
    lighthouse_sample_size: int = 5
    lighthouse_timeout_seconds: int = 120
    psi_api_key: str = ""
    thin_content_threshold: int = 300
    max_title_length: int = 60
    min_title_length: int = 30
    max_meta_desc_length: int = 160
    min_meta_desc_length: int = 120
    max_redirect_hops: int = 2
    max_links_per_page: int = 100

    @field_validator("lighthouse_sample_size")
    @classmethod
    def clamp_sample(cls, v: int) -> int:
        return max(1, min(v, 20))
