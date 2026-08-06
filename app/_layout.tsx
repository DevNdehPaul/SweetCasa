import {
  ThemePreferenceProvider,
  useResolvedTheme,
} from "@/contexts/theme-preference";
import { Colors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "../hooks/usePushNotifications";
import { useSessionGuard } from "../hooks/useSessionGuard";

function RootStack() {
  const colorScheme = useResolvedTheme();
  const colors = Colors[colorScheme];
  useSessionGuard();

  // ── Push notification setup ────────────────────────────────────────────────
  useEffect(() => {
    // Set up notification response listeners (tapping a notification etc.)
    const cleanupListeners = setupNotificationListeners();

    // Auto-register for push notifications if the user is logged in
    const tryRegisterPush = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        // Don't await — registration should not block the UI
        registerForPushNotifications();
      }
    };
    tryRegisterPush();

    return () => {
      cleanupListeners();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="portal" options={{ headerShown: false }} />
          <Stack.Screen
            name="ForgotPassword"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="ResetPassword" options={{ headerShown: false }} />
          <Stack.Screen name="listings" options={{ headerShown: false }} />
          <Stack.Screen
            name="house_seekers_login_signup"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="house_owners_login_signup"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding_house_seekers"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding_house_owners"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="searchresults" options={{ headerShown: false }} />
          <Stack.Screen
            name="propertydetail"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="favourites" options={{ headerShown: false }} />
          <Stack.Screen
            name="MessagesScreen"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="MessagesInbox" options={{ headerShown: false }} />
          <Stack.Screen name="messages" options={{ headerShown: false }} />
          <Stack.Screen name="TermsOwner" options={{ headerShown: false }} />
          <Stack.Screen name="TermsSeeker" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="notificationcenter" options={{ headerShown: false }} />
          <Stack.Screen
            name="TermsOwnerRead"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TermsSeekerRead"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="PrivacyOwner" options={{ headerShown: false }} />
          <Stack.Screen name="PrivacySeeker" options={{ headerShown: false }} />
          <Stack.Screen
            name="AccountInformation"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="casamatch" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaView>
      <StatusBar style={colorScheme === "dark" ? "light" : "auto"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <SafeAreaProvider>
        <RootStack />
      </SafeAreaProvider>
    </ThemePreferenceProvider>
  );
}
