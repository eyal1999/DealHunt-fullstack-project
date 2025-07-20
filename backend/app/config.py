from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ── AliExpress Affiliate defaults ────────────────────────────
    base_url: str = "https://api-sg.aliexpress.com/sync"
    app_key: str = Field(..., validation_alias="APP_KEY")
    app_secret: str = Field(..., validation_alias="APP_SECRET")
    tracking_id: str = Field(..., validation_alias="TRACKING_ID")
    v: str = "2.0"
    sign_method: str = "md5"

    ebay_token: str = Field(..., validation_alias="EBAY_TOKEN")
    ebay_refresh_token: str = Field(..., validation_alias="EBAY_REFRESH_TOKEN")
    ebay_client_id: str = Field(..., validation_alias="EBAY_CLIENT_ID")
    ebay_client_secret: str = Field(..., validation_alias="EBAY_CLIENT_SECRET")
    ebay_campaign_id: str = Field(..., validation_alias="EBAY_CAMPAIGN_ID")
    ebay_base_url: str = Field(
        "https://api.ebay.com",
        validation_alias="EBAY_BASE_URL",
    )

    # ── Presentation preferences ────────────────────────────────
    target_currency: str = "USD"
    target_language: str = "EN"
    
    # ── MongoDB settings ────────────────────────────────────────
    mongodb_uri: str = Field(
        "mongodb://localhost:27017/dealhunt", 
        env="MONGODB_URI"
    )
    db_name: str = "dealhunt"
    
    # ── JWT settings ──────────────────────────────────────────────
    secret_key: str = Field("dev_secret_key_change_in_production", validation_alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # ── Google OAuth settings ──────────────────────────────────────
    google_client_id: str = Field(..., validation_alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(..., validation_alias="GOOGLE_CLIENT_SECRET")
    
    # ── Email settings ──────────────────────────────────────────
    mail_username: str = Field(..., validation_alias="MAIL_USERNAME")
    mail_password: str = Field(..., validation_alias="MAIL_PASSWORD")
    mail_from: str = Field(..., validation_alias="MAIL_FROM")
    frontend_url: str = Field("http://localhost:3000", validation_alias="FRONTEND_URL")

    model_config = SettingsConfigDict(
        env_file=[
            Path(__file__).parent.parent.parent / ".env",  # Root level (Docker) - loaded first
            Path(__file__).parent.parent / ".env",        # Backend specific
            Path(__file__).parent.parent / ".env.local"   # Local development (highest priority) - loaded last
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
settings = Settings()