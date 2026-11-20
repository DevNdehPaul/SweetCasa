// app.config.js (replaces app.json)

// Build the reversed iOS client ID from the same variable the app already uses.
// e.g. 123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const iosUrlScheme =
  process.env.GOOGLE_IOS_URL_SCHEME ||
  (iosClientId
    ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
    : undefined);

module.exports = {
  expo: {
    name: "SweetCasa",
    slug: "SweetCasa",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "sweetcasa",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sweetcasa.app",
      usesAppleSignIn: true,
      buildNumber: process.env.BUILD_NUMBER || "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SweetCasa uses your location to help you set the exact location of your property listing.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.ndehpaul.sweetcasa",
      softwareKeyboardLayoutMode: "resize",
    },
    web: {
      output: "static",
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      "expo-router",
      "expo-localization",
      "expo-web-browser",
      "expo-apple-authentication",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "SweetCasa uses your location to help you set the exact location of your property listing.",
        },
      ],
      [
        "react-native-maps",
        {
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme,
        },
      ],
      "expo-font",
      "expo-image",
      "expo-splash-screen",
      "expo-audio",
      "expo-video",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "0e1f8320-78db-4659-84c7-8027407939e8",
      },
    },
  },
};