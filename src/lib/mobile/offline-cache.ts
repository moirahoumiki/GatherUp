const VIEWED_EVENT_CACHE_KEY = "gatherup:viewed-events";

type ViewedEventRecord = {
  id: string;
  path: string;
  viewedAt: string;
};

function readViewedEvents(): ViewedEventRecord[] {
  try {
    const raw = window.localStorage.getItem(VIEWED_EVENT_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ViewedEventRecord => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const typed = item as Partial<ViewedEventRecord>;
      return typeof typed.id === "string" && typeof typed.path === "string" && typeof typed.viewedAt === "string";
    });
  } catch {
    return [];
  }
}

export function cacheViewedEvent(eventId: string): void {
  if (!eventId) {
    return;
  }

  const nextRecord: ViewedEventRecord = {
    id: eventId,
    path: `/events/${eventId}`,
    viewedAt: new Date().toISOString()
  };
  const entries = readViewedEvents().filter((item) => item.id !== eventId);
  const next = [nextRecord, ...entries].slice(0, 20);
  window.localStorage.setItem(VIEWED_EVENT_CACHE_KEY, JSON.stringify(next));
}