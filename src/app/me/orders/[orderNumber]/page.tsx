import { notFound } from "next/navigation";
import { AlertCircle, Clock3, QrCode, TicketCheck, UsersRound } from "lucide-react";

import { ParticipantOrderActions } from "@/components/participant-order-actions";
import { OrderSeatSelectionPanel } from "@/components/order-seat-selection-panel";
import { StatusBadge } from "@/components/status-badge";
import { getOrderDetail } from "@/lib/orders-data";

type OrderPageProps = {
  params: Promise<{ orderNumber: string }>;
};

function refundStatusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: "退款待审核",
    approved: "主办已同意退款",
    rejected: "退款已拒绝",
    paid_offline: "主办已线下打款",
    proof_uploaded: "退款凭证已上传",
    confirmed: "已确认收款",
    disputed: "退款有争议",
    cancelled: "退款已取消"
  };

  return labels[status] ?? status;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderNumber } = await params;
  const orderDetail = await getOrderDetail(orderNumber);

  if (!orderDetail) {
    notFound();
  }

  const { event, refundRequest, registration } = orderDetail;
  const isConfirmed = registration.paymentStatus === "付款已确认";
  const checkInQrData = registration.checkInCode ? `gatherup://check-in/${registration.checkInCode}` : "";

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">订单</p>
          <h1>{registration.orderNumber}</h1>
          <p className="subtle">
            {event.name} · {event.city} · {event.startsAt}
          </p>
        </div>
        <StatusBadge>{registration.paymentStatus}</StatusBadge>
      </section>

      <section className="order-detail-layout">
        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>当前状态</h2>
              <p className="subtle">
                {isConfirmed
                  ? "付款已确认，订单已成为正式参与凭证。"
                  : "付款截图已进入审核，确认前不会开放选座，也不会生成入场凭证。"}
              </p>
            </div>
            <TicketCheck size={22} />
          </div>

          <div className="state-timeline">
            <span className="done">意向/报名</span>
            <span className="done">上传付款</span>
            <span className={isConfirmed ? "done" : "active"}>组织者确认</span>
            <span className={isConfirmed ? "active" : ""}>选座/签到</span>
          </div>

          <dl className="info-list">
            <div>
              <dt>报名状态</dt>
              <dd>{registration.registrationStatus}</dd>
            </div>
            <div>
              <dt>付款状态</dt>
              <dd>{registration.paymentStatus}</dd>
            </div>
            <div>
              <dt>选座状态</dt>
              <dd>{registration.seatStatus}</dd>
            </div>
            <div>
              <dt>预计确认</dt>
              <dd>{registration.confirmationEta}</dd>
            </div>
          </dl>
        </article>

        <aside className="action-card">
          <h2>订单凭证</h2>
          <dl className="summary-list">
            <div>
              <dt>订单号</dt>
              <dd>{registration.orderNumber}</dd>
            </div>
            <div>
              <dt>报名人</dt>
              <dd>{registration.nickname}</dd>
            </div>
            <div>
              <dt>人数</dt>
              <dd>{registration.quantity} 人</dd>
            </div>
            <div>
              <dt>金额</dt>
              <dd>¥{registration.amount}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{registration.createdAt}</dd>
            </div>
          </dl>
          <ParticipantOrderActions eventId={event.id} refundRequest={refundRequest} registration={registration} />
        </aside>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>电子票与群信息</h2>
              <p className="subtle">
                {isConfirmed
                  ? "订单已审核通过，以下信息可用于进群和现场核销。"
                  : "订单还在待审核状态，审核通过后才会显示微信群二维码和入场核销数据。"}
              </p>
            </div>
            <QrCode size={20} />
          </div>
          {isConfirmed ? (
            <dl className="info-list">
              <div>
                <dt>核销码</dt>
                <dd>{registration.checkInCode ?? "待生成"}</dd>
              </div>
              <div>
                <dt>二维码数据</dt>
                <dd>{checkInQrData || "待生成"}</dd>
              </div>
              <div>
                <dt>签到状态</dt>
                <dd>{registration.checkInStatus === "CHECKED_IN" ? "已签到" : "未到场"}</dd>
              </div>
              <div>
                <dt>微信群二维码</dt>
                <dd>
                  {event.wechatGroupImg ? <a href={event.wechatGroupImg}>{event.wechatGroupImg}</a> : "组织者暂未配置"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="notice-list">
              <div>
                <Clock3 size={16} />
                付款凭证已提交，组织者审核通过后会自动开放电子票。
              </div>
              <div>
                <AlertCircle size={16} />
                当前不会暴露微信群二维码，避免未确认订单提前进群。
              </div>
            </div>
          )}
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>参与人</h2>
            <UsersRound size={20} />
          </div>
          <div className="attendee-list">
            {registration.attendeeIds.map((attendeeId, index) => (
              <div className="inline-field readonly" key={attendeeId}>
                <span>{index === 0 ? "本人" : `同行人 ${index + 1}`}</span>
                <strong>{attendeeId}</strong>
              </div>
            ))}
          </div>
        </article>

        {isConfirmed && orderDetail.seatSelection && orderDetail.seatSelection.seats.length > 0 && (
          <OrderSeatSelectionPanel
            attendees={orderDetail.seatSelection.attendees}
            registrationId={orderDetail.seatSelection.registrationId}
            seats={orderDetail.seatSelection.seats}
          />
        )}

        {refundRequest && (
          <article className="content-card">
            <div className="section-heading">
              <h2>退款记录</h2>
              <AlertCircle size={20} />
            </div>
            <dl className="info-list">
              <div>
                <dt>退款状态</dt>
                <dd>{refundStatusLabel(refundRequest.status)}</dd>
              </div>
              <div>
                <dt>申请金额</dt>
                <dd>¥{refundRequest.requestedAmount}</dd>
              </div>
              <div>
                <dt>同意金额</dt>
                <dd>{refundRequest.approvedAmount === null ? "待审核" : `¥${refundRequest.approvedAmount}`}</dd>
              </div>
              <div>
                <dt>退款原因</dt>
                <dd>{refundRequest.reason}</dd>
              </div>
              <div>
                <dt>主办备注</dt>
                <dd>{refundRequest.reviewNote}</dd>
              </div>
              <div>
                <dt>退款凭证</dt>
                <dd>{refundRequest.proofPath ?? "待上传"}</dd>
              </div>
              <div>
                <dt>线下打款时间</dt>
                <dd>{refundRequest.paidAt ?? "待处理"}</dd>
              </div>
              <div>
                <dt>确认/争议时间</dt>
                <dd>{refundRequest.confirmedAt ?? refundRequest.disputedAt ?? "待确认"}</dd>
              </div>
            </dl>
          </article>
        )}
      </section>
    </>
  );
}
