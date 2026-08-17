import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import { isNativePlatform } from "@/lib/mobile/env";

let initialized = false;

export const initCapacitor = async (): Promise<void> => {
  if (!isNativePlatform() || initialized) {
    return;
  }

  initialized = true;

  try {
    await SplashScreen.hide();
  } catch {
    // Ignore when splash plugin is unavailable in web runtime.
  }

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // Ignore when status bar plugin is unavailable in web runtime.
  }

};