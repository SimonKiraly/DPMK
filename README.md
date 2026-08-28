# MHD Košice — mobile app

A functional public-transport app for **MHD Košice** (Dopravný podnik mesta Košice),
built with **React Native + Expo (SDK 57) + TypeScript**. Not a mockup — navigation,
the ticket purchase flow, live countdowns, journey search, a live vehicle map and
persistent user data all work against a mock data + service layer that is designed to
be swapped for real APIs.

Primary colours: `#2B629E` (blue) · `#FFD538` (yellow). Type: Manrope.

---

## Run it

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code with
**Expo Go**. Works on iOS and Android.

```bash
npm run ios       # expo start --ios
npm run android   # expo start --android
npx tsc --noEmit  # type-check
npx expo-doctor   # project health (21/21 passing)
```

The first launch shows a 3-slide onboarding, then drops you on the Home tab as the
demo passenger *Eva Kučerová* (mock auth).

---

## Project structure

```
App.tsx                     Root: fonts, splash, providers, navigation
index.ts                    Expo entry
babel.config.js
app.json                    name "MHD Košice", plugins, permissions

src/
├── constants/
│   ├── theme.ts             colours, spacing, radii, typography, shadows
│   └── config.ts            APP_*, feature flags (dataSource.useMock*), endpoints, storageKeys
├── types/index.ts           every domain type (Stop, Vehicle, Journey, Ticket, …)
├── data/                    mock data, kept out of the UI
│   ├── stops.ts   routes.ts   vehicles.ts   tickets.ts   places.ts   notifications.ts
├── services/                business logic / API seam
│   ├── transportService.ts  stops, nearby, departures, journey planner, live-vehicle simulation
│   ├── paymentService.ts    PaymentProvider abstraction + MockPaymentProvider (processing/success/failure)
│   ├── ticketService.ts     purchase orchestration, activation, validity maths, QR payload
│   ├── authService.ts       AuthProvider abstraction + MockAuthProvider (SecureStore token)
│   ├── notificationService.ts  in-app notice builders + best-effort OS reminders
│   ├── lostFoundService.ts  mock depot backend
│   └── storageService.ts    AsyncStorage + SecureStore wrapper
├── store/                   Zustand, persisted with AsyncStorage
│   ├── useTicketStore.ts    active + inactive + history, expiry sweep
│   ├── useWalletStore.ts    balance, transactions, payment methods
│   ├── useFavoritesStore.ts stops / routes / home / work
│   ├── useNotificationStore.ts   inbox, unread count, seeding
│   ├── useUserStore.ts      profile + preferences + session
│   ├── useLostFoundStore.ts reports
│   ├── useOnboardingStore.ts
│   └── checkout.ts          cross-store purchase flow (pay → ticket → transaction → notice)
├── hooks/
│   ├── useCountdown.ts  useNow.ts  useInterval.ts
│   ├── useLiveVehicles.ts   subscribe to the vehicle simulation
│   ├── useNearbyStops.ts    location permission + nearby stops + graceful fallback
│   └── useAppBootstrap.ts   store hydration gate + periodic ticket-expiry sweep
├── navigation/
│   ├── RootNavigator.tsx    native-stack: onboarding ↔ (tabs + detail + modal screens)
│   ├── TabNavigator.tsx     Domov · Mapa · Lístky · Notifikácie · Menu
│   ├── types.ts  hooks.ts  notificationTarget.ts
├── components/
│   ├── ui/                  Text, Screen, Button, Card, Chip, SegmentedControl, Toggle,
│   │                       StatusBadge, RouteBadge, AppHeader, GradientHeader, SearchField,
│   │                       TextField, IconCircle, SectionHeading, ListRow, StateViews
│   ├── tickets/             TicketProductCard, ActiveTicketBanner, CountdownRing, TicketQr
│   ├── transport/           VehicleCard, StopCard, DepartureChip, RouteResultCard,
│   │                       StopTimeline, OccupancyDots
│   └── map/                 TransitMap (pan/zoom schematic map), projection.ts
├── screens/
│   ├── Onboarding/          OnboardingScreen
│   ├── Home/                HomeScreen
│   ├── Search/              PlannerScreen · ResultsScreen · JourneyDetailScreen
│   ├── LiveTransport/       LiveMapScreen · VehicleListScreen · VehicleDetailScreen
│   ├── Stops/               NearbyStopsScreen · StopDetailScreen
│   ├── Tickets/             TicketsScreen · CheckoutScreen · PaymentScreen ·
│   │                       PaymentSuccessScreen · ActiveTicketScreen · MyTicketsScreen
│   ├── Wallet/              WalletScreen · AddMoneyScreen
│   ├── Notifications/       NotificationsScreen
│   ├── Favorites/           FavoritesScreen
│   ├── Profile/             MenuScreen · ProfileScreen · SettingsScreen
│   └── LostFound/           LostFoundScreen · ReportFormScreen
└── utils/                   format.ts (SK locale) · geo.ts (haversine, polyline) · id.ts
```

---

## What works

