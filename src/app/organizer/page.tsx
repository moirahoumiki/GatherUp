import Link from "next/link";
import {
  Armchair,
  CalendarCheck,
  CircleDollarSign,
  ClipboardCheck,
  MapPinned,
  Plus,
  QrCode,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";

import { LocalCreatedEventList } from "@/components/local-created-event-list";
import { MetricCard } from "@/components/metric-card";
import { getNextActions } from "@/components/next-action-card";
import { OrganizerVerificationPanel } from "@/components/organizer-verification-panel";
import { buildOrganizerDashboardMetrics } from "@/domain/organizer-dashboard-metrics";
import type { EventSetup, GatherEvent, Registration } from "@/lib/mock-data";
import { getOrganizerDashboard } from "@/lib/organizer-data";

export const dynamic = "force-dynamic";

function getPrimaryAction(event: GatherEvent, setup: EventSetup, eventRegistrations: Registration[]) {
  return getNextActions({
    basePath: `/organizer/events/${event.id}`,
    event,
    registrations: eventRegistrations,
    setup
  })[0];
}

function OrganizerPageHeader() {
  return (
    <section className="page-header workspace-header">
      <div>
        <h1 className="apple-title">组织工作台</h1>
        <p className="apple-sub">先处理会阻塞参与者的事项，再检查筹备进度。</p>
      </div>
      <div className="button-row">
        <Link className="button primary" href="/organizer/events/new">
          <Plus size={17} />
          创建活动
        </Link>
      </div>
    </section>
  );
}

export default async function OrganizerPage() {
  const dashboard = await getOrganizerDashboard();
  const { errorMessage, eventSetups, events, organizersByEventId, registrations, status } = dashboard;

  if (status === "error") {
    return (
      <>
        <OrganizerPageHeader />
        <section className="content-card dashboard-load-error" role="alert">
          <span className="dashboard-load-error-icon"><TriangleAlert size={22} /></span>
          <div>
            <p className="eyebrow">数据载入异常</p>
            <h2>暂时无法显示主办工作台</h2>
            <p className="subtle">{errorMessage ?? "请重新加载页面；若问题持续，请检查后端状态。"}</p>
            <div className="button-row">
              <Link className="button primary" href="/organizer">
                <RefreshCw size={16} />
                重新加载
              </Link>
              <Link className="button secondary" href="/dev/status">
                <ServerCog size={16} />
                查看系统状态
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const metrics = buildOrganizerDashboardMetrics(events, eventSetups, registrations);
  const activeSetups = eventSetups.filter((setup) => setup.setupStatus !== "报名已开放");
  const pendingPaymentRegistrations = registrations.filter((registration) => registration.paymentStatus === "待审核");
  const firstSetupEventId = activeSetups[0]?.eventId ?? events[0]?.id ?? "";
  const firstPaymentEventId = eventSetups.find((setup) => setup.paymentQrStatus === "已配置")?.eventId ?? events[0]?.id ?? "";
  const firstPendingPaymentEventId = pendingPaymentRegistrations[0]?.eventId ?? firstSetupEventId;
  const setupHref = firstSetupEventId ? "#setup-list" : "/organizer/events/new";
  const paymentHref = firstPaymentEventId ? `/organizer/events/${firstPaymentEventId}/finance` : "/organizer/events/new";
  const pendingPaymentHref = firstPendingPaymentEventId ? `/organizer/events/${firstPendingPaymentEventId}?panel=orders` : "/organizer/events/new";

  return (
    <>
      <OrganizerPageHeader />

      <section className="metrics-grid dashboard-primary-metrics" aria-label="关键运营指标">
        <MetricCard
          href={pendingPaymentHref}
          icon={<ClipboardCheck size={19} />}
          label="待审核付款"
          meta={metrics.pendingPaymentCount > 0 ? "优先处理，减少等待" : "当前没有积压"}
          tone={metrics.pendingPaymentCount > 0 ? "attention" : "positive"}
          value={metrics.pendingPaymentCount}
        />
        <MetricCard
          href={setupHref}
          icon={<CalendarCheck size={19} />}
          label="筹备中活动"
          meta="尚未开放正式报名"
          value={metrics.activeSetupCount}
        />
        <MetricCard
          icon={<CircleDollarSign size={19} />}
          label="已确认收入"
          meta="以审核通过的付款为准"
          tone="positive"
          value={`¥${metrics.confirmedRevenue}`}
        />
        <MetricCard
          icon={<CalendarCheck size={19} />}
          label="签到率"
          meta="已确认参与者现场数据"
          value={`${metrics.checkInRatePercent}%`}
        />
      </section>

      <section className="dashboard-health-strip" aria-label="运营健康度">
        <Link href={paymentHref}>
          <span><QrCode size={16} />收款配置</span>
          <strong>{metrics.paymentReadyCount}/{metrics.totalSetups}</strong>
        </Link>
        <div>
          <span><Armchair size={16} />选座进度</span>
          <strong>{metrics.seatingProgressPercent}%</strong>
        </div>
        <div>
          <span><ShieldCheck size={16} />退款风险单</span>
          <strong>{metrics.refundExposureCount}</strong>
        </div>
      </section>

      <div className="section-title-row">
        <div>
          <p className="eyebrow">行动队列</p>
          <h2>正在筹备的活动</h2>
        </div>
        <span>{activeSetups.length} 场需要推进</span>
      </div>

      <section className="setup-grid" id="setup-list">
        {activeSetups.length === 0 ? (
          <div className="empty-state">
            <strong>当前没有筹备中的活动</strong>
            <span>新建活动，或查看已经开放报名的活动。</span>
          </div>
        ) : null}

        {activeSetups.map((setup) => {
          const event = events.find((item) => item.id === setup.eventId);

          if (!event) {
            return null;
          }

          const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id);
          const selectedTime = setup.surveyOptions.find((option) => option.selected);
          const selectedVenue = setup.venueOptions.find((option) => option.selected);
          const primaryAction = getPrimaryAction(event, setup, eventRegistrations);

          return (
            <article className="content-card setup-card" key={setup.eventId}>
              <div className="section-heading">
                <div>
                  <span className="tag">{setup.setupStatus}</span>
                  <h2>{event.name}</h2>
                  <p className="event-meta compact">{event.publicCode}</p>
                </div>
                <QrCode size={20} />
              </div>
              <div className="setup-checklist">
                <span className={setup.paymentQrStatus === "已配置" ? "done" : "pending"}>
                  <QrCode size={15} />收款二维码：{setup.paymentQrStatus}
                </span>
                <span className="done">
                  <CalendarCheck size={15} />数调领先：{selectedTime?.label ?? "未选择"}
                </span>
                <span className="done">
                  <MapPinned size={15} />地点领先：{selectedVenue?.label ?? "未选择"}
                </span>
              </div>
              <p className="subtle">{primaryAction.description}</p>
              <div className="button-row">
                <Link className={`button ${primaryAction.urgent ? "primary" : "secondary"}`} href={primaryAction.href}>{primaryAction.label}</Link>
                <Link className="button secondary" href={`/organizer/events/${event.id}/finance`}><CircleDollarSign size={16} />财务</Link>
              </div>
            </article>
          );
        })}
      </section>

      <div className="section-title-row table-section-title">
        <div>
          <p className="eyebrow">活动总览</p>
          <h2>全部活动</h2>
        </div>
        <span>{events.length} 场活动</span>
      </div>

      <section className="data-table">
        <div className="table-row header">
          <span>活动</span><span>阶段</span><span>报名</span><span>待处理</span><span>操作</span>
        </div>
        {events.map((event) => {
          const setup = eventSetups.find((item) => item.eventId === event.id);
          const organizers = organizersByEventId.get(event.id) ?? [];
          const pendingPaymentCount = registrations.filter(
            (registration) => registration.eventId === event.id && registration.paymentStatus === "待审核"
          ).length;

          return (
            <div className="table-row" key={event.id}>
              <span>
                <strong>{event.name}</strong>
                <small>{event.publicCode} · {organizers.map((organizer) => organizer.publicId).join(" / ")}</small>
              </span>
              <span>{setup?.setupStatus ?? event.status}</span>
              <span>{event.registered}/{event.capacity}</span>
              <span>
                {pendingPaymentCount > 0 ? (
                  <Link className="status-badge warning" href={`/organizer/events/${event.id}?panel=orders`}>
                    {pendingPaymentCount} 笔付款
                  </Link>
                ) : (
                  <span className="status-badge neutral">无待办</span>
                )}
              </span>
              <Link className="button secondary" href={`/organizer/events/${event.id}`}>管理</Link>
            </div>
          );
        })}
      </section>

      <LocalCreatedEventList />

      <details className="verification-disclosure">
        <summary>
          <span>
            <ShieldCheck size={20} />
            <span>
              <strong>收费活动发布资格</strong>
              <small>仅在需要提交或更新主办认证时展开</small>
            </span>
          </span>
          <span className="status-badge neutral">查看认证</span>
        </summary>
        <div className="verification-disclosure-body">
          <OrganizerVerificationPanel />
        </div>
      </details>
    </>
  );
}
