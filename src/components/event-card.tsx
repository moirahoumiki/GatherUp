import Link from "next/link";
import type { GatherEvent } from "@/lib/mock-data";

type EventCardProps = {
  event: GatherEvent;
};

export function EventCard({ event }: EventCardProps) {
  const remaining = event.capacity - event.registered;

  return (
    <Link className="event-card clickable-card" href={`/events/${event.id}`}>
      <div className="event-card-top">
        <p className="muted g2-card-meta">
          {event.city} · {event.customTypeLabel}
        </p>
        <span className="g2-badge">{event.status}</span>
      </div>
      <h3 className="g2-card-title">{event.name}</h3>
      <p className="g2-card-when">
        {event.startsAt} · {event.venue}
      </p>
      <p className="g2-card-desc">{event.description}</p>
      <div className="event-card-bottom">
        <p className="g2-card-price">
          {event.price > 0 ? (
            <>
              <small>¥</small>
              {event.price}
            </>
          ) : (
            "免费"
          )}
        </p>
        <span className="muted g2-card-remaining">剩余 {remaining} 位</span>
      </div>
    </Link>
  );
}
