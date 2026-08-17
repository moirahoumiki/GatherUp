import { Capacitor } from "@capacitor/core";

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

export const getPlatform = (): string => Capacitor.getPlatform();

export const isIosNative = (): boolean => isNativePlatform() && getPlatform() === "ios";

export const isAndroidNative = (): boolean =>
  isNativePlatform() && getPlatform() === "android";