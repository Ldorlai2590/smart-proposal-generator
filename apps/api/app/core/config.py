from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    redis_url: str = "redis://localhost:6379"
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""
    docuforge_api_key: str = ""
    resend_api_key: str = ""
    email_from: str = "propuestas@smartproposal.ai"
    apitally_client_id: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()  # type: ignore[call-arg]
