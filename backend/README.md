# MHD Košice — backend

A tiny Node/TypeScript/Fastify service that sits between the mobile app and the
[Ubian navigation API](https://dpmk-odchody.ubian.sk). It exists so that **one**
process polls Ubian on a fixed cadence and every phone talks to us instead:

```
iPhone MHD Košice app  ──HTTPS──▶  this backend  ──▶  Ubian navigation API
(10 · 100 · 1000 users)            (1 poll / 10 s, whatever the user count)
```

It also does the one thing the app already does client-side — **filter out
non-MHD transport** — so nothing but Košice DPMK buses and trams is ever exposed.

- **No database, no Redis.** Live data is ephemeral (a background poller keeps a
  ~50 KB in-memory snapshot); the static DPMK network is version-controlled JSON.
- **MHD only.** `line.ezIsUrban === true` (Ubian's "mestská doprava" flag) **and
  `line.firmaID === 1000`** (the Košice operator). eurobus (prímestská), ARRIVA
  (intercity) and ŽSSK (rail) fail the first check; DPMP Prešov (a different
  city's transit, also `ezIsUrban`) fails the second. All dropped in
  `src/ubian/mhdFilter.ts` before any endpoint sees them.
- The mobile app is **not** modified by this — it still calls Ubian directly
  until a later migration task.

## Requirements

- Node.js **20 LTS** or newer

## Run locally

```bash
cd backend
npm install
cp .env.example .env      # optional — every var has a default
npm run dev                # tsx watch, pretty logs, http://localhost:8080
```

Build + run the compiled output (what Railway does):

```bash
npm run build              # tsc → dist/
npm start                  # node dist/server.js
```

Other scripts: `npm run typecheck`, `npm test` (Vitest), `npm run test:watch`.

## Verify

```bash
curl -s http://localhost:8080/api/health | jq
curl -s "http://localhost:8080/api/vehicles" | jq '{count, stale, first: .vehicles[0]}'
# every vehicle is DPMK MHD — no eurobus/ARRIVA/train:
curl -s "http://localhost:8080/api/vehicles" | jq '[.vehicles[].operatorId] | unique'   # → [18024]
```

## API

| Method / path | Purpose | Cache |
|---|---|---|
| `GET /api/health` | liveness + Ubian/fleet status (Railway health check) | — |
| `GET /api/vehicles?mode=` | whole MHD fleet from the snapshot (`mode` = `bus`/`tram`/`night`) | poller (10 s) |
| `GET /api/vehicles/:id` | one vehicle (`u_<vehicleID>`) + stop timeline | 5 min trip_stops + single-flight |
| `GET /api/stops?lat&lng&radius&limit&withDepartures` | nearby stops (proxied) | 60 s |
| `GET /api/stops/:id` | one stop + next departures | 20 s + single-flight |
| `GET /api/stops/:id/departures?limit` | departures only | 20 s + single-flight |
| `GET /api/network` | the static DPMK network (routes + stops + map shapes), `ETag` | 24 h immutable |
| `GET /api/routes/:shortName` | one route (patterns + shape) | 24 h |
| `GET /api/search?q=` | stop/place autocomplete (proxied, Košice-filtered) | 5 min + single-flight |

Response bodies reuse the app's domain types (`Vehicle`, `Stop`, `Departure`,
`NearbyStop`, `VehicleDetail`, `TransitRoute`) — see `src/types.ts`.

`/api/vehicles` when Ubian is unreachable: the last good snapshot is served with
`stale: true` + `ageMs`. Before the first successful poll: `warmingUp: true`.

`Vehicle.bearing` is derived from the position change between polls (the feed has
no heading field). Ubian refreshes positions in bursts (~every 50 s), so most
polls see an unchanged position — the last computed heading is then retained
rather than reset. A vehicle never yet seen to move reports `bearing: 0`.

## Environment

All optional — the service boots on an empty environment. See `.env.example`.

| var | default | notes |
|---|---|---|
| `PORT` | `8080` | Railway injects this |
| `NODE_ENV` | `development` | `production` on Railway |
| `LOG_LEVEL` | `info` | pino level |
| `UBIAN_BASE_URL` | `https://dpmk-odchody.ubian.sk` | upstream; swappable for an official feed later |
| `UBIAN_TIMEOUT_MS` | `9000` | per-request abort |
| `FLEET_LAT` / `FLEET_LNG` / `FLEET_RADIUS_M` | `48.7204` / `21.2577` / `2600` | vehicle-query centre (Košice) |
| `VEHICLE_POLL_MS` | `10000` | poller cadence |
| `POLLER_IDLE_STOP_MS` | `120000` | pause polling after this long with no `/api/vehicles` traffic (`0` = never pause) |
| `CORS_ORIGINS` | `*` | comma-separated, or `*` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `120` / `1 minute` | per-IP throttle on this backend |

**Secrets:** none exist today — the Ubian feed needs no key. `API_ACCESS_TOKEN`
and `SENTRY_DSN` are reserved (parsed if present, never logged). Any future
Ubian/DPMK credential lives **only** in Railway env vars, never in the mobile app.

## Deploy to Railway

The repo root is an **Expo app** (`package.json` → `"start": "expo start"`). If
Railway builds from the root with Nixpacks it will run the Expo dev server, not
this backend. To prevent that, deployment is pinned by two committed files:

- **`/railway.json`** — `builder: DOCKERFILE`, `dockerfilePath: backend/Dockerfile`,
  `startCommand: node dist/server.js`, `healthcheckPath: /api/health`.
- **`backend/Dockerfile`** — multi-stage: `npm ci` → `npm run build` (tsc →
  `dist/`) → `npm prune --omit=dev` → runtime image runs `node dist/server.js`.
  Build context is the repo root; `/.dockerignore` trims it to `backend/` so the
  Expo app and its `node_modules` never enter the image.

Steps:

1. Push to GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
   Leave **Root Directory** empty (the repo root — `railway.json` lives there).
   Railway detects `railway.json` and builds `backend/Dockerfile` automatically.
3. Service → **Variables** → `NODE_ENV=production` (add any other overrides from
   the table above; **`PORT` is injected by Railway — do not set it**).
4. Health check path (`/api/health`) and restart policy come from `railway.json`.
5. Service → **Settings** → **Networking** → generate a public domain.
6. Deploy. `curl https://<service>.up.railway.app/api/health` → backend JSON
   (`{"ok":true,...}`), **not** an Expo manifest.

Local parity check (same image Railway builds):

```bash
docker build -f backend/Dockerfile -t mhd-backend .   # run from repo root
docker run --rm -e PORT=8080 -p 8080:8080 mhd-backend
curl -s localhost:8080/api/health
```

**Scale:** run **1 instance**. The whole MHD fleet is ~66 objects; a single
Fastify process serves thousands of clients from RAM. A second instance would
mean two independent Ubian pollers — fine, but if you want a single shared poll
across instances, that's when Redis earns its place (a documented later step, not
built now).

## Layout

```
Dockerfile             production image (used by Railway via /railway.json)
src/
  server.ts            Fastify bootstrap, plugins, error handler, listen 0.0.0.0:$PORT
  config.ts            Zod-validated env → typed config
  routes/              health · vehicles · stops · network · search
  ubian/
    client.ts          fetch wrapper (timeout, {status:'ok'} envelope)
    types.ts           raw Ubian response interfaces (verbatim from the app)
    mhdFilter.ts        isKosiceMhdLine / classifyUbianLine / toMhdMode (ported + tightened)
    normalize.ts        raw → Vehicle/Stop/Departure + dedupe + bearing + timeline
  fleet/
    snapshot.ts         in-memory latest fleet + stale/warmingUp/lastError
    poller.ts           the single background loop (idle-stop / resume)
  network/
    dpmkNetwork.ts      static DPMK dataset — verbatim copy of src/data/dpmkNetwork.ts
    adapters.ts         ROUTES / STOPS / ROUTE_SHAPES / NETWORK_PAYLOAD
  lib/
    geo.ts              haversine + bearing (verbatim from src/utils/geo.ts)
    cache.ts            TTL cache + single-flight
  types.ts              app-facing DTOs
test/
  mhdFilter.test.ts   normalize.test.ts   snapshot.test.ts
  fixtures/            real + synthetic /navigation/vehicles/nearby + /stops/nearby
```
