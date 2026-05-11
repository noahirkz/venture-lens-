from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_env: str = "development"
    app_name: str = "VentureLens"
    debug: bool = False

    # Supabase — empty defaults so tests/import never crash on missing env.
    # Endpoints that hit Supabase will fail clearly at request time instead.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""              # service-role key (bypasses RLS)
    # JWT secret used by Supabase Auth (HS256). Found in Supabase project settings → API.
    supabase_jwt_secret: str = ""

    # Anthropic
    anthropic_api_key: str = ""

    # Resend (email)
    resend_api_key: str = ""

    # CORS — comma-separated origins
    cors_origins: str = "http://localhost:3000"

    # Admin token for protected ops (e.g. /scraper/run). Required in prod.
    admin_token: str = ""

    # Rate limiting (daily caps)
    rate_limit_anon_per_day: int = 3
    rate_limit_user_per_day: int = 7

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
