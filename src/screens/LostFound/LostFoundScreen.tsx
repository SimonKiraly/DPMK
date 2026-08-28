import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { lostFoundService } from '@/services/lostFoundService';
import { useRootNavigation } from '@/navigation/hooks';
import { useLostFoundStore } from '@/store/useLostFoundStore';
import type { LostFoundStatus } from '@/types';
import { formatDate } from '@/utils/format';

const STATUS_TONE: Record<LostFoundStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  open: 'warning',
  matched: 'info',
  resolved: 'success',
  closed: 'neutral',
};

export function LostFoundScreen() {
  const navigation = useRootNavigation();
  const reports = useLostFoundStore((s) => s.reports);

  return (
    <Screen scroll bottomInset={24}>
      <AppHeader title="Straty a nálezy" />

      <Text variant="body" color={colors.textSecondary}>
        Nahláste predmet, ktorý ste stratili vo vozidle, alebo odovzdajte nájdenú vec. Náš dispečing odpovie do 24 hodín.
      </Text>

      <View style={{ gap: 10, marginTop: 16 }}>
        <ChoiceCard
          icon="help-circle"
          iconBg={colors.errorTint}
          iconFg={colors.errorText}
          title="Stratil som predmet"
          subtitle="Opíšte ho a my prehľadáme depo"
          onPress={() => navigation.navigate('ReportForm', { type: 'lost' })}
        />
        <ChoiceCard
          icon="add-circle"
          iconBg={colors.successTint}
          iconFg={colors.successText}
          title="Našiel som predmet"
          subtitle="Oznámte vodičovi alebo odovzdajte v depe"
          onPress={() => navigation.navigate('ReportForm', { type: 'found' })}
        />
      </View>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 22, marginBottom: 8 }}>
        Vaše hlásenia
      </Text>

      {reports.length === 0 ? (
        <EmptyState title="Žiadne hlásenia" description="Odoslané hlásenia sa zobrazia tu aj s ich stavom." dashed />
      ) : (
        <View style={{ gap: 8 }}>
          {reports.map((r) => (
            <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.warningTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={r.type === 'lost' ? 'help' : 'cube'} size={16} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="extrabold" numberOfLines={1}>
                  {r.description.slice(0, 40)}
                  {r.description.length > 40 ? '…' : ''}
                </Text>
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                  Linka {r.routeShortName} · {formatDate(r.createdAt)} · {lostFoundService.projectedStatusNote(r)}
                </Text>
              </View>
              <StatusBadge label={r.reference} tone={STATUS_TONE[r.status]} />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function ChoiceCard({
  icon,
  iconBg,
  iconFg,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconFg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={iconFg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C2CBD8" />
    </Card>
  );
}
