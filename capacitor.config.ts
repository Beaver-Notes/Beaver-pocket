import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "beaver.notes.pocket",
  appName: "Beaver Pocket",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
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
      useDialog: true,
    },
    SocialLogin: {
      google: {
        webClientId: process.env.VITE_ANDROID_GOOGLE_CLIENT_ID,
        iOSClientId: process.env.VITE_IOS_GOOGLE_CLIENT_ID,
        mode: "offline",
      },
    },
    Keyboard: {
      //@ts-ignore
      resize: "none",
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
