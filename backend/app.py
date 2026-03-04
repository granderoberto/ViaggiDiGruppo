from __future__ import annotations

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from routes.auth import auth_bp
from routes.geo import geo_bp
from routes.health import health_bp
from routes.trips import trips_bp


"""
Factory Flask principale del progetto.

- Centralizza configurazione ambiente (Mongo/CORS/porta) da `config.py`.
- Registra tutte le blueprint sotto prefisso `/api` per mantenere URL coerenti.
- Uniforma la forma degli errori JSON in envelope `{ok:false,error:{...}}`.

Assunzione operativa: il frontend consuma sempre envelope JSON, ad eccezione
degli endpoint binari (es. PDF) che rispondono con `application/pdf`.
"""


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        MONGO_URI=Config.MONGO_URI,
        DB_NAME=Config.DB_NAME,
        CORS_ORIGINS=Config.CORS_ORIGINS,
        PORT=Config.PORT,
    )

    """
    CORS: supporta più origini separate da virgola in `.env`.
    In fase scolastica locale si usano tipicamente `localhost:5173` e `localhost:4200`.
    """
    allowed_origins = [origin.strip() for origin in Config.CORS_ORIGINS.split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins or "*"}})

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(geo_bp, url_prefix="/api")
    app.register_blueprint(trips_bp, url_prefix="/api")

    """
    Error handler applicativo per errori HTTP noti (400/401/404...).
    Mantiene un payload prevedibile per il client React:
    `{ ok:false, error:{ code, message } }`.
    """
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        response = {
            "ok": False,
            "error": {
                "code": err.name.upper().replace(" ", "_"),
                "message": err.description,
            },
        }
        return jsonify(response), err.code

    """
    Fallback per eccezioni inattese.
    In debug lascia `details` utile alla QA; in produzione può essere ridotto.
    """
    @app.errorhandler(Exception)
    def handle_unexpected_error(err: Exception):
        response = {
            "ok": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Errore interno del server",
                "details": str(err),
            },
        }
        return jsonify(response), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
