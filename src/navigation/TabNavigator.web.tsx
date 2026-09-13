import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import { useNotificationStore, selectUnreadCount } from '@/store/useNotificationStore';
import type { TabParamList } from '@/navigation/types';

import { HomeScreen } from '@/screens/Home/HomeScreen';
import { LiveMapScreen } from '@/screens/LiveTransport/LiveMapScreen';
import { TicketsScreen } from '@/screens/Tickets/TicketsScreen';
import { NotificationsScreen } from '@/screens/Notifications/NotificationsScreen';
import { MenuScreen } from '@/screens/Profile/MenuScreen';

/**
 * Web build of the bottom tab bar.
 *
 * The default `@react-navigation/bottom-tabs` bar sizes/label-orientation
 * decisions come from `SafeAreaProviderCompat.initialMetrics.frame` — on web
 * that is a one-off `Dimensions.get('window')` snapshot taken when the module
 * first loads, not the live viewport (see `SafeAreaProviderCompat.tsx`). In
 * practice each tab button is still `flex: 1` and does divide the real width
 * evenly, but the tab *label* has no room to reflow: at narrow widths (≤~360px
 * for 5 tabs) "Notifikácie" hard-truncates ("Notifiká…") instead of wrapping,
 * because the default label renders with `numberOfLines={1}`.
 *
 * This is a from-scratch bar (same routes/icons/labels/badge/colors as the
 * native tab bar) that:
 *   - reads safe-area insets live via `useSafeAreaInsets()`, not a frozen snapshot;
 *   - lets a label wrap onto a second line instead of being clipped, since the
 *     bar has the vertical room for it;
 *   - keeps every tab a `flex: 1` box with `minWidth: 0`, so text can never push
 *     a tab (and the row) wider than the viewport.
 *
 * Native iOS/Android are untouched — this file only exists for the web build
 * (Metro picks it over `TabNavigator.tsx` for `--platform web`).
 */

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

function WebTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useNotificationStore(selectUnreadCount);

  return (
    <View
      style={{
        flexDirection: 'row',
        width: '100%',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        // Live safe-area bottom inset (react-native-safe-area-context reads
        // env(safe-area-inset-bottom) on web) instead of a fixed guess.
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route, index) => {
        const name = route.name as keyof TabParamList;
        const { options } = descriptors[route.key]!;
        const isFocused = state.index === index;
        const color = isFocused ? colors.primary : colors.textTertiary;
        const showBadge = name === 'NotificationsTab' && unread > 0;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? LABELS[name]}
            // flex: 1 + minWidth: 0 is what actually keeps 5 tabs inside any
            // viewport — without minWidth: 0 a flex child's minimum width
            // defaults to its content's natural size on the web, which is how
            // a long label used to push the row wider than the screen.
            style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 2, gap: 2 }}
          >
            <View style={{ minWidth: 0 }}>
              <Ionicons name={isFocused ? ICONS[name].on : ICONS[name].off} size={22} color={color} />
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
            <Text
              numberOfLines={2}
              style={{
                fontFamily: 'Manrope_800ExtraBold',
                fontSize: 10,
                letterSpacing: 0.2,
                color,
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {LABELS[name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <WebTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="MapTab" component={LiveMapScreen} />
      <Tab.Screen name="TicketsTab" component={TicketsScreen} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} />
      <Tab.Screen name="MenuTab" component={MenuScreen} />
    </Tab.Navigator>
  );
}
