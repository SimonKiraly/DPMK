import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import { useNotificationStore, selectUnreadCount } from '@/store/useNotificationStore';
import type { TabParamList } from '@/navigation/types';

import { HomeScreen } from '@/screens/Home/HomeScreen';
import { LiveMapScreen } from '@/screens/LiveTransport/LiveMapScreen';
import { TicketsScreen } from '@/screens/Tickets/TicketsScreen';
import { NotificationsScreen } from '@/screens/Notifications/NotificationsScreen';
import { MenuScreen } from '@/screens/Profile/MenuScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { on: 'home', off: 'home-outline' },
  MapTab: { on: 'map', off: 'map-outline' },
  TicketsTab: { on: 'ticket', off: 'ticket-outline' },
  NotificationsTab: { on: 'notifications', off: 'notifications-outline' },
  MenuTab: { on: 'menu', off: 'menu-outline' },
};

const LABELS: Record<keyof TabParamList, string> = {
  HomeTab: 'Domov',
  MapTab: 'Mapa',
  TicketsTab: 'Lístky',
  NotificationsTab: 'Notifikácie',
  MenuTab: 'Menu',
};

export function TabNavigator() {
  const unread = useNotificationStore(selectUnreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 0.2 },
        tabBarLabel: LABELS[route.name],
        tabBarIcon: ({ focused, color, size }) => {
          const name = focused ? ICONS[route.name].on : ICONS[route.name].off;
          const showBadge = route.name === 'NotificationsTab' && unread > 0;
          return (
            <View>
              <Ionicons name={name} size={size ?? 22} color={color} />
              {showBadge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -9,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ fontSize: 9, fontFamily: 'Manrope_800ExtraBold', color: colors.text }}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="MapTab" component={LiveMapScreen} />
      <Tab.Screen name="TicketsTab" component={TicketsScreen} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} />
      <Tab.Screen name="MenuTab" component={MenuScreen} />
    </Tab.Navigator>
  );
}
