from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/axelseo"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    clerk_publishable_key: str = ""
    clerk_secret_key: str = ""
    secret_key: str = "change-me-in-production"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Google OAuth (Search Console)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/integrations/gsc/callback"
    google_scopes: list[str] = ["https://www.googleapis.com/auth/webmasters.readonly"]

    # Token encryption (Fernet key for OAuth tokens at rest)
    token_encryption_key: str = ""

    # S3 / R2
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = "axelseo-reports"
    s3_public_url: str = ""

    # Logging
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
