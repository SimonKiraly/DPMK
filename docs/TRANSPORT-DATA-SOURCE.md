# MHD Košice — real transport data: investigation report

_Investigated 2026-08-28. All requests below were a small manual sample for
discovery, not automated polling._

---

## 1. Sources discovered

| # | Source | What it gives | Auth | Licence | Suitable for production |
|---|--------|---------------|------|---------|------------------------|
| A | **Open Data Košice — "Cestovný poriadok MHD"** (ArcGIS Hub item `ba941d7bc56a462684a261d4f35ce17d`) | Static timetable: stops, lines, stop sequences, full schedules | none | **CC BY 4.0** (attribution: *Dopravný podnik mesta Košice, a.s.*) | **Yes** for static data, after a JDF→GTFS conversion step |
| B | **Ubian departure board API** (`https://dpmk-odchody.ubian.sk/navigation/*`) | Live vehicle positions, real departures, delays, nearby stops (with coords), stop/place search, journey-planner endpoint | none (public) | **none published** — undocumented internal API, `Cache-Control: private` | **Only with written permission** from TransData/DPMK, via our own backend proxy |

There is **no official DPMK GTFS or GTFS-RT feed** discoverable. The official
open feed (A) is **JDF / CIS format** (Jednotný dátový formát, CHAPS s.r.o.),
not GTFS, and contains **no stop coordinates**.

---

## 2. Source A — Open Data Košice (official, licensed)

- **Dataset page:** https://opendata.kosice.sk/datasets/ba941d7bc56a462684a261d4f35ce17d
- **Direct download (ZIP, ~722 KB):**
  `https://www.arcgis.com/sharing/rest/content/items/ba941d7bc56a462684a261d4f35ce17d/data`
- **Type:** `CSV Collection` / JDF (`VerzeJDF.TXT` present), CP1250, semicolon-quoted CSV
- **Licence:** Creative Commons Attribution 4.0 International — **reuse permitted, attribution required**
- **Publisher:** Mesto Košice (`opendatake@kosice.sk`); data owner: DPMK a.s.
- **Files:**
  | file | contents |
  |---|---|
  | `ZASTAVKY.TXT` | stops — id, city, district, name (**no lat/lng**) |
  | `OZNACNIKY.TXT` | stop posts / platforms |
  | `LINKY.TXT` | lines — codes `E_1`, `E_2`, `E_R1` … (tram / trolley / bus) + validity dates |
  | `ZASLINKY.TXT` | stop sequence per line |
  | `SPOJE.TXT` | trips |
  | `ZASSPOJE.TXT` | per-trip stop times (~8.5 MB) |
  | `DOPRAVCI.TXT` | operators |
- **Contains:** stops �· routes �· schedules �· stop sequences �
- **Does NOT contain:** coordinates ✗ · real-time delays ✗ · vehicle positions ✗ · route geometry ✗
- **Freshness:** internal file dates are 2022-03-23; the Hub item shows `modified 2025-12-03`. Treat as **potentially stale** — verify before production and ask DPMK for the current export cadence.
- **Rate limits:** none (single static file).

### Recommended use
Ingest on **our backend** → run a JDF→GTFS converter (e.g. `jrutil`, `jdf2gtfs`)
→ geocode stops against source B or OpenStreetMap → serve our app a normal GTFS
bundle. This is the licence-clean path for stops / routes / schedules.

---

## 3. Source B — Ubian navigation API (public, undocumented)

**Base:** `https://dpmk-odchody.ubian.sk` — a same-origin proxy in front of the
TransData/Ubian backend. `Server: nginx`. Responses `application/json`,
`{"status":"ok", ...}` envelope. **No CORS headers** (fine for native
iOS/Android `fetch`; a web build needs a proxy). No auth, no cookies, no API key
for any `/navigation/*` GET. No rate-limit headers seen.

Route table is published verbatim at
`https://dpmk-odchody.ubian.sk/assets/js/ubian/routes.js`.

### Košice city id
`GET /navigation/urban_transport_cities` → `{"cityID":18024,"cityName":"Košice"}`

