import { useColorScheme } from 'react-native';

import { palette, type Palette } from '@/constants/theme';

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
