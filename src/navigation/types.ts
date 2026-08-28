import type { NavigatorScreenParams } from '@react-navigation/native';

import type { FareClass, Journey, LostFoundType } from '@/types';

export type TabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  TicketsTab: undefined;
  NotificationsTab: undefined;
  MenuTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;

  /* journey planning */
  Planner: { fromPlaceId?: string; toPlaceId?: string } | undefined;
  Results: { fromPlaceId: string; toPlaceId: string; departAt?: string };
  JourneyDetail: { journey: Journey };

  /* live transport */
  LiveTracking: { query?: string } | undefined;
  VehicleDetail: { vehicleId: string };

  /* stops */
  NearbyStops: undefined;
  StopDetail: { stopId: string };

  /* tickets & purchase flow */
  Checkout: { productId: string; fareClass: FareClass };
  Payment: { productId: string; fareClass: FareClass; activateNow: boolean };
  PaymentSuccess: { ticketId: string };
  ActiveTicket: { ticketId?: string } | undefined;
  MyTickets: undefined;

  /* wallet */
  Wallet: undefined;
  AddMoney: undefined;

  /* account */
  Favorites: undefined;
  Profile: undefined;
  Settings: undefined;

  /* lost & found */
  LostFound: undefined;
  ReportForm: { type: LostFoundType };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
