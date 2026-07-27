import Link from "next/link";

import { AccountPanel } from "@/components/account-panel";
import { StatusBadge } from "@/components/status-badge";
import { WaitlistInvitationActions } from "@/components/waitlist-invitation-actions";
import { getMyOrders } from "@/lib/orders-data";

export default async function MyEventsPage() {
  const { eventsById, registrations, waitlistInvitations } = await getMyOrders();
  const pendingPayments = registrations.filter((registration) => registration.paymentStatus === "待审核").length;
  const pendingSeats = registrations.filter((registration) => registration.seatStatus === "待选座/签到").length;
  const activeWaitlistInvitations = waitlistInvitations.filter((entry) => entry.status === "invited");

  const hasAnyOrders = registrations.length > 0 || waitlistInvitations.length > 0;

  return (
    <>
      <section className="page-header">
        <div>
          <h1 className="apple-title">我的活动</h1>
          <p className="apple-sub">管理你的报名订单和账号资料。</p>
        </div>
      </section>

      {hasAnyOrders && (
        <section className="metrics-grid">
          <div className="metric-card"><strong>{pendingPayments}</strong><span>待审核</span></div>
          <div className="metric-card"><strong>{pendingSeats}</strong><span>待选座</span></div>
          <div className="metric-card"><strong>{activeWaitlistInvitations.length}</strong><span>候补邀请</span></div>
          <div className="metric-card"><strong>{registrations.length}</strong><span>历史活动</span></div>
        </section>
      )}

      <AccountPanel />

      {waitlistInvitations.length > 0 && (
        <section className="stack">
          {waitlistInvitations.map((entry) => (
            <article className="order-card" key={entry.id}>
              <div>
                <span className="tag">{entry.status === "invited" ? "候补转正邀请" : "候补中"}</span>
                <h3>{entry.event?.name ?? "候补活动"}</h3>
                <p className="subtle">
                  {entry.desiredQuantity} 人 · 排序 {entry.priorityPosition ?? "待计算"} · 邀请有效期 {entry.expiresAt}
                </p>
              </div>
              {entry.status === "invited" ? (
                <WaitlistInvitationActions
                  defaultContact=""
                  eventId={entry.eventId}
                  waitlistEntryId={entry.id}
                />
              ) : (
                <div className="order-actions">
                  <StatusBadge>候补中</StatusBadge>
                  <Link className="button secondary" href={`/events/${entry.eventId}`}>查看活动</Link>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="stack">
        {registrations.length === 0 ? (
          <div className="empty-state">
            <strong>还没有报名记录</strong>
            <span>找到感兴趣的活动后，报名订单会出现在这里。</span>
            <Link className="button secondary" href="/">浏览活动</Link>
          </div>
        ) : null}

        {registrations.map((registration) => {
          const event = eventsById.get(registration.eventId);

          return (
            <article className="order-card" key={registration.orderNumber}>
              <div>
                <span className="tag">{registration.orderNumber}</span>
                <h3>{event?.name}</h3>
                <p className="subtle">
                  {registration.quantity} 人 · ¥{registration.amount} · {registration.seatStatus}
                </p>
              </div>
              <div className="order-actions">
                <StatusBadge>{registration.paymentStatus}</StatusBadge>
                <Link className="button secondary" href={`/me/orders/${registration.orderNumber}`}>查看订单</Link>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
