import { NextResponse } from "next/server";

import {
  asRecord,
  jsonError,
  normalizeReviewDecision,
  toPublicOrderStatus
} from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:review",
    limit: 60,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再审核付款。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const decision = normalizeReviewDecision(body.result ?? body.review_result ?? body.status ?? body.approved);

  if (!orderId) {
    return jsonError("缺少 order_id。");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return jsonError("审核结果必须是 APPROVED 或 REJECTED。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("review_payment_atomic", {
      p_registration_id: isUuid(orderId) ? orderId : null,
      p_order_number: isUuid(orderId) ? null : orderId,
      p_decision: decision,
      p_review_note: typeof body.review_note === "string" ? body.review_note : null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "PAYMENT_REVIEW_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        ORDER_NOT_FOUND: 404,
        INVALID_DECISION: 400,
        INVALID_ORDER_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "订单审核更新失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    await sendInstantEmailNotifications({ templateKeys: ["registration_confirmed", "payment_rejected"] });

    return NextResponse.json({
      ok: true,
      order_id: result.registration_id,
      order_number: result.order_number,
      status: typeof result.status === "string" ? toPublicOrderStatus(result.status) : undefined
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "订单审核接口暂时不可用。", 500);
  }
}
