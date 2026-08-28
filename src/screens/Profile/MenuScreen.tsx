import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientHeader } from '@/components/ui/GradientHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { APP_NAME, APP_VERSION, OPERATOR } from '@/constants/config';
import { colors } from '@/constants/theme';
import { useRootNavigation } from '@/navigation/hooks';
import { useNotificationStore, selectUnreadCount } from '@/store/useNotificationStore';
import { useUserStore } from '@/store/useUserStore';

type Dest =
  | 'Profile'
  | 'Wallet'
  | 'Favorites'
  | 'MyTickets'
  | 'LostFound'
  | 'Settings'
  | 'NotificationsTab';

interface Item {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  dest: Dest;
  badge?: string;
}

export function MenuScreen() {
  const navigation = useRootNavigation();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);
  const unread = useNotificationStore(selectUnreadCount);

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Účet',
      items: [
        { label: 'Môj účet', icon: 'person-circle-outline', dest: 'Profile' },
        { label: 'Notifikácie', icon: 'notifications-outline', dest: 'NotificationsTab', badge: unread ? `${unread} nové` : undefined },
        { label: 'Peňaženka', icon: 'wallet-outline', dest: 'Wallet' },
        { label: 'Obľúbené', icon: 'star-outline', dest: 'Favorites' },
      ],
    },
    {
      title: 'Cestovanie',
      items: [
        { label: 'Moje lístky', icon: 'ticket-outline', dest: 'MyTickets' },
        { label: 'Straty a nálezy', icon: 'search-outline', dest: 'LostFound' },
      ],
    },
    {
      title: 'Preferencie',
      items: [
        { label: 'Nastavenia', icon: 'settings-outline', dest: 'Settings' },
        { label: 'Jazyk a mesto', icon: 'language-outline', dest: 'Settings' },
        { label: 'Prístupnosť', icon: 'accessibility-outline', dest: 'Settings' },
      ],
    },
  ];

  const go = (dest: Dest) => {
    if (dest === 'NotificationsTab') {
      navigation.navigate('Main', { screen: 'NotificationsTab' });
      return;
    }
    navigation.navigate(dest);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <GradientHeader paddingBottom={24}>
          <ListRow
            title={user?.fullName ?? 'Hosť'}
            subtitle={user ? `${user.cityCardVerified ? 'Mestská karta · overená · ' : ''}Košice` : 'Prihláste sa pre viac funkcií'}
            divider={false}
            onPress={() => navigation.navigate('Profile')}
            left={
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodyStrong" weight="extrabold" color={colors.text}>
                  {user?.initials ?? 'MHD'}
                </Text>
              </View>
            }
          />
        </GradientHeader>

        <View style={{ padding: 20, gap: 18 }}>
          {groups.map((group) => (
            <View key={group.title}>
              <Text variant="overline" color={colors.textTertiary} style={{ marginBottom: 8 }}>
                {group.title}
              </Text>
              <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' }}>
                {group.items.map((item, i) => (
                  <ListRow
                    key={item.label}
                    title={item.label}
                    badge={item.badge ? { label: item.badge, tone: 'accent' } : undefined}
                    divider={i < group.items.length - 1}
                    onPress={() => go(item.dest)}
                    left={
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: colors.primaryTint,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={item.icon} size={16} color={colors.primary} />
                      </View>
                    }
                  />
                ))}
              </View>
            </View>
          ))}

          <Text variant="caption" center color={colors.textTertiary}>
            {APP_NAME} {APP_VERSION} · {OPERATOR}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
