import type { CapacitorConfig } from "@capacitor/cli";

const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.gatherup.app",
  appName: "GatherUp",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "gatherup",
    ...(devServerUrl
      ? {
          url: devServerUrl,
          cleartext: true
        }
      : {})
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff"
    }
  },
};

export default config;