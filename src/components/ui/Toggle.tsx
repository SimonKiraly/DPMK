import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { colors } from '@/constants/theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Animated on/off switch matching the design (green = on). */
export function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 24] });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#CFD8E3', colors.success],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={{ opacity: disabled ? 0.5 : 1 }}
      hitSlop={8}
    >
      <Animated.View style={{ width: 51, height: 31, borderRadius: 16, backgroundColor }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 3,
            width: 25,
            height: 25,
            borderRadius: 13,
            backgroundColor: colors.white,
            transform: [{ translateX }],
            shadowColor: colors.black,
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
