import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/constants/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "light" sits on a blue header, "default" on a page. */
  tone?: 'default' | 'light';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'default',
}: SegmentedControlProps<T>) {
  const trackBg = tone === 'light' ? 'rgba(255,255,255,0.16)' : '#EDF1F6';

  return (
    <View style={{ flexDirection: 'row', backgroundColor: trackBg, borderRadius: radii.chip, padding: 4 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
            }}
          >
            <Text
              variant="caption"
              weight="extrabold"
              color={
                active
                  ? colors.primary
                  : tone === 'light'
                    ? 'rgba(255,255,255,0.8)'
                    : colors.textSecondary
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
