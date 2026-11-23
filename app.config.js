// app.config.js (replaces app.json)

// Google sign-in on iPhone needs the "reversed" iOS client ID as a URL scheme:
//   123-abc.apps.googleusercontent.com  ->  com.googleusercontent.apps.123-abc
// This accepts GOOGLE_IOS_URL_SCHEME in either form (already reversed, or the plain client ID)
// and falls back to EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, so a wrong paste can't break the build.
const REVERSED_PREFIX = 'com.googleusercontent.apps.';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const rawScheme = (process.env.GOOGLE_IOS_URL_SCHEME || iosClientId || '').trim();
const iosUrlScheme = rawScheme
  ? rawScheme.startsWith(REVERSED_PREFIX)
    ? rawScheme
    : `${REVERSED_PREFIX}${rawScheme.replace('.apps.googleusercontent.com', '')}`
  : undefined;

if (!iosUrlScheme) {
  console.warn('[app.config] GOOGLE_IOS_URL_SCHEME / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set: Google sign-in will not work on iPhone.');
}
if (!iosClientId) {
  console.warn('[app.config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set: Google sign-in will be disabled on iPhone.');
}

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
      // iPhone refuses photo access (and can crash) unless these texts are in the build.
      [
        "expo-image-picker",
        {
          photosPermission:
            "SweetCasa needs access to your photos so you can upload property pictures, your profile photo and images for CasaMatch.",
          cameraPermission:
            "SweetCasa needs the camera so you can take a photo of your property or your ID.",
          microphonePermission: false,
        },
      ],
      // Voice notes in CasaMatch AI.
      [
        "expo-audio",
        {
          microphonePermission:
            "SweetCasa uses the microphone so you can send voice notes to CasaMatch AI.",
        },
      ],
      "expo-font",
      "expo-image",
      "expo-splash-screen",
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
