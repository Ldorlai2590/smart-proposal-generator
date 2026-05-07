from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str
    redis_url: str = "redis://localhost:6379"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    docuforge_api_key: str = ""
    resend_api_key: str = ""
    email_from: str = "propuestas@smartproposal.ai"
    apitally_client_id: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    # Used by the embeddings service when a real provider is wired in
    # (e.g. OpenAI text-embedding-3-small or Cohere embed-multilingual-v3)
    embedding_api_key: str = ""


settings = Settings()  # type: ignore[call-arg]
