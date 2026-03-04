from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv()


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Variabile ambiente obbligatoria mancante: {name}")
    return value

@dataclass(frozen=True)
class Config:
    MONGO_URI: str = _required_env("MONGO_URI")
    DB_NAME: str | None = os.getenv("DB_NAME")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    PORT: int = int(os.getenv("PORT", "5000"))
