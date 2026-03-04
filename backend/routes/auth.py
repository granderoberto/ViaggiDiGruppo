from __future__ import annotations

from flask import Blueprint, jsonify, request

from db import get_db


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    """
    Login minimale per ambiente didattico.

    Payload atteso:
    {
        "username": "string non vuota",
        "password": "string non vuota"
    }

    Esiti principali:
    - 200: credenziali valide, ritorna profilo utente serializzato con `id` stringa.
    - 400: body JSON mancante/non valido o campi obbligatori assenti.
    - 401: credenziali errate.

    Assunzione: autenticazione stateless senza token (scope scolastico), con
    controllo diretto su collection `users` seedata.
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "VALIDATION",
                        "message": "Body JSON non valido",
                    },
                }
            ),
            400,
        )

    username = payload.get("username")
    password = payload.get("password")

    if not isinstance(username, str) or not username.strip() or not isinstance(password, str) or not password:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "VALIDATION",
                        "message": "username e password sono obbligatori",
                    },
                }
            ),
            400,
        )

    try:
        db = get_db()
        user = db["users"].find_one({"username": username.strip()})

        if user is None or user.get("password") != password:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": {
                            "code": "INVALID_CREDENTIALS",
                            "message": "Credenziali non valide",
                        },
                    }
                ),
                401,
            )

        return (
            jsonify(
                {
                    "ok": True,
                    "data": {
                        "user": {
                            "id": str(user.get("_id")),
                            "username": user.get("username"),
                            "displayName": user.get("displayName"),
                            "role": user.get("role"),
                        }
                    },
                }
            ),
            200,
        )
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante il login",
                        "details": str(err),
                    },
                }
            ),
            500,
        )
