import { type EventAnnouncement } from "@/lib/mock-data";

type EventAnnouncementsProps = {
  announcements: EventAnnouncement[];
};

export function EventAnnouncements({ announcements }: EventAnnouncementsProps) {
  const publishedAnnouncements = announcements.filter((announcement) => announcement.status === "已发布");

  if (publishedAnnouncements.length === 0) {
    return null;
  }

  return (
    <section>
      <p className="g2-section-label">活动通知</p>
      <div className="announcement-list">
        {publishedAnnouncements.map((announcement) => (
          <article className="announcement-card" key={announcement.id}>
            <div className="announcement-card-top">
              <span className="tag">{announcement.type}</span>
              <small>{announcement.publishedAt}</small>
            </div>
            <strong>{announcement.title}</strong>
            <p>{announcement.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
