import type { AppNotification } from '@/types';

/**
 * Seed content for the notification centre — tickets / trip updates / offers.
 * Ticket notifications are appended at runtime by `notificationService`.
 *
 * Service disruptions are NOT seeded here: they come live from the backend
 * (`GET /api/alerts` → `useAlertsStore`) and the Notifications screen merges
 * them in. See `docs/…` Phase 0.
 */
export function seedNotifications(): AppNotification[] {
  const now = Date.now();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  return [
    {
      id: 'n-trip-16',
      kind: 'trip_update',
      title: 'Autobus 16 mešká 3 minúty',
      body: 'Vaša uložená ranná cesta na Sídlisko KVP je ovplyvnená. Vyrazte o 5 minút skôr, aby ste stihli prestup.',
      createdAt: new Date(now - 28 * min).toISOString(),
      read: false,
      cta: { label: 'Sledovať autobus 16', target: { screen: 'VehicleDetail', routeShortName: '16' } },
    },
    {
      id: 'n-info-night',
      kind: 'info',
      title: 'Nočné linky sa menia od 1. septembra',
      body: 'N1 a N4 dostávajú nové zastávky pri Amfiteátri. Cestovné poriadky sú už v aplikácii.',
      createdAt: new Date(now - 1 * day).toISOString(),
      read: true,
    },
    {
      id: 'n-offer-365',
      kind: 'offer',
      title: '365-dňový lístok — €240 do 31. augusta',
      body: 'Prejdite na ročný predplatný lístok a ušetrite €72 oproti mesačným lístkom.',
      createdAt: new Date(now - 2 * day).toISOString(),
      read: true,
      cta: { label: 'Zobraziť predplatné lístky', target: { screen: 'Tickets' } },
    },
  ];
}
