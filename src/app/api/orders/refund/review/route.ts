import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError, normalizeReviewDecision } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:refund-review",
    limit: 60,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再审核退款。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const decision = normalizeReviewDecision(body.result ?? body.review_result ?? body.status ?? body.approved);

  if (!refundRequestId) {
    return jsonError("缺少 refund_request_id。");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return jsonError("审核结果必须是 APPROVED 或 REJECTED。");
  }

  try {
    const approvedAmountCents = getNumber(body, ["approved_amount_cents", "approvedAmountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("review_refund_request_atomic", {
      p_refund_request_id: refundRequestId,
      p_decision: decision,
      p_approved_amount_cents: approvedAmountCents > 0 ? approvedAmountCents : null,
      p_organizer_note: getString(body, ["organizer_note", "organizerNote", "review_note", "reviewNote"]) || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_REVIEW_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REFUND_REQUEST_NOT_FOUND: 404,
        REFUND_PAYMENT_NOT_FOUND: 409,
        INVALID_DECISION: 400,
        INVALID_REFUND_STATUS: 409,
        INVALID_AMOUNT: 400,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款审核失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    await sendInstantEmailNotifications({ templateKeys: ["refund_approved", "refund_rejected"] });

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number,
      status: result.status,
      approved_amount_cents: result.approved_amount_cents
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款审核接口暂时不可用。", 500);
  }
}