### Stops
`GET /navigation/stops/nearby?lat=<>&lng=<>&radius=<m>` →
```jsonc
{"status":"ok","stops":[{
  "stopID":1000000077,
  "stopName":"Alžbetina, Rektorát UPJŠ",
  "stopCity":"Košice",
  "latitude":null,"longitude":null,          // stop-level null …
  "platforms":[{"platformNumber":1,"latitude":48.71887,"longitude":21.25272,
                "tooltip":"…","platformName":""}],   // … coords live on platforms
  "ezLines":["12","N2"],
  "forUrbanPublicTransport":true,"forBusTransport":false,"forRail":false,
  "passingLines":{"1":[{"lineType":"bus","lines":["12","N2"]}]},
  "subRegion":"SK;Košický kraj;Košice",
  "slug":"1000000077-kosice-alzbetina-rektorat-upjs"
}]}
```
`GET /navigation/stops/ids?ids[]=<stopID>&ids[]=<…>` → same shape, by id.

### Departures
`GET /navigation/stops/planned_departures?stopID=<>&platformIDs[]=<>` →
```jsonc
{"status":"ok","departures":[{
  "timeTableTrip":{
    "tripID":1003251193,"destinationStopName":"Šebastovce","ezTripDirection":"there",
    "lowFloor":false,"canceled":false,"messages":"",
    "timeTableLine":{"lineID":1000013673,"line":"12","lineNumber":12,
                     "ezLineType":"bus","ezVehicleType":"BUS","firmaID":1000,
                     "ezIsUrban":true,"lineName":"Podhradová - Šebastovce",
                     "supervisorName":"Dopravný podnik mesta Košice a.s."}},
  "plannedDepartureTimestamp":1787943480,   // unix seconds
  "delayMinutes":0,
  "platformNumber":1,
  "plannedOrRealVehicleID":null
}]}   // up to 100
```
`GET /navigation/stops/planned_departures/nearest?lat=<>&lng=<>` — same, nearest stops.
`GET /navigation/stops/line/time_table?stopID=<>&lineID=<>&date=YYYY-MM-DD` — scheduled table.

