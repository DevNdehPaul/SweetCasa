// app.config.js (replaces app.json)
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
      buildNumber: "1",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SweetCasa uses your location to help you set the exact location of your property listing.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.ndehpaul.sweetcasa",
      softwareKeyboardLayoutMode: "resize",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      output: "static",
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      "expo-router",
      "expo-localization",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "SweetCasa uses your location to help you set the exact location of your property listing.",
        },
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          // Reversed iOS client ID from Google Cloud Console,
          // e.g. com.googleusercontent.apps.1234567890-abcdef
          iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME,
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