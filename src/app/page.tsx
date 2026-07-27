import { EventBrowser } from "@/components/event-browser";
import { getPublicEvents } from "@/lib/events-data";

export default async function HomePage() {
  const events = await getPublicEvents();
  const cityCount = new Set(events.map((event) => event.city)).size;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="apple-title">活动广场</h1>
          <p className="apple-sub">{events.length} 场活动 · {cityCount} 座城市 · 相聚在线下</p>
        </div>
      </header>
      <EventBrowser events={events} />
    </div>
  );
}
