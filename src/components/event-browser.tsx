import { EventCard } from "@/components/event-card";
import { type GatherEvent } from "@/lib/mock-data";

type EventBrowserProps = {
  events: GatherEvent[];
};

export function EventBrowser({ events }: EventBrowserProps) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <strong>暂时没有活动</strong>
        <span>新活动上线后会第一时间出现在这里。</span>
      </div>
    );
  }

  return (
    <section className="g2-cards">
      {events.map((event) => (
        <EventCard event={event} key={event.id} />
      ))}
    </section>
  );
}
