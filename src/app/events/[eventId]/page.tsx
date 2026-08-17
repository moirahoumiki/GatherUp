import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, TicketCheck, UsersRound } from "lucide-react";

import { EventAnnouncements } from "@/components/event-announcements";
import { EventShareButton } from "@/components/event-share-button";
import { ViewedEventCacheSync } from "@/components/viewed-event-cache-sync";
import { getPublicEventDetail } from "@/lib/events-data";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const eventDetail = await getPublicEventDetail(eventId);

  if (!eventDetail) {
    notFound();
  }

  const { announcements, event, organizers, setup } = eventDetail;
  const remaining = event.capacity - event.registered;
  const quotaPercent = event.capacity > 0 ? Math.min(Math.round((event.registered / event.capacity) * 100), 100) : 0;
  const canRegister = setup.setupStatus === "报名已开放";
  const primaryAction = canRegister ? "登录并报名" : "提交数调和地点偏好";
  const primaryActionHref = `/events/${event.id}/register?step=${canRegister ? "profile" : "survey"}`;

  return (
    <div className="g2-page g2-detail" data-event-cache-key={event.id}>
      <section className="g2-hero">
        <p className="g2-hero-tag">{event.category} · {event.customTypeLabel} · {event.status}</p>
        <h1 className="g2-hero-title">{event.name}</h1>
        <p className="g2-hero-host">
          {organizers.length > 0 ? `发起人 ${organizers.map((organizer) => organizer.name).join("、")} · ` : ""}
          编号 {event.publicCode}
        </p>
        <div className="g2-hero-actions">
          <EventShareButton eventId={event.id} eventName={event.name} />
        </div>
      </section>

      <section className="g2-info-card">
        <div className="g2-info-row">
          <CalendarDays size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.startsAt}</p>
            <p className="g2-info-sub">报名截止 {event.deadline}</p>
          </div>
        </div>
        <div className="g2-info-row">
          <MapPin size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.venue}</p>
            <p className="g2-info-sub">{event.city} · {event.address}</p>
          </div>
        </div>
        <div className="g2-info-row">
          <UsersRound size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.registered} / {event.capacity} 人已报名</p>
            <p className="g2-info-sub">
              {event.allowMulti ? `每单最多 ${event.maxPeoplePerOrder} 人` : "仅支持单人报名"} · {event.acceptWaitlist ? "满员可候补" : "满员即止"}
            </p>
          </div>
        </div>
      </section>

      {event.description && (
        <>
          <p className="g2-section-label">活动介绍</p>
          <p className="g2-desc">{event.description}</p>
        </>
      )}

      <p className="g2-section-label">票档</p>
      <div className="g2-tickets">
        <div className="g2-ticket">
          <div>
            <p className="g2-ticket-name">{event.price > 0 ? "标准票 · 单人" : "免费参与"}</p>
            <p className="g2-ticket-note">{event.price > 0 ? "报名后线上确认付款" : "无需付款，报名即可"}</p>
          </div>
          <p className="g2-ticket-price">{event.price > 0 ? <><small>¥</small>{event.price}</> : "免费"}</p>
        </div>
        {event.allowMulti && (
          <div className="g2-ticket">
            <div>
              <p className="g2-ticket-name">多人同行</p>
              <p className="g2-ticket-note">一单最多 {event.maxPeoplePerOrder} 人，同行优先相邻安排</p>
            </div>
            <p className="g2-ticket-price">{event.price > 0 ? <><small>¥</small>{event.price} <small>/人</small></> : "免费"}</p>
          </div>
        )}
      </div>

      <div className="g2-quota">
        <span>已报名 {event.registered}</span>
        <div className="g2-quota-bar"><span style={{ width: `${quotaPercent}%` }} /></div>
        <span>{remaining > 0 ? `余 ${remaining} 位` : event.acceptWaitlist ? "可候补" : "已满"}</span>
      </div>

      <p className="g2-section-label">活动信息</p>
      <dl className="g2-detail-facts">
        <div><dt>活动编号</dt><dd>{event.publicCode}</dd></div>
        <div><dt>活动场景</dt><dd>{event.category}</dd></div>
        <div><dt>当前阶段</dt><dd>{setup.setupStatus}</dd></div>
        <div><dt>多人报名</dt><dd>{event.allowMulti ? `支持，最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
        {organizers.length > 0 && (
          <div><dt>组织者</dt><dd>{organizers.map((organizer) => `${organizer.name}（${organizer.role}）`).join("、")}</dd></div>
        )}
      </dl>

      <EventAnnouncements announcements={announcements} />

      <div className="g2-cta-bar">
        <div>
          <p className="g2-cta-price">{event.price > 0 ? <><small>¥</small>{event.price}{event.allowMulti ? " 起" : ""}</> : "免费"}</p>
          <p className="g2-cta-note">{event.deadline} 截止</p>
        </div>
        <Link className="g2-cta-action" href={primaryActionHref}>
          <TicketCheck size={17} aria-hidden="true" />
          {primaryAction}
        </Link>
      </div>
      <ViewedEventCacheSync eventId={event.id} />
    </div>
  );
}
