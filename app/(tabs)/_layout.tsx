import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-app-theme';
import { initI18n } from '../../src/i18n'; // ← i18n import

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const [role, setRole]           = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [i18nReady, setI18nReady] = useState(false);   // ← i18n ready state

  useEffect(() => {
    // Run both in parallel — role load + i18n init
    Promise.all([
      AsyncStorage.getItem('role'),
      initI18n(),                       // ← initialize i18n
    ]).then(([r]) => {
      setRole(r);
      setI18nReady(true);              // ← mark i18n as ready
      setLoading(false);
    });
  }, []);

  // Show spinner while role AND language are loading (usually < 200ms)
  if (loading || !i18nReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tint = colors.tabIconSelected;

  const tabBarStyle = {
  backgroundColor: colors.card,
  color: colors.text,
  borderTopWidth: 0.5,
  borderTopColor: colors.borderLight,
  elevation: 10,
  shadowColor: colors.tabBarShadow,
  shadowOpacity: isDark ? 0.25 : 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: -3 },
};

  // ── SELLER tabs (House Owners) ─────────────────────────────────────────────
  if (role === 'SELLER') {
    return (
      <Tabs screenOptions={{ tabBarActiveTintColor: tint, headerShown: false, tabBarButton: HapticTab, tabBarStyle }}>
        <Tabs.Screen
          name="agent-dashboard"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="upload"
          options={{ title: 'Upload', tabBarIcon: ({ color }) => <IconSymbol size={26} name="plus.circle.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="wallet"
          options={{ title: 'Wallet', tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="report"
          options={{ title: 'Reports', tabBarIcon: ({ color }) => <IconSymbol size={26} name="flag.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle" color={color} /> }}
        />
        {/* Hide buyer-only screens from seller tab bar */}
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="seeker-dashboard" options={{ href: null }} />
      </Tabs>
    );
  }

  // ── BUYER tabs (House Seekers) — default ──────────────────────────────────
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: tint, headerShown: false, tabBarButton: HapticTab, tabBarStyle }}>
      <Tabs.Screen
        name="seeker-dashboard"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: 'Wallet', tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: 'Reports', tabBarIcon: ({ color }) => <IconSymbol size={26} name="flag.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle" color={color} /> }}
      />
      {/* Hide seller-only screens from buyer tab bar */}
      <Tabs.Screen name="upload" options={{ href: null }} />
      <Tabs.Screen name="agent-dashboard" options={{ href: null }} />
    </Tabs>
  );
}