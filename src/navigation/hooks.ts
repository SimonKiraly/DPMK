import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';

/** Typed root-stack navigation for use anywhere in the tree. */
export function useRootNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
