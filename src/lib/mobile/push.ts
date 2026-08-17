"use client";

import { PushNotifications, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";

import { getPlatform, isNativePlatform } from "@/lib/mobile/env";

type RegisterPushNotificationsOptions = {
  onForegroundMessage?: (notification: PushNotificationSchema) => void;
  onNavigate?: (path: string) => void;
};

let listenersAttached = false;

function getRouteFromPush(notification: PushNotificationSchema): string | null {
  const data = notification.data ?? {};
  const route = typeof data.route === "string" ? data.route.trim() : "";
  const eventId = typeof data.event_id === "string" ? data.event_id.trim() : "";
  const orderNumber = typeof data.order_number === "string" ? data.order_number.trim() : "";

  if (route.startsWith("/")) return route;
  if (eventId) return `/events/${eventId}`;
  if (orderNumber) return `/me/orders/${orderNumber}`;
  return null;
}

async function registerDeviceToken(token: string) {
  const response = await fetch("/api/push/register-device", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      platform: getPlatform()
    })
  });

  if (!response.ok) {
    throw new Error("Failed to register push device token.");
  }
}

export async function registerPushNotifications(options: RegisterPushNotificationsOptions = {}) {
  if (!isNativePlatform()) {
    return { ok: false, reason: "not-native" as const };
  }

  if (!listenersAttached) {
    PushNotifications.addListener("registration", async (token: Token) => {
      try {
        await registerDeviceToken(token.value);
      } catch {
        // Keep silent to avoid interrupting app runtime.
      }
    });

    PushNotifications.addListener("registrationError", () => {
      // no-op: UI should stay usable even if APNs registration fails
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      options.onForegroundMessage?.(notification);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gatherup:push:received", { detail: notification }));
      }
    });

    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const route = getRouteFromPush(notification);
      if (!route) return;
      options.onNavigate?.(route);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gatherup:push:navigate", { detail: { route, notification } }));
      }
    });

    listenersAttached = true;
  }

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    return { ok: false, reason: "permission-denied" as const };
  }

  await PushNotifications.register();
  return { ok: true as const };
}
