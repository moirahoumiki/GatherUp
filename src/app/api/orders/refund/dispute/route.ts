import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:refund-dispute",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再处理退款争议。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const resolution = getString(body, ["resolution", "result", "status"]).toUpperCase();
  const note = getString(body, ["note", "organizer_note", "organizerNote"]);

  if (!refundRequestId) {
    return jsonError("缺少 refund_request_id。");
  }

  if (!["CONFIRM_REFUNDED", "REOPEN_PROOF"].includes(resolution)) {
    return jsonError("退款争议处理结果必须是 CONFIRM_REFUNDED 或 REOPEN_PROOF。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("resolve_refund_dispute_atomic", {
      p_refund_request_id: refundRequestId,
      p_resolution: resolution,
      p_note: note || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_DISPUTE_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REFUND_REQUEST_NOT_FOUND: 404,
        INVALID_RESOLUTION: 400,
        INVALID_REFUND_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款争议处理失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    await sendInstantEmailNotifications({ templateKeys: ["refund_confirmed", "refund_proof_uploaded"] });

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number,
      status: result.status,
      registration_status: result.registration_status,
      payment_status: result.payment_status
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款争议处理接口暂时不可用。", 500);
  }
}