| Feature | Status |
|---|---|
| Bottom-tab + stack navigation, back stack, deep flows | ✅ |
| Home: greeting, location, destination search, 4 quick actions, active ticket, nearby, alerts | ✅ |
| Journey planner (Odkiaľ / Kam) with graph search over the mock network, transfers, 4 preferences | ✅ |
| Journey results + leg-by-leg detail, "save route", "buy ticket" | ✅ |
| Live MHD map — pan/zoom, moving vehicles, route lines, stops, filters, tap → vehicle detail | ✅ |
| Vehicle detail — direction, next stop, ETA, occupancy, live stop timeline, delay | ✅ |
| Nearby stops — GPS with city-centre fallback, distance, departures, save favourite | ✅ |
| Stop detail — lines, live departures (auto-refresh), save | ✅ |
| Ticket catalogue — basic (30 m / 60 m / 24 h / 3 d) + prepaid (30/90/180/365 d) + SMS, standard/discounted, "Najvýhodnejšie" on 365 d | ✅ |
| Purchase flow: Tickets → select → review (activate toggle) → payment method → **processing / success / failure** → ticket created → active ticket | ✅ |
| Mock payment provider — simulated latency, ~12 % random failure, wallet-balance settlement, dev "simulate failure" toggle | ✅ |
| Active digital ticket — type, PLATNÝ/NEPLATNÝ status, activation + expiry time, **working live countdown**, countdown ring, QR code, unique ID | ✅ |
| Ticket lifecycle — expires → status flips → moves to history; **persists across app restarts** (AsyncStorage) | ✅ |
| Wallet — balance, transaction history (every mock purchase lands here), payment methods, top-up | ✅ |
| Favourites — stops, routes (with alert toggle), Home / Work places; persisted | ✅ |
| Notifications — centre with 5 kinds, filters, unread badge, working CTAs; purchase + expiry notices generated at runtime | ✅ |
| User account — profile (editable), discount entitlement, city card, preferences, accessibility, sign out | ✅ |
| Lost & Found — lost/found choice, full form with photo attach (expo-image-picker), mock submission + reference, report list | ✅ |
| Persistence — tickets, wallet, favourites, preferences, notifications, reports, onboarding | ✅ |

---

## Mock services that need real APIs later

All are isolated behind an interface in `src/services/` and gated by
`src/constants/config.ts → dataSource.*`. Flip the flag and implement the HTTP class.

| Service | Today | Replace with |
|---|---|---|
| `transportService` (`useMockTransport`) | Static GTFS-shaped stops/routes + deterministic timetable + in-memory vehicle simulation | DPMK / IDS Východ AVL feed (real-time vehicle positions) + GTFS / GTFS-RT; a real routing engine (OpenTripPlanner) for `planJourneys` |
| `paymentService` (`useMockPayments`) | `MockPaymentProvider` — fake authorise/capture, random failure | GoPay / Stripe / Adyen — implement `HttpPaymentProvider` against `endpoints.payments`; add 3-D Secure, Apple Pay / Google Pay native sheets |
| `ticketService` QR signature | Local deterministic hash (`signTicket`) | Server-issued HMAC / signed JWT so inspectors can verify offline |
| `authService` (`useMockAuth`) | `MockAuthProvider` — any e-mail signs in, fake bearer token in SecureStore | OIDC / OAuth against `endpoints.auth`; real customer identity + city-card verification |
| `notificationService` | In-app store inbox + best-effort local `expo-notifications` scheduling | Expo Push / FCM / APNs; server-driven disruption + timetable feed |
| `lostFoundService` (`useMockLostFound`) | Simulated latency, local storage | DPMK dispatcher / depot ticketing API + photo upload |
| Nearby / map geo | `expo-location` + custom schematic `TransitMap` | Keep `expo-location`; optionally swap `TransitMap` for `react-native-maps` / MapLibre — `project()` already converts geo → screen |

---

## Recommended next integrations (in order)

1. **GTFS + GTFS-Realtime** ingestion for `transportService` (stops, routes, timetables, live positions) — biggest jump in realism, no UI changes.
2. **OpenTripPlanner** (or Navitia) behind `planJourneys` for real multimodal routing.
3. **Payment provider** (GoPay is the common SK choice) + Apple Pay / Google Pay, then server-signed tickets.
4. **Auth / identity** (OIDC) + city-card & discount verification.
5. **Push notifications** (Expo Push) wired to a disruptions service; move `notificationService` reminders server-side.
6. **`react-native-maps` / MapLibre** for a real basemap (optional — the schematic map is intentionally dependency-free).
7. Backend sync for favourites / wallet / tickets so they follow the account across devices.
8. Localization framework (`i18n`) — copy is currently Slovak inline; `UserProfile.language` already exists.

---

## Build / run confirmation

- `npx tsc --noEmit` — **0 errors**
- `npx expo-doctor` — **21/21 checks pass**
- `npx expo export --platform ios` and `--platform android` — **both bundle successfully** (~3.7 MB Hermes bytecode each)
- Runs in Expo Go on iOS and Android; no native custom code, no API keys required.
