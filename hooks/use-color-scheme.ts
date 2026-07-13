import { useResolvedTheme } from '@/contexts/theme-preference';

export function useColorScheme() {
  return useResolvedTheme();
}
