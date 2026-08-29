import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

/**
 * Static fallback shown when the geographic map cannot render — the native map
 * module is unavailable (e.g. an old Expo Go) or the provider threw. The live
 * MHD data (bottom sheet, lists, detail screens) keeps working regardless.
 */
export function MapUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.mapLand,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="map-outline" size={24} color={colors.primary} />
      </View>
      <Text variant="bodyStrong" weight="extrabold" style={{ textAlign: 'center' }}>
        Mapu sa nepodarilo načítať
      </Text>
      {!compact ? (
        <Text variant="caption" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 280 }}>
          Údaje MHD – zastávky, spoje a odchody – zostávajú dostupné nižšie a v ostatných
          sekciách aplikácie.
        </Text>
      ) : null}
    </View>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Catches render errors from the map layer and swaps in {@link MapUnavailable}. */
export class MapErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[TransitMap] map layer failed to render:', (error as Error)?.message ?? error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? <MapUnavailable />;
    return this.props.children;
  }
}
