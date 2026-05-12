import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.redlineiq.app",
  appName: "RedlineIQ",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      releaseType: "AAB",
    },
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0D1117",
      showSpinner: false,
    },
  },
};

export default config;
