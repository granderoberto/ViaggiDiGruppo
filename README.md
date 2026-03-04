# ViaggiDiGruppo

Applicazione full-stack per la gestione di viaggi di gruppo con autenticazione, CRUD completo, mappa interattiva e export PDF del dettaglio viaggio.

## Funzionalità principali
- Login utente (seed demo) con protezione route frontend.
- Lista viaggi con ricerca/filtro e stati loading/errore/vuoto.
- Creazione viaggio con validazioni, paese/città reali e coordinate (GPS/mappa/autocomplete).
- Dettaglio viaggio con modifica sezioni (partecipanti, attività, spese, note, budget) e persistenza.
- Pagina mappa con legenda, marker selezionabile, mia posizione e distanza.
- Download PDF del viaggio con layout migliorato.

## Stack / Tecnologie
- **Backend:** Python 3, Flask, Flask-CORS, PyMongo, ReportLab, python-dotenv
- **Frontend:** React + TypeScript, Vite, React Router, Leaflet + React-Leaflet
- **Database:** MongoDB Atlas (seed via `mongosh`)

## Requisiti & Setup
### Prerequisiti
- Node.js 18+
- Python 3.11+
- MongoDB Atlas accessibile
- `mongosh` installato

### Variabili ambiente
- `backend/.env`
  - `MONGO_URI`
  - `DB_NAME` (es. `viaggi_spa`)
  - `CORS_ORIGINS` (es. `http://localhost:5173,http://localhost:4200`)
  - `PORT` (default progetto: `5001`)
- `frontend/.env`
  - `VITE_API_BASE_URL` (es. `http://localhost:5001/api`)

Sono inclusi template pronti:
- `backend/.env.example`
- `frontend/.env.example`

### Seed DB
Dalla root repository:

```bash
mongosh "<MONGO_URI_CON_DB>" --file db/seed.js
```

Credenziali demo seed:
- `luca / 1234`
- `sara / 1234`
- `admin / admin`

## Avvio progetto
### Backend
```bash
cd backend
source ../.venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Summary
Base URL: `http://localhost:5001/api`

- `GET /health`
- `POST /login`
- `GET /trips`
- `GET /trips/:id`
- `POST /trips`
- `PUT /trips/:id`
- `DELETE /trips/:id`
- `GET /trips/:id/pdf`

Risposte API JSON (tranne PDF):
- Successo: `{ "ok": true, "data": ... }`
- Errore: `{ "ok": false, "error": { "code", "message", ... } }`

## Checklist consegna (A..J)
- A) Seed + FE/BE: ✅
- B) Login: ✅
- C) Lista viaggi: ✅
- D) Dettaglio viaggio: ✅
- E) Crea viaggio: ✅
- F) Partecipanti: ✅
- G) Attività: ✅
- H) Spese + riepilogo: ✅
  - Budget: ✅
- I) Mappa: ✅
  - Legenda, mia posizione, distanza: ✅
- J) PDF: ✅
  - Layout migliorato: ✅

## Extra implementati
- Country/city reali con autocomplete e dataset dedicati.
- GPS + selezione punto da mappa + conferma su cambio posizione.
- Gestione budget rispetto al totale spese.
- Mappa avanzata con marker selezionato, centratura e calcolo distanza.
- PDF con sezioni strutturate, tabelle, footer e paginazione.

## Come provare velocemente
1. Eseguire seed DB.
2. Avviare backend su `5001`.
3. Avviare frontend su `5173`.
4. Login con `luca / 1234`.
5. Testare creazione viaggio, modifica dettaglio, mappa e download PDF.

Test QA inclusi:
- Script API: `tests/api.sh`
- Verifica API Python: `tests/backend_api_verify.py`
- Checklist UI manuale: `tests/ui-checklist.md`

## Pulizia repo effettuata
Rimossi file non usati/boilerplate:
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/features/trips/geo.ts`
- `frontend/src/features/trips/useCitySearch.ts`
- `frontend/src/features/trips/useCountries.ts`

## Note / limitazioni
- Se un processo usa già la porta `5001`, il backend non parte finché non si libera la porta.
- Geolocalizzazione dipende dal browser e dai permessi utente.
- Servizi geocoding/Nominatim possono avere rate limit o indisponibilità temporanea.
- Le mappe richiedono connessione internet per i tile OpenStreetMap.

## CORS e porte
Configurazione attesa in locale:
- Backend: `http://localhost:5001`
- Frontend: `http://localhost:5173`
- `CORS_ORIGINS` backend deve includere `http://localhost:5173`.
