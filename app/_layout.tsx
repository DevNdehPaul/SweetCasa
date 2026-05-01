import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: 'splashscreen',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Stack>
  <Stack.Screen name="splashscreen" options={{ headerShown: false }} />
  <Stack.Screen name="portal"       options={{ headerShown: false }} />  {/* ← add this */}
  <Stack.Screen name="welcome"      options={{ headerShown: false }} />
  <Stack.Screen name="house_seekers_login_signup" options={{ headerShown: false }} />
  <Stack.Screen name="house_owners_login_signup"  options={{ headerShown: false }} />
  <Stack.Screen name="(tabs)"       options={{ headerShown: false }} />
  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
</Stack>
        </SafeAreaView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}