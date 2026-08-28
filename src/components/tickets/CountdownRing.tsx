import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

export interface CountdownRingProps {
  /** 0..1 elapsed fraction. */
  progress: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  progressColor?: string;
  centerLabel?: string;
}

/** Circular progress ring for the active ticket. */
export function CountdownRing({
  progress,
  size = 74,
  stroke = 7,
  trackColor = 'rgba(122,92,0,0.22)',
  progressColor = colors.text,
  centerLabel,
}: CountdownRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const remainingFraction = 1 - clamped;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={progressColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remainingFraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {centerLabel ? (
        <Text variant="caption" weight="extrabold" color={progressColor} style={{ position: 'absolute' }}>
          {centerLabel}
        </Text>
      ) : null}
    </View>
  );
}
