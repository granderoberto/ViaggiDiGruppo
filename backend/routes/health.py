from __future__ import annotations

from flask import Blueprint, jsonify

from db import get_db


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    try:
        db = get_db()
        db.command("ping")
        return jsonify({"ok": True, "data": {"status": "ok", "db": "ok"}}), 200
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "DB_DOWN",
                        "message": "Database non raggiungibile",
                        "details": str(err),
                    },
                }
            ),
            500,
        )