### Live vehicles  ← primary real-time feature
`GET /navigation/vehicles/nearby?lat=<>&lng=<>&radius=<m>` →
```jsonc
{"status":"ok","vehicles":[{
  "vehicleID":1276274,
  "delayMinutes":1,
  "latitude":48.71721,"longitude":21.26095,     // no bearing/heading field
  "lastStopOrder":21,"isOnStop":true,
  "tooltip":"Košice, Lingov → Košice, KVP, kláštor",
  "timeTableTrip":{
    "tripID":1003257555,"destinationStopName":"KVP, kláštor","ezTripDirection":"there",
    "lowFloor":false,"bicycle":false,"wifi":false,"canceled":false,
    "operatorID":18024,"operatorName":"Dopravný podnik mesta Košice a.s.",
    "timeTableLine":{"lineID":1000013728,"line":"71","ezLineType":"bus",
                     "ezVehicleType":"BUS","firmaID":1000}}
}]}   // capped at 100 — whole Košice fleet fits within ~1.5 km of the centre
```
Types seen: `ezLineType` ∈ `tram` / `bus` / `train` (trolleybus lines exist in the
JDF as `E_R*` but weren't in the live sample).

`GET /navigation/vehicles/trip_stops?tripID=<>` → ordered stop list for a trip
(**this is our route geometry + timeline**):
```jsonc
{"status":"ok","tripStops":[{
  "stopOrder":2,"stopID":1000000175,"stopName":"Lingov",
  "latitude":48.73231,"longitude":21.29115,
  "plannedDepartureTimestamp":1787942400,"zones":""
}]}
```
`GET /navigation/vehicles/get_real?tripID=<>&firmaID=<>&tripStartDate=<>` — realtime for one trip.
`GET /navigation/vehicles/nearest_parked_shared_vehicles?lat=&lng=` — bikes/scooters (not us).

### Place / stop search
`GET /navigation/autocomplete?query=<>` →
```jsonc
{"status":"ok","results":[{
  "id":1000000064,"stopName":"Námestie osloboditeľov, KI","stopCity":"Košice",
  "type":"stop","transportType":"urban","icon":"stop_urban","region":"Košice",
  "slug":"1000000064-kosice-namestie-osloboditelov-ki"
}]}
```

### Journey planner
`POST /navigation/connections` — **exists** but returns
`{"status":"error","error_message":"Vyskytla sa neočakávaná chyba…","error_code":0}` (HTTP 500)
for every payload shape tried from `curl`. The client builds a deeply-nested
jQuery form body from opaque autocomplete objects
(`{from, to, allowTransfers, maxRadius, departure, date:"YYYY-MM-DD HH:mmZZ",
filter:["urban","bus","train"], sorting, cityID:18024}`) and likely needs a
browser session / referer / CSRF that we could not reproduce here.
Companion GETs: `/navigation/connection/route?tripIDs=`,
`/navigation/connection/walking_route`, `/navigation/connection/detail`,
`/navigation/connection/get_ticket_price`, `/navigation/connection/create_permalink`.

**Conclusion:** treat the planner endpoint as *present but not client-usable
without a captured browser request*. Keep our local graph planner (works over
the mock/GTFS network) until a backend can proxy `connections` correctly.

---

## 4. Data-type coverage

| data | Source A (official) | Source B (Ubian) |
|---|---|---|
| stops (id, name) | ✅ | ✅ |
| stop coordinates | ❌ | ✅ (on platforms) |
| routes / lines | ✅ | ✅ (per vehicle / departure) |
| stop sequence | ✅ | ✅ (`trip_stops`) |
| route geometry | ❌ (stop chain only) | ✅ (`trip_stops` stop chain) |
| schedules | ✅ | ✅ (`line/time_table`) |
| **real departures** | ❌ | ✅ (`planned_departures`) |
| **delays** | ❌ | ✅ (`delayMinutes`) |
| **vehicle positions** | ❌ | ✅ (`vehicles/nearby`) |
| vehicle bearing | ❌ | ❌ (compute from deltas) |
| occupancy | ❌ | ❌ |
| journey planning | (derive from GTFS) | endpoint exists, not usable via curl |

---

## 5. Security

No API keys, tokens, cookies or credentials are required by any endpoint used,
so **nothing secret ships in the app**. The Ubian web widget embeds a Google
Maps browser key — we do **not** use it (our `TransitMap` stays dependency-free).

For production the mobile app must not call `dpmk-odchody.ubian.sk` directly:
```
Mobile app  →  our backend  →  { Open Data Košice ZIP (cached, converted to GTFS),
                                 Ubian navigation API (proxied, cached, rate-limited) }
```

---

## 6. Legal / production readiness

- **Source A** is explicitly **CC BY 4.0** — usable in production with the
  attribution "Dopravný podnik mesta Košice, a.s. / Mesto Košice, opendata.kosice.sk".
  Confirm the export is current (the sampled ZIP looks ~2022).
- **Source B** has **no published terms or licence**. It is a public endpoint but
  that is not permission for third-party production use. Before shipping we must
  get written agreement from **TransData s.r.o. / DPMK a.s.** for the real-time
  feed (or ask them for an official GTFS-RT endpoint), and route all traffic
  through our backend with caching + a courteous request rate.

---

## 7. What we need from DPMK / Ubian

1. Written permission (or an official API) for the **real-time feed** — vehicle
   positions + delays + real departures. Ideally **GTFS-RT** (`VehiclePositions`,
   `TripUpdates`, `ServiceAlerts`).
2. Confirmation that the **Open Data Košice timetable export is current** and its
   refresh cadence — or an official **GTFS** static feed.
3. The **journey-planner** contract (`POST /navigation/connections` request/response),
   or use OpenTripPlanner on our own GTFS.
4. Agreed **rate limits** and required **attribution string**.

---

## 8. What was implemented now (dev integration)

Behind `dataSource.useMockTransport` (default **true** = mock) / a Settings toggle
**"Živé dáta MHD (beta)"**, the app can switch to Source B live data for:

- **live vehicles** (`vehicles/nearby`, polled 15 s, bearing computed from deltas)
- **nearby stops** (`stops/nearby`, coords from platforms)
- **stop departures** (`stops/planned_departures`)
- **place / stop search** (`autocomplete`)

Static base-map network (`data/stops.ts`, `data/routes.ts`), the journey planner,
and the sync `getStops()/getRouteShapes()` stay on mock data and are the
automatic fallback. Any live-fetch failure → `TransportStatusBanner`:
*"Momentálne sa nepodarilo načítať aktuálne dáta."* and silent fallback to mock.

Provider code is isolated in `src/services/ubianService.ts`; the rest of the app
only talks to `src/services/transportService.ts`.
