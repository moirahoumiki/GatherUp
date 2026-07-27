import { NextResponse } from "next/server";

import { asRecord, getString, jsonError, normalizeJsonInput, toPublicOrderStatus } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  getAuthenticatedSupabaseClient,
  getSupabaseServiceClient
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function contactTypeFromValue(value: string) {
  if (value.includes("@")) return "email";
  if (/^\+?\d[\d -]{6,}$/.test(value)) return "phone";
  return "wechat";
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "waitlist:convert",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再接受候补邀请。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const waitlistEntryId = getString(body, ["waitlist_entry_id", "waitlistEntryId", "id"]);
  const contactValue = getString(body, ["contact_value", "contactValue", "contact"]);

  if (!waitlistEntryId) {
    return jsonError("缺少 waitlist_entry_id。");
  }

  if (!contactValue) {
    return jsonError("缺少联系方式。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("convert_waitlist_entry_atomic", {
      p_waitlist_entry_id: waitlistEntryId,
      p_nickname: getString(body, ["nickname", "name"]) || authContext.user.email || "GatherUp 用户",
      p_contact_type: getString(body, ["contact_type", "contactType"]) || contactTypeFromValue(contactValue),
      p_contact_value: contactValue,
      p_form_answers: normalizeJsonInput(body.form_answers ?? body.formAnswers),
      p_participant_note: getString(body, ["participant_note", "participantNote"]) || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "WAITLIST_CONVERT_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        WAITLIST_ENTRY_NOT_FOUND: 404,
        MISSING_CONTACT: 400,
        INVALID_WAITLIST_STATUS: 409,
        WAITLIST_INVITATION_EXPIRED: 409,
        REGISTRATION_CLOSED: 422,
        ALREADY_REGISTERED: 409,
        CAPACITY_EXCEEDED: 409,
        CONCURRENT_CONFLICT: 409,
        DUPLICATE_REGISTRATION: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "候补转正失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    const registrationId = typeof result.registration_id === "string" ? result.registration_id : "";
    const serviceClient = getSupabaseServiceClient();
    const { data: payment } = await serviceClient
      .from("payments")
      .select("id, amount_cents, status")
      .eq("registration_id", registrationId)
      .maybeSingle();

    await sendInstantEmailNotifications({ templateKeys: ["waitlist_converted"] });

    return NextResponse.json({
      ok: true,
      waitlist_entry_id: result.waitlist_entry_id,
      order_id: registrationId,
      registration_id: registrationId,
      order_number: result.order_number,
      status: toPublicOrderStatus(String(result.status ?? "")),
      payment_id: payment?.id ?? null,
      payment_status: payment?.status ?? result.payment_status ?? null,
      amount_due_cents: result.amount_due_cents,
      quantity: result.quantity
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "候补转正接口暂时不可用。", 500);
  }
}
