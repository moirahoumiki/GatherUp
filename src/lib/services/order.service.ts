import { NextResponse } from "next/server";

import {
  asRecord,
  getNumber,
  getString,
  jsonError,
  normalizeJsonInput,
  normalizeReviewDecision,
  orderStatus,
  toPublicCheckInStatus,
  toPublicOrderStatus
} from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { type AuthenticatedSupabaseContext, getAuthenticatedUser, getSupabaseServiceClient } from "@/lib/supabase/server";

function contactTypeFromValue(value: string) {
  if (value.includes("@")) return "email";
  if (/^\+?\d[\d -]{6,}$/.test(value)) return "phone";
  return "wechat";
}

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/^payment-proofs\//, "");
}

function pathMatchesProof(path: string, eventId: string, registrationId: string, paymentId: string) {
  const parts = path.split("/");
  return parts.length >= 4 && parts[0] === eventId && parts[1] === registrationId && parts[2] === paymentId && Boolean(parts[3]);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function createOrderFromRequestBody(
  body: Record<string, unknown>,
  authContext: AuthenticatedSupabaseContext
) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const contactValue = getString(body, ["contact_value", "contactValue", "contact"]);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!contactValue) {
    return jsonError("缺少联系方式。");
  }

  try {
    const quantity = Math.max(1, getNumber(body, ["quantity"], 1));
    const formAnswers = normalizeJsonInput(body.form_answers ?? body.formAnswers);

    const { data, error } = await authContext.supabase.rpc("create_registration_atomic", {
      p_event_id: eventId,
      p_nickname: getString(body, ["nickname", "name"]) || authContext.user?.email || "GatherUp 用户",
      p_contact_type: getString(body, ["contact_type", "contactType"]) || contactTypeFromValue(contactValue),
      p_contact_value: contactValue,
      p_quantity: quantity,
      p_form_answers: formAnswers,
      p_participant_note: getString(body, ["participant_note", "participantNote"]) || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REGISTRATION_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        EVENT_NOT_FOUND: 404,
        REGISTRATION_CLOSED: 422,
        CAPACITY_EXCEEDED: 409,
        ALREADY_REGISTERED: 409,
        CONCURRENT_CONFLICT: 409,
        DUPLICATE_REGISTRATION: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "报名订单创建失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    const registrationId = typeof result.registration_id === "string" ? result.registration_id : "";
    const orderNumber = typeof result.order_number === "string" ? result.order_number : "";
    const status = typeof result.status === "string" ? result.status : "";
    const serviceClient = getSupabaseServiceClient();
    const { data: payment } = await serviceClient
      .from("payments")
      .select("id, amount_cents, status")
      .eq("registration_id", registrationId)
      .maybeSingle();

    await sendInstantEmailNotifications({
      eventId,
      templateKeys: ["registration_awaiting_payment", "registration_confirmed"]
    });

    return NextResponse.json({
      ok: true,
      order_id: registrationId,
      registration_id: registrationId,
      order_number: orderNumber,
      status: toPublicOrderStatus(status),
      payment_id: payment?.id ?? null,
      payment_status: payment?.status ?? result.payment_status ?? null,
      amount_due_cents: result.amount_due_cents,
      event_id: eventId,
      quantity: result.quantity,
      check_in_status: "NOT_ARRIVED"
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "报名接口暂时不可用。", 500);
  }
}

export async function submitPaymentProofFromRequestBody(body: Record<string, unknown>, request: Request) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再提交付款截图。", 401);
  }

  const registrationId = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const paymentId = getString(body, ["payment_id", "paymentId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));
  if (!registrationId) return jsonError("缺少 registration_id。");
  if (!paymentId) return jsonError("缺少 payment_id。");
  if (!storagePath) return jsonError("缺少付款截图存储路径。");

  try {
    const supabase = getSupabaseServiceClient();
    const { findUserByAuthUserId } = await import("@/lib/server/api");
    const appUser = await findUserByAuthUserId(supabase, authUser.id);
    if (!appUser) return jsonError("找不到当前登录用户。", 401);

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .select("id, event_id, order_number, status, amount_due_cents, user_id")
      .eq("id", registrationId)
      .single();
    if (registrationError || !registration?.id) return jsonError("找不到报名订单。", 404);
    if (registration.user_id !== appUser.id) return jsonError("只能为自己的订单提交付款截图。", 403);
    if (!["awaiting_payment", orderStatus.rejected, "partial_paid_needs_topup"].includes(registration.status)) {
      return jsonError("当前订单状态不允许提交付款截图。", 409);
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, registration_id, amount_cents")
      .eq("id", paymentId)
      .eq("registration_id", registration.id)
      .single();
    if (paymentError || !payment?.id) return jsonError("找不到订单对应的付款记录。", 404);
    if (!pathMatchesProof(storagePath, registration.event_id, registration.id, payment.id)) return jsonError("付款截图路径与订单不匹配。", 400);

    const { data: storedObject, error: storedObjectError } = await supabase
      .schema("storage")
      .from("objects")
      .select("id")
      .eq("bucket_id", "payment-proofs")
      .eq("name", storagePath)
      .maybeSingle();
    if (storedObjectError || !storedObject?.id) return jsonError("找不到已上传的付款截图文件。", 404);

    const amountReportedCents = Math.max(0, getNumber(body, ["amount_reported_cents", "amountReportedCents"], payment.amount_cents));
    const { error: proofError } = await supabase.from("payment_proofs").insert({
      payment_id: payment.id,
      registration_id: registration.id,
      file_url: storagePath,
      uploaded_by: appUser.id,
      amount_reported_cents: amountReportedCents
    });
    if (proofError) return jsonError(proofError.message, 500);

    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({ status: orderStatus.pending, payment_screenshot_img: storagePath })
      .eq("id", registration.id)
      .in("status", ["awaiting_payment", orderStatus.rejected, "partial_paid_needs_topup"])
      .select("id, order_number, status")
      .single();
    if (updateError || !updatedRegistration?.id) return jsonError(updateError?.message ?? "付款截图已保存，但订单状态更新失败。", 500);

    return NextResponse.json({ ok: true, order_id: updatedRegistration.id, order_number: updatedRegistration.order_number, status: "PENDING_REVIEW", storage_path: storagePath });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "付款截图提交接口暂时不可用。", 500);
  }
}

export async function reviewOrderPaymentFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const decision = normalizeReviewDecision(body.result ?? body.review_result ?? body.status ?? body.approved);
  if (!orderId) return jsonError("缺少 order_id。");
  if (decision !== "APPROVED" && decision !== "REJECTED") return jsonError("审核结果必须是 APPROVED 或 REJECTED。");

  try {
    const { data, error } = await authContext.supabase.rpc("review_payment_atomic", {
      p_registration_id: isUuid(orderId) ? orderId : null,
      p_order_number: isUuid(orderId) ? null : orderId,
      p_decision: decision,
      p_review_note: typeof body.review_note === "string" ? body.review_note : null
    });
    if (error) return jsonError(error.message, 500);

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
    return NextResponse.json({ ok: true, order_id: result.registration_id, order_number: result.order_number, status: typeof result.status === "string" ? toPublicOrderStatus(result.status) : undefined });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "订单审核接口暂时不可用。", 500);
  }
}

