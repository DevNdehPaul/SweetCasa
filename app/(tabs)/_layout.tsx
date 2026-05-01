import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('role').then(r => {
      setRole(r);
      setLoading(false);
    });
  }, []);

  // Show a spinner while reading role from storage
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const tint = Colors[colorScheme ?? 'light'].tint;

  const tabBarStyle = {
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
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
          name="messages"
          options={{ title: 'Messages', tabBarIcon: ({ color }) => <IconSymbol size={26} name="envelope.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="wallet"
          options={{ title: 'Wallet', tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle" color={color} /> }}
        />
        {/* Hide buyer-only screen from seller tab bar */}
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="index" options={{ href: null }} />
      </Tabs>
    );
  }

  // ── BUYER tabs (House Seekers) — default ──────────────────────────────────
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: tint, headerShown: false, tabBarButton: HapticTab, tabBarStyle }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color }) => <IconSymbol size={26} name="envelope.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: 'Wallet', tabBarIcon: ({ color }) => <IconSymbol size={26} name="creditcard.fill" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle" color={color} /> }}
      />
      {/* Hide seller-only screen from buyer tab bar */}
      <Tabs.Screen name="upload" options={{ href: null }} />
      <Tabs.Screen name="agent-dashboard" options={{ href: null }} />
    </Tabs>
  );
}