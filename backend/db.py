from __future__ import annotations
from pymongo import MongoClient
from config import Config


_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(Config.MONGO_URI)
    return _client


def get_db():
    client = get_client()
    if Config.DB_NAME:
        return client[Config.DB_NAME]

    default_db = client.get_default_database()
    if default_db is None:
        raise RuntimeError("DB_NAME non configurato e nessun database di default presente nella URI")
    return default_db
