from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 600
    frontend_url: str = "http://localhost:5173"
    env: str = "development"

    @field_validator("database_url")
    @classmethod
    def _normalizar_esquema_postgres(cls, v: str) -> str:
        # Varios proveedores (Heroku, Render, EasyPanel) generan el connection
        # string con "postgres://", esquema que SQLAlchemy 2.x ya no resuelve
        # (NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres).
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v[len("postgres://") :]
        return v


settings = Settings()
