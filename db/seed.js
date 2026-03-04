// ====== SEED: viaggi_spa ======
// Esegui con: mongosh "<URI_CON_DB>" --file db/seed.js

use("viaggi_spa");

// ── Pulizia ──────────────────────────────────────────────
db.users.drop();
db.trips.drop();

// ── USERS ────────────────────────────────────────────────
db.users.insertMany([
  {
    username: "luca",
    password: "1234",
    displayName: "Luca B.",
    role: "USER",
    createdAt: new Date()
  },
  {
    username: "sara",
    password: "1234",
    displayName: "Sara R.",
    role: "USER",
    createdAt: new Date()
  },
  {
    username: "admin",
    password: "admin",
    displayName: "Admin",
    role: "ADMIN",
    createdAt: new Date()
  }
]);

const u       = db.users.find({}, { _id: 1, username: 1 }).toArray();
const lucaId  = u.find(x => x.username === "luca")._id;
const saraId  = u.find(x => x.username === "sara")._id;
const adminId = u.find(x => x.username === "admin")._id;

// ── TRIPS (10, non uniformi) ─────────────────────────────
db.trips.insertMany([

  // 1 ─ completo
  {
    title: "Weekend a Berlino",
    status: "PLANNED",
    destination: { city: "Berlin", country: "DE", lat: 52.52, lng: 13.405 },
    startDate: "2026-04-10",
    endDate:   "2026-04-13",
    description: "Musei e street food",
    createdBy: lucaId,
    participants: [
      { userId: lucaId, name: "Luca" },
      { userId: saraId, name: "Sara" }
    ],
    activities: [
      { title: "Pergamon Museum", date: "2026-04-11", type: "VISIT", done: false },
      { title: "Currywurst tour",  date: "2026-04-12", type: "FOOD",  done: false }
    ],
    expenses: [
      { label: "Volo",  amount: 120, currency: "EUR", paidBy: "Luca", category: "TRAVEL"  },
      { label: "Hotel", amount: 240, currency: "EUR", paidBy: "Sara", category: "LODGING" }
    ],
    budget: { amount: 500, currency: "EUR" },
    notes: ["Check-in online", "Portare documento"],
    createdAt: new Date()
  },

  // 2 ─ senza expenses
  {
    title: "Gita a Firenze",
    status: "DONE",
    destination: { city: "Firenze", country: "IT", lat: 43.7696, lng: 11.2558 },
    startDate: "2025-11-02",
    endDate:   "2025-11-03",
    createdBy: saraId,
    participants: [
      { userId: saraId, name: "Sara" },
      { name: "Giulia" }
    ],
    activities: [
      { title: "Uffizi",        date: "2025-11-02", type: "VISIT", done: true },
      { title: "Ponte Vecchio",                     type: "WALK",  done: true }
    ],
    createdAt: new Date()
  },

  // 3 ─ minimale
  {
    title: "Lago di Como",
    status: "PLANNED",
    destination: { city: "Como", country: "IT", lat: 45.8081, lng: 9.0852 },
    startDate: "2026-06-01",
    endDate:   "2026-06-02",
    createdBy: lucaId,
    createdAt: new Date()
  },

  // 4 ─ senza lat/lng
  {
    title: "Tokyo - Primavera",
    status: "PLANNED",
    destination: { city: "Tokyo", country: "JP" },
    startDate: "2026-03-20",
    endDate:   "2026-03-30",
    createdBy: adminId,
    participants: [{ userId: adminId, name: "Admin" }],
    expenses: [{ label: "JR Pass", amount: 280, currency: "EUR", paidBy: "Admin" }],
    budget: { amount: 450, currency: "EUR" },
    createdAt: new Date()
  },

  // 5 ─ con route (roadtrip)
  {
    title: "Roadtrip Sicilia",
    status: "PLANNED",
    destination: { city: "Palermo", country: "IT", lat: 38.1157, lng: 13.3615 },
    startDate: "2026-08-05",
    endDate:   "2026-08-15",
    createdBy: lucaId,
    participants: [{ userId: lucaId, name: "Luca" }, { name: "Marco" }],
    route: [
      { label: "Palermo", lat: 38.1157, lng: 13.3615, done: false },
      { label: "Cefalù",  lat: 38.0392, lng: 14.0229, done: false },
      { label: "Catania", lat: 37.5079, lng: 15.0830, done: false }
    ],
    createdAt: new Date()
  },

  // 6 ─ activities senza type
  {
    title: "Vienna Classica",
    status: "DONE",
    destination: { city: "Vienna", country: "AT", lat: 48.2082, lng: 16.3738 },
    startDate: "2025-12-10",
    endDate:   "2025-12-13",
    createdBy: saraId,
    activities: [
      { title: "Opera",     date: "2025-12-11", done: true },
      { title: "Belvedere",                     done: true }
    ],
    expenses: [{ label: "Biglietti opera", amount: 90, currency: "EUR" }],
    createdAt: new Date()
  },

  // 7 ─ solo spese
  {
    title: "Milano - Fiera",
    status: "DONE",
    destination: { city: "Milano", country: "IT", lat: 45.4642, lng: 9.1900 },
    startDate: "2025-10-01",
    endDate:   "2025-10-02",
    createdBy: adminId,
    expenses: [
      { label: "Treno", amount: 45, currency: "EUR", category: "TRAVEL" },
      { label: "Taxi",  amount: 18, currency: "EUR", category: "LOCAL"  }
    ],
    createdAt: new Date()
  },

  // 8 ─ con campo extra custom
  {
    title: "Barcellona - Mare",
    status: "PLANNED",
    destination: { city: "Barcelona", country: "ES", lat: 41.3851, lng: 2.1734 },
    startDate: "2026-07-01",
    endDate:   "2026-07-06",
    createdBy: lucaId,
    weatherPreference: "SUNNY",
    budget: { amount: 650, currency: "EUR" },
    participants: [
      { userId: lucaId, name: "Luca" },
      { userId: saraId, name: "Sara" }
    ],
    createdAt: new Date()
  },

  // 9 ─ con checklist
  {
    title: "Montagna - Dolomiti",
    status: "PLANNED",
    destination: { city: "Cortina d'Ampezzo", country: "IT", lat: 46.5405, lng: 12.1357 },
    startDate: "2026-01-20",
    endDate:   "2026-01-25",
    createdBy: saraId,
    checklist: [
      { item: "Scarponi",       done: false },
      { item: "Giacca termica", done: true  }
    ],
    createdAt: new Date()
  },

  // 10 ─ senza endDate
  {
    title: "New York - Business",
    status: "PLANNED",
    destination: { city: "New York", country: "US", lat: 40.7128, lng: -74.0060 },
    startDate: "2026-05-10",
    createdBy: adminId,
    participants: [{ userId: adminId, name: "Admin" }],
    budget: { amount: 1200, currency: "EUR" },
    createdAt: new Date()
  }
]);

// ── INDICI ───────────────────────────────────────────────
db.users.createIndex({ username: 1 }, { unique: true });
db.trips.createIndex({ status: 1, startDate: 1 });
db.trips.createIndex({ "destination.city": 1 });
db.trips.createIndex({ createdBy: 1 });

// ── REPORT ───────────────────────────────────────────────
print("✅ Seed completato.");
print("   users :", db.users.countDocuments());
print("   trips :", db.trips.countDocuments());
