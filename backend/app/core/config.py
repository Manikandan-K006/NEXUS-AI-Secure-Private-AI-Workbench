"""Application configuration.

Secrets come from environment / .env and are never exposed to the frontend.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEXUS_", env_file=".env", extra="ignore")

    # Security
    secret_key: str = "nexus-local-dev-only-change-me-0123456789abcdef"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    # Listening
    host: str = "127.0.0.1"
    port: int = 8080

    # Air-gap guard
    air_gap: bool = True

    # Model gateway (Ollama)
    ollama_base: str = "http://127.0.0.1:11434"
    ollama_timeout: int = 300
    embed_model: str = "bge-m3"

    # Storage
    upload_dir: Path = ROOT / "data" / "uploads"
    deliverable_dir: Path = ROOT / "data" / "deliverables"
    kb_dir: Path = ROOT / "data" / "kb"
    vector_dir: Path = ROOT / "data" / "vector"
    audit_dir: Path = ROOT / "data" / "audit"

    # Sandbox
    sandbox_user: str = "nobody"

    # Bootstrap admin
    admin_user: str = "admin"
    admin_password: str = "admin"
    admin_email: str = "admin@local"

    # File limits
    max_upload_mb: int = 200
    max_upload_bytes: int = 200 * 1024 * 1024
    allowed_mime: tuple[str, ...] = (
        "application/pdf",
        "image/png",
        "image/jpeg",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    allowed_ext: tuple[str, ...] = (".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".docx")

    def ensure_dirs(self) -> None:
        for p in (self.upload_dir, self.deliverable_dir, self.kb_dir,
                  self.vector_dir, self.audit_dir):
            p.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.ensure_dirs()
    return s
