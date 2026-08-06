import { useMemo } from 'react';
import { Colors, ThemeColors } from '@/constants/theme';
import { useResolvedTheme } from '@/contexts/theme-preference';

// Use this everywhere instead of hooks/use-color-scheme.ts — that one only
// reads the raw OS setting, and ignores the in-app toggle in Settings (which
// is backed by contexts/theme-preference.tsx and persisted to AsyncStorage).
// This hook is the one that actually reflects what the user picked.
export function useAppTheme(): { colors: ThemeColors; scheme: 'light' | 'dark'; isDark: boolean } {
  const scheme = useResolvedTheme();
  const colors = useMemo(() => Colors[scheme], [scheme]);
  return { colors, scheme, isDark: scheme === 'dark' };
}
