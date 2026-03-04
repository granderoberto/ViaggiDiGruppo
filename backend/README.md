# Backend API - ViaggiDiGruppo

Backend Flask per la SPA, con MongoDB Atlas.

## Requisiti
- Python 3.11+
- Database MongoDB (Atlas)

## Setup
1. Entra nella cartella backend:
   - `cd backend`
2. Crea e attiva il virtual environment:
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
3. Installa le dipendenze:
   - `pip install -r requirements.txt`

## Configurazione `.env`
Crea/aggiorna `backend/.env`:

```env
MONGO_URI="mongodb+srv://<user>:<password>@<cluster>/viaggi_spa?appName=Cluster0"
DB_NAME="viaggi_spa"
CORS_ORIGINS="http://localhost:4200,http://localhost:5173"
PORT=5001
```

Note:
- `MONGO_URI` è obbligatoria.
- `CORS_ORIGINS` può contenere più origini separate da virgola.

## Avvio server
Da `backend/`:

- `python app.py`

Server in ascolto su:
- `http://127.0.0.1:<PORT>`

## Endpoint principali
Base URL: `/api`

- `GET /api/health`
- `POST /api/login`
- `GET /api/trips`
- `GET /api/trips/<id>`
- `POST /api/trips`
- `PUT /api/trips/<id>`
- `DELETE /api/trips/<id>`
- `GET /api/trips/<id>/pdf`

## Esempi rapidi (curl)
Health:

- `curl http://127.0.0.1:5001/api/health`

Login:

- `curl -X POST http://127.0.0.1:5001/api/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo"}'`

Lista viaggi:

- `curl http://127.0.0.1:5001/api/trips`
- `curl "http://127.0.0.1:5001/api/trips?status=PLANNED"`
- `curl "http://127.0.0.1:5001/api/trips?q=Roma"`

Dettaglio viaggio:

- `curl http://127.0.0.1:5001/api/trips/<id>`

Creazione viaggio:

- `curl -X POST http://127.0.0.1:5001/api/trips -H "Content-Type: application/json" -d '{"title":"Weekend","startDate":"2026-04-10","destination":{"city":"Bologna"}}'`

Aggiornamento parziale:

- `curl -X PUT http://127.0.0.1:5001/api/trips/<id> -H "Content-Type: application/json" -d '{"status":"DONE"}'`

Eliminazione:

- `curl -X DELETE http://127.0.0.1:5001/api/trips/<id>`

Download PDF:

- `curl -L -o trip.pdf http://127.0.0.1:5001/api/trips/<id>/pdf`
- `curl -i -L -o Viaggio_test.pdf http://127.0.0.1:5001/api/trips/<id>/pdf` (verifica header `Content-Disposition`)
- `curl -s http://127.0.0.1:5001/api/trips | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["data"]["trips"][0]["id"])'` seguito da download PDF con quell'id

## Formato risposte
- Successo: `{ "ok": true, "data": ... }`
- Errore: `{ "ok": false, "error": { "code": "...", "message": "...", "details": ...? } }`
