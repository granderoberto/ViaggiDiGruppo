from __future__ import annotations


def require_fields(payload: dict, fields: list[str]) -> list[str]:
    """
    Helper generico per trovare campi mancanti/vuoti in payload JSON.

    Ritorna la lista dei nomi campo non validi, utile per costruire errori 400
    dettagliati senza ripetere logica in ogni route.
    """
    missing = []
    for field in fields:
        value = payload.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return missing
