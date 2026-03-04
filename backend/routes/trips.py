from __future__ import annotations

import re

from bson import ObjectId
from flask import Blueprint, jsonify, request, send_file
from io import BytesIO

from db import get_db
from utils.pdf_builder import build_trip_filename, build_trip_pdf
from utils.serialization import serialize_document


trips_bp = Blueprint("trips", __name__)


def _normalize_budget(raw_budget):
    """
    Normalizza e valida il campo budget.

    Input accettato: oggetto `{ amount, currency }` con `amount >= 0`.
    - `currency` viene forzata in uppercase ISO-like a 3 lettere.
    - Ritorna `(budget_normalizzato, None)` oppure `(None, messaggio_errore)`.

    Nota: l'assenza del budget è gestita a livello route con `None`/`$unset`.
    """
    if raw_budget is None:
        return None, None

    if not isinstance(raw_budget, dict):
        return None, "budget deve essere un oggetto"

    amount_raw = raw_budget.get("amount")
    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return None, "budget.amount deve essere un numero"

    if amount < 0:
        return None, "budget.amount deve essere >= 0"

    currency_raw = raw_budget.get("currency", "EUR")
    if currency_raw is None:
        currency_raw = "EUR"

    if not isinstance(currency_raw, str):
        return None, "budget.currency deve essere una stringa di 3 lettere"

    currency = currency_raw.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}", currency):
        return None, "budget.currency deve essere una stringa di 3 lettere"

    return {"amount": amount, "currency": currency}, None


@trips_bp.get("/trips")
def list_trips():
    """
    Lista viaggi con filtri opzionali `status` e `q`.

    - Usa proiezione ridotta per la lista (campi necessari alla dashboard/mappa).
    - Applica serializzazione uniforme ObjectId -> string (`id`).
    - Mantiene envelope `{ok:true,data:{trips:[...]}}`.
    """
    try:
        db = get_db()

        status = request.args.get("status", type=str)
        query_text = request.args.get("q", type=str)

        mongo_filter: dict = {}

        if status:
            mongo_filter["status"] = status.strip().upper()

        if query_text and query_text.strip():
            escaped_query = re.escape(query_text.strip())
            regex = {"$regex": escaped_query, "$options": "i"}
            mongo_filter["$or"] = [{"title": regex}, {"destination.city": regex}]

        projection = {
            "_id": 1,
            "title": 1,
            "status": 1,
            "startDate": 1,
            "endDate": 1,
            "destination.city": 1,
            "destination.country": 1,
            "destination.lat": 1,
            "destination.lng": 1,
            "budget.amount": 1,
            "budget.currency": 1,
        }

        trips_cursor = db["trips"].find(mongo_filter, projection)
        trips = [serialize_document(trip) for trip in trips_cursor]

        return jsonify({"ok": True, "data": {"trips": trips}}), 200
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante il recupero dei viaggi",
                        "details": str(err),
                    },
                }
            ),
            500,
        )


