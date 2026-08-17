import { App, type URLOpenListenerEvent } from "@capacitor/app";

import { isNativePlatform } from "@/lib/mobile/env";

type RouterLike = {
  push: (href: string) => void;
};

type DeepLinkHandlerOptions = {
  onAppleOAuthCallback?: (url: URL) => void;
  router: RouterLike;
};

let removeUrlOpenListener: (() => void) | null = null;

function normalizePathFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.pathname && parsed.pathname !== "/") {
      return parsed.pathname;
    }

    if (parsed.protocol === "gatherup:") {
      const hostPath = parsed.host ? `/${parsed.host}` : "";
      return `${hostPath}${parsed.pathname || ""}` || "/";
    }

    return null;
  } catch {
    return null;
  }
}

function toInternalRoute(pathname: string, rawUrl: string): string | null {
  const eventMatch = pathname.match(/^\/events\/([^/?#]+)/i);
  if (eventMatch) {
    return `/events/${eventMatch[1]}`;
  }

  const orderMatch = pathname.match(/^\/orders\/([^/?#]+)/i);
  if (orderMatch) {
    return `/me/orders/${orderMatch[1]}`;
  }

  const meOrderMatch = pathname.match(/^\/me\/orders\/([^/?#]+)/i);
  if (meOrderMatch) {
    return `/me/orders/${meOrderMatch[1]}`;
  }

  if (/^\/(login|onboarding|organizer|me|venues)(\/|$)/i.test(pathname)) {
    return pathname;
  }

  if (/^\/auth\/apple\/callback$/i.test(pathname)) {
    try {
      const parsed = new URL(rawUrl);
      return `/login${parsed.search || ""}`;
    } catch {
      return "/login";
    }
  }

  return null;
}

function handleUrlOpen(event: URLOpenListenerEvent, options: DeepLinkHandlerOptions): void {
  const pathname = normalizePathFromUrl(event.url);
  if (!pathname) {
    return;
  }

  try {
    const parsed = new URL(event.url);
    if (/^\/auth\/apple\/callback$/i.test(pathname)) {
      options.onAppleOAuthCallback?.(parsed);
    }
  } catch {
    // Ignore malformed callback URLs.
  }

  const route = toInternalRoute(pathname, event.url);
  if (route) {
    options.router.push(route);
  }
}

export function initDeepLinkListener(options: DeepLinkHandlerOptions): void {
  if (!isNativePlatform() || removeUrlOpenListener) {
    return;
  }

  void App.addListener("appUrlOpen", (event) => {
    handleUrlOpen(event, options);
  }).then((handle) => {
    removeUrlOpenListener = () => {
      void handle.remove();
      removeUrlOpenListener = null;
    };
  });
}

export function disposeDeepLinkListener(): void {
  removeUrlOpenListener?.();
}