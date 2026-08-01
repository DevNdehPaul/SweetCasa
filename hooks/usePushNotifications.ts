import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { BASE_URL } from "../constants/api";

/**
 * Minimal shape of the notification permission response.
 *
 * NOTE: `expo-notifications@57`'s `NotificationPermissionsStatus` extends
 * `PermissionResponse` from `expo`, but under Expo SDK 54 that imported type
 * resolves to a version without `status`/`granted`/`canAskAgain`. The runtime
 * object does contain these fields, so we cast through this interface to keep
 * the type-checker happy without changing behavior.
 */
type PermissionLike = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
};

// Configure how notifications are shown when the app is foregrounded
// NOTE: Must be guarded for web — expo-notifications uses native modules
// that are not available on web platforms.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Registers the device for push notifications.
 * 1. Requests user permission
 * 2. Gets the Expo push token
 * 3. Sends the token to the SweetCasa backend
 *
 * Should be called on app startup after auth is confirmed.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // 1. Check if the device can receive push notifications
    if (!Device.isDevice) {
      console.log("[push] Push notifications only work on physical devices");
      return null;
    }

    // 2. Check existing notification permissions
    const existingPermissions =
      (await Notifications.getPermissionsAsync()) as unknown as PermissionLike;
    const existingStatus = existingPermissions.status;
    let finalStatus = existingStatus;

    // 3. If not granted yet, ask the user
    if (existingStatus !== "granted") {
      const requestedPermissions =
        (await Notifications.requestPermissionsAsync()) as unknown as PermissionLike;
      finalStatus = requestedPermissions.status;
    }

    // 4. If still not granted, bail out silently
    if (finalStatus !== "granted") {
      console.log("[push] Push notification permission not granted");
      return null;
    }

    // 5. Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
        "0e1f8320-78db-4659-84c7-8027407939e8",
    });
    const token = tokenData.data;
    console.log("[push] Expo push token:", token);

    // 6. Determine platform
    const platform = Platform.OS as "ios" | "android" | "web";

    // 7. Send token to backend
    const authToken = await AsyncStorage.getItem("token");
    if (authToken) {
      await fetch(`${BASE_URL}/notifications/register-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token, platform }),
      });
    }

    // 8. Android-specific notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#7C3AED",
      });
    }

    return token;
  } catch (err) {
    console.error("[push] Registration error:", err);
    return null;
  }
}

/**
 * Sets up notification response listeners.
 * Call this once at app startup (e.g. in _layout.tsx).
 * Returns a cleanup function to remove the listeners.
 */
export function setupNotificationListeners(): () => void {
  // When the user taps/opens a notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data;
        console.log("[push] Notification tapped:", data);

        // If the notification has a screen route, we could navigate to it
        // For example:
        // if (data?.screen) {
        //   router.push(data.screen);
        // }
      },
    );

  // When a notification is received while the app is foregrounded
  const notificationSubscription =
    Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log(
          "[push] Notification received:",
          notification.request.content.title,
        );
      },
    );

  return () => {
    responseSubscription.remove();
    notificationSubscription.remove();
  };
}

/**
 * Unregisters a push token from the backend (e.g. on logout).
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const authToken = await AsyncStorage.getItem("token");
    if (authToken) {
      await fetch(`${BASE_URL}/notifications/register-token`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
    }
  } catch (err) {
    console.error("[push] Unregister error:", err);
  }
}