@trips_bp.post("/trips")
def create_trip():
    """
    Crea un viaggio con validazione minima server-side.

    Campi obbligatori: `title`, `startDate`, `destination.city`.
    Campi opzionali: struttura non uniforme (participants/activities/expenses/notes,
    route/checklist/weatherPreference/endDate/budget).

    Errori previsti:
    - 400 per body non valido o campi obbligatori mancanti.
    - 400 per budget non valido.
    - 201 con record creato serializzato in caso di successo.
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

    title = payload.get("title")
    start_date = payload.get("startDate")
    destination = payload.get("destination")
    destination_city = destination.get("city") if isinstance(destination, dict) else None

    missing_fields = []
    if not isinstance(title, str) or not title.strip():
        missing_fields.append("title")
    if not isinstance(start_date, str) or not start_date.strip():
        missing_fields.append("startDate")
    if not isinstance(destination_city, str) or not destination_city.strip():
        missing_fields.append("destination.city")

    if missing_fields:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "VALIDATION",
                        "message": "Campi obbligatori mancanti o non validi",
                        "details": {"missing": missing_fields},
                    },
                }
            ),
            400,
        )

    trip_doc = dict(payload)
    trip_doc["title"] = title.strip()
    trip_doc["startDate"] = start_date.strip()

    normalized_destination = dict(destination)
    normalized_destination["city"] = destination_city.strip()
    trip_doc["destination"] = normalized_destination

    if not trip_doc.get("status"):
        trip_doc["status"] = "PLANNED"

    if "budget" in trip_doc:
        raw_budget = trip_doc.get("budget")
        if raw_budget is None:
            trip_doc.pop("budget", None)
        else:
            normalized_budget, budget_error = _normalize_budget(raw_budget)
            if budget_error:
                return (
                    jsonify(
                        {
                            "ok": False,
                            "error": {
                                "code": "VALIDATION",
                                "message": budget_error,
                            },
                        }
                    ),
                    400,
                )
            trip_doc["budget"] = normalized_budget

    for array_field in ("participants", "activities", "expenses", "notes"):
        if not isinstance(trip_doc.get(array_field), list):
            trip_doc[array_field] = []

    try:
        db = get_db()
        insert_result = db["trips"].insert_one(trip_doc)
        created_trip = db["trips"].find_one({"_id": insert_result.inserted_id})
        serialized_trip = serialize_document(created_trip)

        return (
            jsonify(
                {
                    "ok": True,
                    "data": {
                        "id": str(insert_result.inserted_id),
                        "trip": serialized_trip,
                    },
                }
            ),
            201,
        )
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante la creazione del viaggio",
                        "details": str(err),
                    },
                }
            ),
            500,
        )


@trips_bp.get("/trips/<trip_id>")
def get_trip_by_id(trip_id: str):
    """
    Dettaglio viaggio per ID Mongo.

    Punto delicato: `ObjectId` va validato prima della query per evitare eccezioni
    e rispondere con 400 coerente (`INVALID_ID`).
    """
    if not ObjectId.is_valid(trip_id):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INVALID_ID",
                        "message": "ID viaggio non valido",
                    },
                }
            ),
            400,
        )

    try:
        db = get_db()
        trip = db["trips"].find_one({"_id": ObjectId(trip_id)})

        if trip is None:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Trip not found",
                        },
                    }
                ),
                404,
            )

        return jsonify({"ok": True, "data": {"trip": serialize_document(trip)}}), 200
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante il recupero del viaggio",
                        "details": str(err),
                    },
                }
            ),
            500,
        )


@trips_bp.put("/trips/<trip_id>")
def update_trip(trip_id: str):
    """
    Aggiornamento parziale (PATCH-like via PUT) sui campi ammessi.

    Comportamento budget:
    - `budget` oggetto valido -> `$set` con versione normalizzata.
    - `budget: null` -> rimozione completa con `$unset`.

    Restituisce:
    - 400 per ID/body/campi non aggiornabili o budget invalido.
    - 404 se il viaggio non esiste.
    - 200 con trip aggiornato serializzato.
    """
    if not ObjectId.is_valid(trip_id):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INVALID_ID",
                        "message": "ID viaggio non valido",
                    },
                }
            ),
            400,
        )

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

    allowed_fields = {
        "title",
        "status",
        "destination",
        "startDate",
        "endDate",
        "description",
        "participants",
        "activities",
        "expenses",
        "notes",
        "route",
        "checklist",
        "weatherPreference",
        "budget",
    }

    update_fields = {key: value for key, value in payload.items() if key in allowed_fields}
    unset_fields = {}

    if "title" in update_fields and isinstance(update_fields["title"], str):
        update_fields["title"] = update_fields["title"].strip()
    if "startDate" in update_fields and isinstance(update_fields["startDate"], str):
        update_fields["startDate"] = update_fields["startDate"].strip()
    if "endDate" in update_fields and isinstance(update_fields["endDate"], str):
        update_fields["endDate"] = update_fields["endDate"].strip()
    if "status" in update_fields and isinstance(update_fields["status"], str):
        update_fields["status"] = update_fields["status"].strip().upper()

    if "budget" in update_fields:
        raw_budget = update_fields.get("budget")
        if raw_budget is None:
            update_fields.pop("budget", None)
            unset_fields["budget"] = ""
        else:
            normalized_budget, budget_error = _normalize_budget(raw_budget)
            if budget_error:
                return (
                    jsonify(
                        {
                            "ok": False,
                            "error": {
                                "code": "VALIDATION",
                                "message": budget_error,
                            },
                        }
                    ),
                    400,
                )
            update_fields["budget"] = normalized_budget

    if not update_fields and not unset_fields:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "VALIDATION",
                        "message": "Nessun campo aggiornabile fornito",
                    },
                }
            ),
            400,
        )

    try:
        db = get_db()
        mongo_update = {}
        if update_fields:
            mongo_update["$set"] = update_fields
        if unset_fields:
            mongo_update["$unset"] = unset_fields

        result = db["trips"].update_one({"_id": ObjectId(trip_id)}, mongo_update)

        if result.matched_count == 0:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Trip not found",
                        },
                    }
                ),
                404,
            )

        updated_trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
        return jsonify({"ok": True, "data": {"trip": serialize_document(updated_trip)}}), 200
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante l'aggiornamento del viaggio",
                        "details": str(err),
                    },
                }
            ),
            500,
        )


@trips_bp.delete("/trips/<trip_id>")
def delete_trip(trip_id: str):
    """
    Elimina un viaggio per ID.

    Mantiene semantica errori coerente con le altre route:
    - 400 ID invalido
    - 404 record non trovato
    - 200 delete avvenuta
    """
    if not ObjectId.is_valid(trip_id):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INVALID_ID",
                        "message": "ID viaggio non valido",
                    },
                }
            ),
            400,
        )

    try:
        db = get_db()
        result = db["trips"].delete_one({"_id": ObjectId(trip_id)})

        if result.deleted_count == 0:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Trip not found",
                        },
                    }
                ),
                404,
            )

        return jsonify({"ok": True, "data": {"deleted": True}}), 200
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Errore durante l'eliminazione del viaggio",
                        "details": str(err),
                    },
                }
            ),
            500,
        )


@trips_bp.get("/trips/<trip_id>/pdf")
def export_trip_pdf(trip_id: str):
    """
    Esporta PDF del viaggio.

    Differenza rispetto alle altre API: risposta binaria `application/pdf`
    (fuori envelope JSON) quando l'operazione va a buon fine.
    In caso di errore, torna al formato envelope `{ok:false,error}`.
    """
    if not ObjectId.is_valid(trip_id):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "INVALID_ID",
                        "message": "ID viaggio non valido",
                    },
                }
            ),
            400,
        )

    try:
        db = get_db()
        trip = db["trips"].find_one({"_id": ObjectId(trip_id)})

        if trip is None:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Trip not found",
                        },
                    }
                ),
                404,
            )

        trip_data = serialize_document(trip) or {}
        pdf_bytes = build_trip_pdf(trip_data)
        filename = build_trip_filename(trip_data)

        buffer = BytesIO(pdf_bytes)
        return send_file(
            buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "PDF_ERROR",
                        "message": "Errore durante la generazione del PDF",
                        "details": str(err),
                    },
                }
            ),
            500,
        )
