import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import type { RootStackParamList } from '@/navigation/types';
import { TabNavigator } from '@/navigation/TabNavigator';

import { OnboardingScreen } from '@/screens/Onboarding/OnboardingScreen';
import { PlannerScreen } from '@/screens/Search/PlannerScreen';
import { ResultsScreen } from '@/screens/Search/ResultsScreen';
import { JourneyDetailScreen } from '@/screens/Search/JourneyDetailScreen';
import { VehicleListScreen } from '@/screens/LiveTransport/VehicleListScreen';
import { VehicleDetailScreen } from '@/screens/LiveTransport/VehicleDetailScreen';
import { NearbyStopsScreen } from '@/screens/Stops/NearbyStopsScreen';
import { StopDetailScreen } from '@/screens/Stops/StopDetailScreen';
import { CheckoutScreen } from '@/screens/Tickets/CheckoutScreen';
import { PaymentScreen } from '@/screens/Tickets/PaymentScreen';
import { PaymentSuccessScreen } from '@/screens/Tickets/PaymentSuccessScreen';
import { ActiveTicketScreen } from '@/screens/Tickets/ActiveTicketScreen';
import { MyTicketsScreen } from '@/screens/Tickets/MyTicketsScreen';
import { WalletScreen } from '@/screens/Wallet/WalletScreen';
import { AddMoneyScreen } from '@/screens/Wallet/AddMoneyScreen';
import { FavoritesScreen } from '@/screens/Favorites/FavoritesScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { SettingsScreen } from '@/screens/Profile/SettingsScreen';
import { LostFoundScreen } from '@/screens/LostFound/LostFoundScreen';
import { ReportFormScreen } from '@/screens/LostFound/ReportFormScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const completed = useOnboardingStore((s) => s.completed);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      {!completed ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Main" component={TabNavigator} />

          <Stack.Screen name="Planner" component={PlannerScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="JourneyDetail" component={JourneyDetailScreen} />
          <Stack.Screen name="LiveTracking" component={VehicleListScreen} />
          <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
          <Stack.Screen name="NearbyStops" component={NearbyStopsScreen} />
          <Stack.Screen name="StopDetail" component={StopDetailScreen} />
          <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
          <Stack.Screen name="ActiveTicket" component={ActiveTicketScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="AddMoney" component={AddMoneyScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="LostFound" component={LostFoundScreen} />
          <Stack.Screen name="ReportForm" component={ReportFormScreen} />

          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen
              name="PaymentSuccess"
              component={PaymentSuccessScreen}
              options={{ gestureEnabled: false, animation: 'fade' }}
            />
          </Stack.Group>
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
