# Frontend SPA - Viaggi di Gruppo

Applicazione React + Vite + TypeScript collegata al backend Flask.

## Requisiti

- Node.js 20+
- Backend avviato su `http://localhost:5001`

## Configurazione ambiente

Il file `.env` è già presente con:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

## Avvio locale

Da `frontend/`:

```bash
npm install
npm run dev
```

La SPA sarà disponibile su `http://localhost:5173` (porta Vite predefinita).

## Pagine implementate

- `/login`
- `/trips`
- `/trips/new`
- `/trips/:id`
- `/map`

## Funzionalità principali

- Login con auth semplice (localStorage)
- Route protette
- Lista viaggi con filtro stato e ricerca
- Creazione viaggio
- Dettaglio viaggio con modifica (partecipanti, attività, spese, note)
- Eliminazione viaggio con conferma
- Download PDF (`/trips/:id/pdf`)
- Mappa viaggi con marker verdi (`PLANNED`) e rossi (`DONE`)
- New Trip guidato: selezione paese/città da dataset locale e coordinate via GPS o mappa interattiva
