import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getVehiclesForRoute } from '@/services/transportService';
import type { NotificationTarget } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Maps a notification CTA target to a navigation action. */
export function openNotificationTarget(navigation: Nav, target: NotificationTarget): void {
  switch (target.screen) {
    case 'Tickets':
      navigation.navigate('Main', { screen: 'TicketsTab' });
      return;
    case 'LiveMap':
      navigation.navigate('Main', { screen: 'MapTab' });
      return;
    case 'Notifications':
      navigation.navigate('Main', { screen: 'NotificationsTab' });
      return;
    case 'Planner':
      navigation.navigate('Planner');
      return;
    case 'VehicleDetail': {
      const vehicle = getVehiclesForRoute(target.routeShortName)[0];
      if (vehicle) navigation.navigate('VehicleDetail', { vehicleId: vehicle.id });
      else navigation.navigate('LiveTracking', { query: target.routeShortName });
      return;
    }
  }
}
