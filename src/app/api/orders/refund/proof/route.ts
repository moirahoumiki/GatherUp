import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/^refund-proofs\//, "");
}

function pathMatchesRefundProof(path: string, eventId: string, refundRequestId: string) {
  const parts = path.split("/");

  return parts.length >= 3 && parts[0] === eventId && parts[1] === refundRequestId && Boolean(parts[2]);
}

function getRelationRecord(value: unknown) {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:refund-proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再上传退款凭证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));

  if (!refundRequestId) {
    return jsonError("缺少 refund_request_id。");
  }

  if (!storagePath) {
    return jsonError("缺少退款凭证存储路径。");
  }

  try {
    const { data: refundRequest, error: refundRequestError } = await authContext.supabase
      .from("refund_requests")
      .select("id, registrations!inner(event_id, order_number)")
      .eq("id", refundRequestId)
      .single();

    if (refundRequestError || !refundRequest?.id) {
      return jsonError("找不到可处理的退款申请。", 404);
    }

    const registration = getRelationRecord(asRecord(refundRequest).registrations);
    const eventId = getString(registration, ["event_id"]);
    const orderNumber = getString(registration, ["order_number"]);

    if (!eventId || !pathMatchesRefundProof(storagePath, eventId, refundRequest.id)) {
      return jsonError("退款凭证路径与退款申请不匹配。", 400);
    }

    const { data: storedObject, error: storedObjectError } = await authContext.supabase
      .schema("storage")
      .from("objects")
      .select("id")
      .eq("bucket_id", "refund-proofs")
      .eq("name", storagePath)
      .maybeSingle();

    if (storedObjectError || !storedObject?.id) {
      return jsonError("找不到已上传的退款凭证文件。", 404);
    }

    const amountCents = getNumber(body, ["amount_cents", "amountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("record_refund_proof_atomic", {
      p_refund_request_id: refundRequestId,
      p_file_url: storagePath,
      p_amount_cents: amountCents > 0 ? amountCents : null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_PROOF_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REFUND_REQUEST_NOT_FOUND: 404,
        MISSING_FILE: 400,
        INVALID_REFUND_STATUS: 409,
        INVALID_AMOUNT: 400,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款凭证提交失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    await sendInstantEmailNotifications({ eventId, templateKeys: ["refund_proof_uploaded"] });

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number ?? orderNumber,
      status: result.status,
      amount_cents: result.amount_cents,
      storage_path: result.file_url
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款凭证接口暂时不可用。", 500);
  }
}
