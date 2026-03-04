from __future__ import annotations

from bson import ObjectId


def serialize_value(value):
    """
    Serializzazione ricorsiva dei valori Mongo-friendly verso JSON-safe.

    Punto chiave: converte `ObjectId` in stringa anche dentro strutture annidate
    (liste/dizionari), così il frontend non dipende da tipi BSON.
    """
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    return value


def serialize_document(doc: dict | None) -> dict | None:
    """
    Serializza un documento Mongo e rinomina `_id` in `id`.

    Assunzione di contratto FE/BE: gli ID pubblici sono sempre nel campo `id`
    stringa, mai `_id`.
    """
    if doc is None:
        return None
    serialized = serialize_value(doc)
    if "_id" in serialized:
        serialized["id"] = serialized.pop("_id")
    return serialized
