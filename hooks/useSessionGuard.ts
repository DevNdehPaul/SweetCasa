import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { clearAuthSession } from '../constants/auth';
import { BASE_URL } from '../constants/api';

const CHECK_INTERVAL_MS = 30_000; // while the app is in the foreground

// JWTs are stateless, so a suspended user's existing token would otherwise
// keep working until it naturally expires. This hook periodically asks the
// server "is my session still good?" (GET /auth/session, which itself checks
// live account status) and force-logs-out the moment it isn't — e.g. right
// after an admin suspends the account, on the next check or app foreground.
export function useSessionGuard() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return; // not logged in — nothing to guard

      try {
        const res = await fetch(`${BASE_URL}/auth/session`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          await clearAuthSession();
          if (cancelled) return;
          router.replace('/portal');
          if (data?.code === 'ACCOUNT_SUSPENDED') {
            Alert.alert(
              'Account suspended',
              data.error || 'This account has been suspended. Contact SweetCasa support if you believe this is a mistake.'
            );
          }
        }
      } catch {
        // Network hiccup — don't log the user out over a dropped request.
      }
    };

    checkSession();
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') checkSession();
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);
}
