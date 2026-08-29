import { View, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

/** The small grab bar at the top of a bottom sheet. */
export function SheetHandle({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ paddingTop: 10, paddingBottom: 8, alignItems: 'center' }, style]}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
    </View>
  );
}
