import { NextResponse } from "next/server";

import {
  asRecord,
  getNumber,
  getString,
  jsonError,
  normalizeJsonInput,
  toPublicOrderStatus
} from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  getAuthenticatedSupabaseClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function contactTypeFromValue(value: string) {
  if (value.includes("@")) return "email";
  if (/^\+?\d[\d -]{6,}$/.test(value)) return "phone";
  return "wechat";
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:create",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const contactValue = getString(body, ["contact_value", "contactValue", "contact"]);
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再创建真实报名订单。", 401);
  }

  if (!contactValue) {
    return jsonError("缺少联系方式。");
  }

  try {
    const quantity = Math.max(1, getNumber(body, ["quantity"], 1));
    const formAnswers = normalizeJsonInput(body.form_answers ?? body.formAnswers);

    const { data, error } = await authContext.supabase.rpc("create_registration_atomic", {
      p_event_id: eventId,
      p_nickname: getString(body, ["nickname", "name"]) || authContext.user.email || "GatherUp 用户",
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
