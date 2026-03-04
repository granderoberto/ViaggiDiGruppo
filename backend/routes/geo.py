from __future__ import annotations

import json
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Blueprint, jsonify, request


geo_bp = Blueprint("geo", __name__)

_CACHE_TTL_SECONDS = 60 * 60 * 24
_REQUEST_INTERVAL_SECONDS = 1.0
_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_cache_lock = threading.Lock()
_nominatim_lock = threading.Lock()
_last_nominatim_call = 0.0


def _cache_get(key: str) -> list[dict[str, Any]] | None:
    now = time.time()
    with _cache_lock:
        value = _cache.get(key)
        if value is None:
            return None

        expires_at, payload = value
        if expires_at < now:
            _cache.pop(key, None)
            return None

        return payload


def _cache_set(key: str, payload: list[dict[str, Any]]) -> None:
    with _cache_lock:
        _cache[key] = (time.time() + _CACHE_TTL_SECONDS, payload)


def _map_item(item: dict[str, Any]) -> dict[str, Any] | None:
    lat_raw = item.get("lat")
    lon_raw = item.get("lon")
    display_name = item.get("display_name")

    if not isinstance(display_name, str):
        return None

    try:
        lat = float(lat_raw)
        lng = float(lon_raw)
    except (TypeError, ValueError):
        return None

    address = item.get("address") if isinstance(item.get("address"), dict) else {}
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("hamlet")
    )

    city_label = city if isinstance(city, str) and city.strip() else display_name

    return {
        "label": display_name,
        "city": city_label,
        "lat": lat,
        "lng": lng,
    }


def _query_nominatim(country: str, query: str) -> list[dict[str, Any]]:
    global _last_nominatim_call

    with _nominatim_lock:
        elapsed = time.time() - _last_nominatim_call
        if elapsed < _REQUEST_INTERVAL_SECONDS:
            time.sleep(_REQUEST_INTERVAL_SECONDS - elapsed)

        params = {
            "format": "json",
            "addressdetails": 1,
            "limit": 8,
            "countrycodes": country.lower(),
            "q": query,
        }
        url = f"https://nominatim.openstreetmap.org/search?{urlencode(params)}"
        req = Request(
            url,
            headers={
                "User-Agent": "ViaggiDiGruppo/1.0 (didattica; backend proxy)",
                "Accept": "application/json",
            },
        )

        with urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8")

        _last_nominatim_call = time.time()

    raw_data = json.loads(body)
    if not isinstance(raw_data, list):
        return []

    items: list[dict[str, Any]] = []
    for raw_item in raw_data:
        if not isinstance(raw_item, dict):
            continue
        mapped = _map_item(raw_item)
        if mapped is not None:
            items.append(mapped)

    return items[:8]


@geo_bp.get("/geo/cities")
def search_cities():
    country = (request.args.get("country", type=str) or "").strip().upper()
    query = (request.args.get("q", type=str) or "").strip()

    if len(country) != 2 or not country.isalpha():
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "VALIDATION",
                        "message": "Parametro country non valido",
                    },
                }
            ),
            400,
        )

    if len(query) < 3:
        return jsonify({"ok": True, "data": {"items": []}}), 200

    cache_key = f"{country}:{query.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({"ok": True, "data": {"items": cached}}), 200

    try:
        items = _query_nominatim(country, query)
        _cache_set(cache_key, items)
        return jsonify({"ok": True, "data": {"items": items}}), 200
    except HTTPError as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "GEO_UPSTREAM_ERROR",
                        "message": "Servizio città non disponibile",
                        "details": f"HTTP {err.code}",
                    },
                }
            ),
            503,
        )
    except (URLError, TimeoutError, json.JSONDecodeError) as err:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": {
                        "code": "GEO_NETWORK_ERROR",
                        "message": "Servizio città non disponibile",
                        "details": str(err),
                    },
                }
            ),
            503,
        )
