import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, layout } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Apply the standard 20px horizontal gutter (default true). */
  padded?: boolean;
  background?: string;
  /** Safe-area edges to pad. Default none — headers (AppHeader / GradientHeader) own the top inset. */
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding so content clears the tab bar / floating CTA. */
  bottomInset?: number;
  /** Sticky footer rendered outside the scroll area (e.g. a primary CTA bar). */
  footer?: ReactNode;
  scrollProps?: Omit<ScrollViewProps, 'children'>;
}

/**
 * Standard screen shell: safe-area aware, themed background, optional scroll,
 * pull-to-refresh and a sticky footer. Every screen uses this for consistent
 * insets.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  background = colors.bg,
  edges = [],
  contentContainerStyle,
  style,
  refreshing,
  onRefresh,
  bottomInset = 0,
  footer,
  scrollProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const gutter = padded ? layout.screenGutter : 0;
  // Reserve room so scrolled content isn't hidden behind the sticky footer.
  const footerReserve = footer ? 96 : 0;

  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { paddingHorizontal: gutter, paddingBottom: bottomInset + footerReserve + 24 },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: gutter, paddingBottom: bottomInset }, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: background }, style]}>
      {inner}
      {footer ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 6,
            backgroundColor: background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