export async function verifyOrderFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const submittedCode = typeof body.check_in_code === "string" ? body.check_in_code.trim() : "";
  const submittedOrderNumber = typeof body.order_number === "string" ? body.order_number.trim() : "";
  let checkInCode = submittedCode.replace(/^gatherup:\/\/check-in\//i, "");

  if (submittedOrderNumber) {
    const { data: order, error: orderLookupError } = await authContext.supabase
      .from("registrations")
      .select("check_in_code")
      .eq("order_number", submittedOrderNumber)
      .maybeSingle();
    if (orderLookupError) return jsonError(orderLookupError.message, 500);
    if (typeof order?.check_in_code === "string" && order.check_in_code.trim()) {
      checkInCode = order.check_in_code.trim();
    }
  }
  if (!checkInCode) return jsonError("缺少 check_in_code。");

  try {
    const { data, error } = await authContext.supabase.rpc("check_in_order_atomic", { p_check_in_code: checkInCode, p_note: typeof body.note === "string" ? body.note : null });
    if (error) return jsonError(error.message, 500);
    const result = asRecord(data);
    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "CHECK_IN_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        MISSING_CHECK_IN_CODE: 400,
        CHECK_IN_CODE_NOT_FOUND: 404,
        ORDER_NOT_CONFIRMED: 409,
        ALREADY_CHECKED_IN: 409,
        INVALID_CHECK_IN_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };
      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "核销失败，请刷新后重试。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      order_id: result.registration_id,
      order_number: result.order_number,
      attendee_count: typeof result.attendee_count === "number" ? result.attendee_count : undefined,
      status: typeof result.status === "string" ? toPublicOrderStatus(result.status) : undefined,
      check_in_status: typeof result.check_in_status === "string" ? toPublicCheckInStatus(result.check_in_status) : undefined
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "核销接口暂时不可用。", 500);
  }
}

