"use client";

import { useEffect } from "react";

import { cacheViewedEvent } from "@/lib/mobile/offline-cache";

type ViewedEventCacheSyncProps = {
  eventId: string;
};

export function ViewedEventCacheSync({ eventId }: ViewedEventCacheSyncProps) {
  useEffect(() => {
    cacheViewedEvent(eventId);
  }, [eventId]);

  return null;
}