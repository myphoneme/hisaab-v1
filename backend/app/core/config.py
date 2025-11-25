from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Hisaab Accounting"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hisaab"
    DATABASE_ECHO: bool = False

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Company Settings (Default)
    COMPANY_NAME: str = "Your Company Name"
    COMPANY_GSTIN: str = ""
    COMPANY_PAN: str = ""
    COMPANY_STATE: str = ""
    COMPANY_STATE_CODE: str = ""

    # Tax Settings
    DEFAULT_GST_RATE: float = 18.0
    TDS_SECTIONS: list = ["194C", "194J", "194H", "194I", "194Q"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