export async function lockSeatFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const registrationId = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const seatId = getString(body, ["seat_id", "seatId"]);
  if (!registrationId) return jsonError("缺少 registration_id。");
  if (!seatId) return jsonError("缺少 seat_id。");

  try {
    const { data, error } = await authContext.supabase.rpc("create_seat_lock_atomic", { p_registration_id: registrationId, p_seat_id: seatId });
    if (error) return jsonError(error.message, 500);
    const result = asRecord(data);
    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "SEAT_LOCK_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REGISTRATION_NOT_FOUND: 404,
        SEAT_NOT_FOUND: 404,
        REGISTRATION_NOT_CONFIRMED: 409,
        PAYMENT_NOT_CONFIRMED: 409,
        SEAT_SELECTION_UNAVAILABLE: 422,
        SEAT_SELECTION_CLOSED: 422,
        SEAT_UNAVAILABLE: 409,
        SEAT_ALREADY_ASSIGNED: 409,
        SEAT_CONFLICT: 409,
        CONCURRENT_CONFLICT: 409
      };
      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "座位锁定失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }
    return NextResponse.json({ ok: true, seat_lock_id: result.seat_lock_id, seat_id: result.seat_id, seat_label: result.seat_label, expires_at: result.expires_at });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "座位锁定接口暂时不可用。", 500);
  }
}

export async function confirmSeatFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const seatLockId = getString(body, ["seat_lock_id", "seatLockId"]);
  const attendeeId = getString(body, ["attendee_id", "attendeeId"]);
  if (!seatLockId) return jsonError("缺少 seat_lock_id。");
  if (!attendeeId) return jsonError("缺少 attendee_id。");

  try {
    const { data, error } = await authContext.supabase.rpc("confirm_seat_assignment_atomic", { p_seat_lock_id: seatLockId, p_attendee_id: attendeeId });
    if (error) return jsonError(error.message, 500);
    const result = asRecord(data);
    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "SEAT_CONFIRM_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        LOCK_NOT_FOUND: 404,
        ATTENDEE_NOT_FOUND: 404,
        LOCK_EXPIRED: 409,
        SEAT_ASSIGNMENT_CONFLICT: 409,
        CONCURRENT_CONFLICT: 409
      };
      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "座位确认失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }
    return NextResponse.json({ ok: true, seat_assignment_id: result.seat_assignment_id, seat_id: result.seat_id, seat_label: result.seat_label });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "座位确认接口暂时不可用。", 500);
  }
}