import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark';

type ThemePreferenceContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  loaded: boolean;
};

const THEME_KEY = 'sweetcasa_theme';
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useSystemColorScheme() === 'dark' ? 'dark' : 'light';
  const [theme, setThemeState] = useState<ThemePreference>(systemTheme);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (!active) return;

        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        } else {
          setThemeState(systemTheme);
        }
      } catch {
        if (active) {
          setThemeState(systemTheme);
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    };

    loadTheme();

    return () => {
      active = false;
    };
  }, [systemTheme]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
  }, [loaded, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: ThemePreference) => setThemeState(next),
      loaded,
    }),
    [theme, loaded],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

export function useResolvedTheme() {
  const systemTheme = useSystemColorScheme() === 'dark' ? 'dark' : 'light';
  const preference = useContext(ThemePreferenceContext);
  return preference?.theme ?? systemTheme;
}

export { THEME_KEY };
