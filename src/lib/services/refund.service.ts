import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError, normalizeReviewDecision } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { type AuthenticatedSupabaseContext } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function requestRefundFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const registrationInput = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const explicitOrderNumber = getString(body, ["order_number", "orderNumber"]);
  const orderNumber = explicitOrderNumber || (registrationInput && !UUID_PATTERN.test(registrationInput) ? registrationInput : "");
  const reason = getString(body, ["reason", "refund_reason", "refundReason"]);

  if (!registrationInput && !orderNumber) return jsonError("缺少 registration_id。");
  if (!reason) return jsonError("缺少退款原因。");

  try {
    let registrationId = UUID_PATTERN.test(registrationInput) ? registrationInput : "";

    if (orderNumber && !registrationId) {
      const { data: registration, error: registrationError } = await authContext.supabase
        .from("registrations")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (registrationError) return jsonError(registrationError.message, 500);
      registrationId = typeof registration?.id === "string" ? registration.id : "";
    }

    if (!registrationId) return jsonError("找不到可申请退款的订单。", 404);

    const requestedAmountCents = getNumber(body, ["requested_amount_cents", "requestedAmountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("request_refund_atomic", {
      p_registration_id: registrationId,
      p_requested_amount_cents: requestedAmountCents > 0 ? requestedAmountCents : null,
      p_reason: reason
    });

    if (error) return jsonError(error.message, 500);
    const result = asRecord(data);
    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_REQUEST_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REGISTRATION_NOT_FOUND: 404,
        MISSING_REASON: 400,
        REFUND_UNAVAILABLE: 409,
        FREE_ORDER: 422,
        NO_CONFIRMED_PAYMENT: 409,
        REFUND_ALREADY_OPEN: 409,
        INVALID_AMOUNT: 400,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款申请失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number,
      requested_amount_cents: result.requested_amount_cents,
      status: result.status
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款申请接口暂时不可用。", 500);
  }
}

export async function reviewRefundFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const decision = normalizeReviewDecision(body.result ?? body.review_result ?? body.status ?? body.approved);
  if (!refundRequestId) return jsonError("缺少 refund_request_id。");
  if (decision !== "APPROVED" && decision !== "REJECTED") return jsonError("审核结果必须是 APPROVED 或 REJECTED。");

  try {
    const approvedAmountCents = getNumber(body, ["approved_amount_cents", "approvedAmountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("review_refund_request_atomic", {
      p_refund_request_id: refundRequestId,
      p_decision: decision,
      p_approved_amount_cents: approvedAmountCents > 0 ? approvedAmountCents : null,
      p_organizer_note: getString(body, ["organizer_note", "organizerNote", "review_note", "reviewNote"]) || null
    });

    if (error) return jsonError(error.message, 500);
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

export async function uploadRefundProofFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));
  if (!refundRequestId) return jsonError("缺少 refund_request_id。");
  if (!storagePath) return jsonError("缺少退款凭证存储路径。");

  try {
    const { data: refundRequest, error: refundRequestError } = await authContext.supabase
      .from("refund_requests")
      .select("id, registrations!inner(event_id, order_number)")
      .eq("id", refundRequestId)
      .single();

    if (refundRequestError || !refundRequest?.id) return jsonError("找不到可处理的退款申请。", 404);
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

    if (storedObjectError || !storedObject?.id) return jsonError("找不到已上传的退款凭证文件。", 404);

    const amountCents = getNumber(body, ["amount_cents", "amountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("record_refund_proof_atomic", {
      p_refund_request_id: refundRequestId,
      p_file_url: storagePath,
      p_amount_cents: amountCents > 0 ? amountCents : null
    });

    if (error) return jsonError(error.message, 500);
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

export async function resolveRefundDisputeFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const resolution = getString(body, ["resolution", "result", "status"]).toUpperCase();
  const note = getString(body, ["note", "organizer_note", "organizerNote"]);
  if (!refundRequestId) return jsonError("缺少 refund_request_id。");
  if (!["CONFIRM_REFUNDED", "REOPEN_PROOF"].includes(resolution)) {
    return jsonError("退款争议处理结果必须是 CONFIRM_REFUNDED 或 REOPEN_PROOF。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("resolve_refund_dispute_atomic", {
      p_refund_request_id: refundRequestId,
      p_resolution: resolution,
      p_note: note || null
    });

    if (error) return jsonError(error.message, 500);
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

export async function confirmRefundReceiptFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const decision = getString(body, ["decision", "result", "status"]).toUpperCase();
  const note = getString(body, ["note", "reason", "dispute_reason", "disputeReason"]);
  if (!refundRequestId) return jsonError("缺少 refund_request_id。");
  if (!["CONFIRMED", "DISPUTED"].includes(decision)) return jsonError("退款确认结果必须是 CONFIRMED 或 DISPUTED。");

  try {
    const { data, error } = await authContext.supabase.rpc("confirm_refund_receipt_atomic", {
      p_refund_request_id: refundRequestId,
      p_decision: decision,
      p_note: note || null
    });

    if (error) return jsonError(error.message, 500);
    const result = asRecord(data);
    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_CONFIRM_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REFUND_REQUEST_NOT_FOUND: 404,
        INVALID_DECISION: 400,
        INVALID_REFUND_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };
      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款确认失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

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
    return jsonError(error instanceof Error ? error.message : "退款确认接口暂时不可用。", 500);
  }
}