export type InstantEmailTemplateKey =
  | "waitlist_invited"
  | "waitlist_converted"
  | "registration_awaiting_payment"
  | "registration_confirmed"
  | "payment_rejected"
  | "refund_approved"
  | "refund_rejected"
  | "refund_proof_uploaded"
  | "refund_confirmed"
  | "event_updated";

export type InstantEmailContext = {
  eventName?: string;
  eventStartsAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type InstantEmailContent = {
  subject: string;
  body: string;
};

export const INSTANT_EMAIL_TEMPLATE_KEYS: readonly InstantEmailTemplateKey[] = [
  "waitlist_invited",
  "waitlist_converted",
  "registration_awaiting_payment",
  "registration_confirmed",
  "payment_rejected",
  "refund_approved",
  "refund_rejected",
  "refund_proof_uploaded",
  "refund_confirmed",
  "event_updated"
];

const EMAIL_SIGNATURE = "—— GatherUp 通知（本邮件由系统自动发送，请勿直接回复）";

const eventFieldLabels: Record<string, string> = {
  starts_at: "活动时间",
  registration_deadline: "报名截止",
  venue_name: "场地",
  address: "地址",
  city: "城市",
  capacity: "人数上限"
};

export function isInstantEmailTemplateKey(value: string): value is InstantEmailTemplateKey {
  return (INSTANT_EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function formatEventDateTime(isoValue: string | null | undefined) {
  if (!isoValue) {
    return "时间待定";
  }

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "时间待定";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : "";
}

function describeChangedFields(changedFieldsValue: string) {
  const labels = changedFieldsValue
    .split(",")
    .map((field) => eventFieldLabels[field.trim()] ?? "")
    .filter(Boolean);

  return labels.length > 0 ? labels.join("、") : "关键信息";
}

function composeBody(lines: readonly string[]) {
  return ["你好，", "", ...lines, "", EMAIL_SIGNATURE].join("\n");
}

export function buildInstantEmailContent(
  templateKey: string,
  context: InstantEmailContext
): InstantEmailContent | null {
  if (!isInstantEmailTemplateKey(templateKey)) {
    return null;
  }

  const metadata = context.metadata ?? {};
  const eventName = context.eventName?.trim() || "GatherUp 活动";
  const eventTime = formatEventDateTime(context.eventStartsAt);
  const orderNumber = metadataString(metadata, "orderNumber");
  const orderLine = orderNumber ? `订单编号：${orderNumber}` : "";

  switch (templateKey) {
    case "waitlist_invited": {
      const expiresAt = formatEventDateTime(metadataString(metadata, "invitationExpiresAt"));
      return {
        subject: `【GatherUp】候补名额已释放：${eventName}`,
        body: composeBody([
          `你在「${eventName}」的候补排队有名额释放。`,
          `活动时间：${eventTime}`,
          `确认截止：${expiresAt}`,
          "下一步：请尽快登录 GatherUp「我的活动」确认候补转正，逾期邀请将自动失效。"
        ])
      };
    }
    case "waitlist_converted":
      return {
        subject: `【GatherUp】候补转正成功：${eventName}`,
        body: composeBody(
          [
            `你在「${eventName}」的候补名额已成功转正。`,
            `活动时间：${eventTime}`,
            orderLine,
            "下一步：请前往「我的活动」查看订单，按提示完成付款或查看电子票。"
          ].filter(Boolean)
        )
      };
    case "registration_awaiting_payment":
      return {
        subject: `【GatherUp】报名已创建，待付款：${eventName}`,
        body: composeBody(
          [
            `你已成功报名「${eventName}」，订单等待付款。`,
            `活动时间：${eventTime}`,
            orderLine,
            "下一步：请在订单页上传付款凭证，等待组织者确认。"
          ].filter(Boolean)
        )
      };
    case "registration_confirmed":
      return {
        subject: `【GatherUp】报名确认成功：${eventName}`,
        body: composeBody(
          [
            `你在「${eventName}」的报名已确认。`,
            `活动时间：${eventTime}`,
            orderLine,
            "下一步：活动当天在订单页出示核销码完成签到。"
          ].filter(Boolean)
        )
      };
    case "payment_rejected":
      return {
        subject: `【GatherUp】付款凭证被驳回：${eventName}`,
        body: composeBody(
          [
            `你为「${eventName}」提交的付款凭证未通过审核。`,
            `活动时间：${eventTime}`,
            orderLine,
            "下一步：请尽快在订单页重新上传付款凭证，逾期订单可能被取消。"
          ].filter(Boolean)
        )
      };
    case "refund_approved":
      return {
        subject: `【GatherUp】退款申请已通过：${eventName}`,
        body: composeBody(
          [
            `你在「${eventName}」的退款申请已通过审核。`,
            orderLine,
            "下一步：组织者将安排退款转账，收到退款后请在订单页确认到账。"
          ].filter(Boolean)
        )
      };
    case "refund_rejected":
      return {
        subject: `【GatherUp】退款申请被拒绝：${eventName}`,
        body: composeBody(
          [
            `你在「${eventName}」的退款申请未通过审核。`,
            orderLine,
            "下一步：请在订单页查看组织者备注，如有疑问可联系组织者协商。"
          ].filter(Boolean)
        )
      };
    case "refund_proof_uploaded":
      return {
        subject: `【GatherUp】退款转账凭证已更新：${eventName}`,
        body: composeBody(
          [
            `「${eventName}」的退款转账凭证已更新。`,
            orderLine,
            "下一步：请核对退款到账情况，确认无误后在订单页确认收款。"
          ].filter(Boolean)
        )
      };
    case "refund_confirmed":
      return {
        subject: `【GatherUp】退款流程已完成：${eventName}`,
        body: composeBody(
          [
            `「${eventName}」的退款流程已完成确认。`,
            orderLine,
            "下一步：无需其他操作，可在订单页查看退款记录。"
          ].filter(Boolean)
        )
      };
    case "event_updated": {
      const changedFields = describeChangedFields(metadataString(metadata, "changedFields"));
      const venueName = metadataString(metadata, "venueName");
      return {
        subject: `【GatherUp】活动信息有重要变更：${eventName}`,
        body: composeBody(
          [
            `你报名的「${eventName}」有重要信息变更（${changedFields}）。`,
            `最新活动时间：${eventTime}`,
            venueName ? `最新场地：${venueName}` : "",
            "下一步：请前往活动页确认最新安排；如无法参加，可在订单页申请退出或退款。"
          ].filter(Boolean)
        )
      };
    }
    default:
      return null;
  }
}
