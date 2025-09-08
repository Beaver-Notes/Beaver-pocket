import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "beaver.notes.pocket",
  appName: "Beaver Pocket",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 200,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false,
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
    EdgeToEdge: {
      backgroundColor: "#00000000",
    },
    Keyboard: {
      resize: 'native',
    },
    CapacitorHttp: {
      enabled: true,
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
