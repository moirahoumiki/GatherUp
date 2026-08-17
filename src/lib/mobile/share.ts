"use client";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

type ShareEventOptions = {
  eventName: string;
  eventUrl: string;
  text?: string;
};

export async function shareEventLink(options: ShareEventOptions) {
  const shareText = options.text ?? `一起参加「${options.eventName}」：${options.eventUrl}`;
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: options.eventName,
      text: shareText,
      url: options.eventUrl,
      dialogTitle: "分享活动"
    });
    return { ok: true as const, channel: "native" as const };
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: options.eventName,
      text: shareText,
      url: options.eventUrl
    });
    return { ok: true as const, channel: "web" as const };
  }

  return { ok: false as const, channel: "unsupported" as const };
}