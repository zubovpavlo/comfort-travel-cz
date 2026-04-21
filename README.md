# Comfort Travel CZ

Webová aplikace pro vyhledávání pohodlných kombinací dopravy a ubytování v České republice. Vytvořena jako bakalářská práce.

## Popis

Aplikace umožňuje uživatelům zadat výchozí a cílovou destinaci, data cesty a preference (cena, čas cestování, komfort, hodnocení) — a zobrazí seřazené kombinace spojení + ubytování odpovídající těmto preferencím.

**Zdroje dat:**
- **Doprava**: [Transitous](https://transitous.org) (engine MOTIS) — jízdní řády veřejné dopravy
- **Ubytování**: [Overpass API](https://overpass-api.de) (OpenStreetMap) — hotely, hostely, penziony, apartmány

## Technologický stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, React Router, Leaflet |
| Backend | Node.js, Express 5, TypeScript, Knex.js |
| Databáze | PostgreSQL (PostGIS) |
| Autentizace | JWT + bcrypt |
| Deployment | Docker + docker-compose |

## Spuštění

### Požadavky
- Docker a docker-compose
- Node.js 20+ (pro lokální vývoj)

### Docker (doporučeno)

```bash
# Spustit databázi, backend a frontend
docker compose up -d

# Aplikace bude dostupná na http://localhost
# API na http://localhost:3001
```

### Lokální vývoj

```bash
# Databáze
docker compose up -d postgres

# Backend (port 3001)
cd server
cp .env.example .env   # nastavit DATABASE_URL, JWT_SECRET
npm install
npm run migrate
npm run dev

# Frontend (port 5173)
cd client
npm install
npm run dev
```

### Proměnné prostředí (server/.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/comfort_travel
JWT_SECRET=your-secret-key
PORT=3001
```

## Algoritmus doporučení

1. Načtení tras (tam i zpět) přes Transitous API — až 10 itinerářů
2. Načtení ubytování přes Overpass API v okruhu kolem destinace
3. Sestavení kombinací: trasa tam × trasa zpět × ubytování
4. Min-max normalizace každé dimenze (cena, čas, komfort, hodnocení)
5. Skóre = `w_cena × norm_cena + w_čas × norm_čas + w_komfort × norm_komfort + w_hodnocení × norm_hodnocení`
6. Seřazení podle skóre, vrácení top 50 kombinací

Uživatel ovládá váhy přes 4 posuvníky (součet = 100 %).

## Struktura projektu

```
comfort-travel-cz/
├── client/          # React frontend
│   └── src/
│       ├── pages/   # SearchPage, ResultsPage, TripDetailPage, ...
│       ├── components/
│       └── api/
├── server/          # Node.js backend
│   └── src/
│       ├── services/   # recommendationService, routeFinder, accommodationService
│       ├── controllers/
│       └── utils/
└── docker-compose.yml
```
