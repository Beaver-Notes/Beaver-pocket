import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "beaver.notes.pocket",
  appName: "Beaver Pocket",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    GoogleAuth: {
      clientId: process.env.VITE_ANDROID_GOOGLE_CLIENT_ID, // Web app client ID (browser use)
      iosClientId: process.env.VITE_IOS_GOOGLE_CLIENT_ID, // iOS client ID
      androidClientId: process.env.VITE_ANDROID_GOOGLE_CLIENT_ID, // Android client ID
      servserverClientId: process.env.VITE_ANDROID_GOOGLE_CLIENT_ID, // Android client ID
      scopes: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.file",
      ],
      forceCodeForRefreshToken: true,
    },
    Keyboard: {
      resize: 'native',
    },
    CapacitorHttp: {
      enabled: true,
    },
    EdgeToEdge: {
      backgroundColor: "#00000000",
    },
  },
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: "undefined",
      keystoreAlias: "undefined",
    },
  },
};

export default config;
