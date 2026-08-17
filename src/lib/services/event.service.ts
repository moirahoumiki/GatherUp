import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError, normalizeJsonInput } from "@/lib/server/api";
import { notifyEventParticipantsOfImportantChange } from "@/lib/server/instant-email";
import { type AuthenticatedSupabaseContext } from "@/lib/supabase/server";

const categoryMap: Record<string, string> = {
  同好活动: "community",
  校园活动: "campus",
  会议会务: "conference",
  好友聚会: "private",
  工作坊: "workshop",
  "快闪/市集": "market"
};

const templateMap: Record<string, string> = {
  基础报名: "basic_registration",
  报名收款: "payment_registration",
  选座活动: "seating",
  签到活动: "checkin",
  分时预约: "time_slot",
  记录型聚会: "record_only"
};

const feeModeMap: Record<string, string> = {
  免费活动: "free",
  收费活动: "paid",
  AA记账: "split"
};

function toIsoDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapEnum(value: string, values: Record<string, string>, fallback: string) {
  return values[value] ?? (value || fallback);
}

function hasValueChanged(current: unknown, next: unknown) {
  return String(current ?? "") !== String(next ?? "");
}

function hasTimestampChanged(current: unknown, nextIso: string) {
  if (typeof current !== "string" || !nextIso) {
    return hasValueChanged(current, nextIso);
  }

  const currentTime = new Date(current).getTime();
  const nextTime = new Date(nextIso).getTime();
  return !Number.isFinite(currentTime) || !Number.isFinite(nextTime) || currentTime !== nextTime;
}

const reviewSensitiveStatuses = new Set([
  "registration_open",
  "registration_closed",
  "payment_reviewing",
  "seat_selection_scheduled",
  "seat_selection_open",
  "ready"
]);

const paidEventVerificationStatuses = ["light_verified", "enhanced_verified"];

const organizerRoleMap = {
  联合主办: "cohost",
  财务: "finance",
  现场协作: "staff",
  只读: "viewer",
  cohost: "cohost",
  finance: "finance",
  staff: "staff",
  viewer: "viewer"
} as const;

function normalizeOrganizerRole(value: string) {
  return organizerRoleMap[value as keyof typeof organizerRoleMap] ?? "cohost";
}

function organizerStatusForErrorCode(code: unknown) {
  const statusMap: Record<string, number> = {
    COLLABORATOR_NOT_FOUND: 404,
    CONCURRENT_CONFLICT: 409,
    DUPLICATE_COLLABORATOR: 409,
    EVENT_NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_ACTION: 400,
    MISSING_INPUT: 400,
    OWNER_PROTECTED: 409,
    OWNER_ROLE_FORBIDDEN: 400,
    UNAUTHORIZED: 401,
    USER_NOT_FOUND: 404
  };

  return typeof code === "string" ? statusMap[code] ?? 500 : 500;
}

function organizerRespondStatusForErrorCode(code: unknown) {
  const statusMap: Record<string, number> = {
    CONCURRENT_CONFLICT: 409,
    INTERNAL_ERROR: 500,
    INVALID_INVITATION_STATUS: 409,
    INVALID_RESPONSE: 400,
    INVITATION_NOT_FOUND: 404,
    UNAUTHORIZED: 401
  };

  return typeof code === "string" ? statusMap[code] ?? 500 : 500;
}

export async function createEventFromRequestBody(
  body: Record<string, unknown>,
  authContext: AuthenticatedSupabaseContext
) {
  const eventInput = asRecord(body.event ?? body);
  const setupInput = asRecord(body.setup);
  const rulesInput = asRecord(body.rules);
  const publicCode = getString(eventInput, ["publicCode", "public_code"]).toUpperCase();

  if (!publicCode.startsWith("GU-")) {
    return jsonError("活动公开 ID 必须以 GU- 开头。");
  }

  try {
    const price = getNumber(rulesInput, ["price"], getNumber(eventInput, ["price"], 0));
    const allowMulti = rulesInput.allowMulti === true || rulesInput.allowMulti === "允许";
    const paymentCodeImg =
      getString(body, ["payment_code_img", "paymentCodeImg"]) ||
      getString(setupInput, ["payment_code_img", "paymentCodeImg", "paymentCodeUrl"]);
    const wechatGroupImg =
      getString(body, ["wechat_group_img", "wechatGroupImg"]) ||
      getString(setupInput, ["wechat_group_img", "wechatGroupImg"]);
    const customFormConfig = normalizeJsonInput(
      body.custom_form_config ?? body.customFormConfig ?? eventInput.custom_form_config ?? eventInput.customFormConfig
    );
    const { data, error } = await authContext.supabase.rpc("create_event_atomic", {
      p_public_code: publicCode,
      p_name: getString(eventInput, ["name"]) || "未命名活动",
      p_category: mapEnum(getString(eventInput, ["category"]), categoryMap, "community"),
      p_template: mapEnum(getString(eventInput, ["template"]), templateMap, "basic_registration"),
      p_custom_type_label: getString(eventInput, ["customTypeLabel", "custom_type_label"]) || null,
      p_city: getString(eventInput, ["city"]) || "待确认",
      p_venue_name: getString(eventInput, ["venue", "venueName", "venue_name"]) || "待确认",
      p_address: getString(eventInput, ["address"]) || null,
      p_starts_at: toIsoDateTime(getString(eventInput, ["startsAt", "starts_at"])),
      p_registration_deadline: toIsoDateTime(getString(eventInput, ["deadline", "registration_deadline"])),
      p_capacity: Math.max(1, getNumber(rulesInput, ["capacity"], getNumber(eventInput, ["capacity"], 1))),
      p_price_cents: Math.max(0, Math.round(price * 100)),
      p_description: getString(eventInput, ["description"]) || null,
      p_payment_instructions: getString(setupInput, ["paymentNote", "payment_note", "payment_instructions"]) || null,
      p_custom_form_config: customFormConfig,
      p_payment_code_img: paymentCodeImg || null,
      p_wechat_group_img: wechatGroupImg || null,
      p_allow_multi_person_registration: allowMulti,
      p_max_people_per_registration: allowMulti ? Math.max(2, getNumber(rulesInput, ["maxPeoplePerOrder"], 4)) : 1,
      p_order_number_prefix:
        getString(rulesInput, ["orderPrefix", "order_number_prefix"]) || publicCode.replace(/^GU-/, "").slice(0, 8),
      p_fee_mode: mapEnum(getString(rulesInput, ["feeMode"]), feeModeMap, price > 0 ? "paid" : "free"),
      p_settlement_rule: getString(rulesInput, ["settlementRule", "settlement_rule"]) || null,
      p_payment_method: getString(setupInput, ["paymentMethod", "payment_method"]) || "wechat"
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "EVENT_CREATE_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        PROFILE_NOT_FOUND: 404,
        INVALID_PUBLIC_CODE: 400,
        INVALID_EVENT_NAME: 400,
        INVALID_EVENT_LIMITS: 400,
        INVALID_MULTI_PERSON_LIMIT: 400,
        INVALID_EVENT_INPUT: 400,
        PUBLIC_CODE_CONFLICT: 409
      };

      return NextResponse.json(
        {
          ok: false,
          error_code: errorCode,
          message: typeof result.message === "string" ? result.message : "活动创建失败。"
        },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      event_id: result.event_id,
      public_code: result.public_code,
      custom_form_config: result.custom_form_config,
      payment_code_img: result.payment_code_img
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "活动创建接口暂时不可用。", 500);
  }
}

export async function updateEventFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const name = getString(body, ["name"]);
  const city = getString(body, ["city"]);
  const venueName = getString(body, ["venue_name", "venueName", "venue"]);
  const address = getString(body, ["address"]);
  const startsAt = toIsoDateTime(getString(body, ["starts_at", "startsAt"]));
  const registrationDeadline = toIsoDateTime(getString(body, ["registration_deadline", "registrationDeadline", "deadline"]));
  const description = getString(body, ["description"]);
  const capacity = Math.round(getNumber(body, ["capacity"], 0));

  if (!eventId) return jsonError("缺少 event_id。");
  if (!name || !city || !venueName || !startsAt || !registrationDeadline || capacity < 1) {
    return jsonError("请填写活动名称、城市、场地、活动时间、报名截止和有效人数上限。");
  }

  const { canEditEvent, findUserByAuthUserId } = await import("@/lib/server/api");
  const canEdit = await canEditEvent(authContext.supabase, eventId);
  if (!canEdit) return jsonError("只有活动主办或具备编辑权限的协作者可以编辑活动。", 403);

  const { data: currentEvent, error: currentEventError } = await authContext.supabase
    .from("events")
    .select("id, public_code, name, city, venue_name, address, starts_at, registration_deadline, capacity, description, status, review_status")
    .eq("id", eventId)
    .single();
  if (currentEventError || !currentEvent?.id) return jsonError("找不到可编辑的活动。", 404);

  const { count, error: countError } = await authContext.supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("status", "in", "(cancelled,expired,refunded)");
  if (countError) return jsonError(countError.message, 500);
  const activeRegistrationCount = count ?? 0;
  if (capacity < activeRegistrationCount) return jsonError(`人数上限不能小于当前有效报名数 ${activeRegistrationCount}。`, 409);

  const reviewSensitiveChanges = [
    hasValueChanged(currentEvent.city, city) ? "city" : "",
    hasValueChanged(currentEvent.venue_name, venueName) ? "venue_name" : "",
    hasValueChanged(currentEvent.address, address || null) ? "address" : "",
    hasTimestampChanged(currentEvent.starts_at, startsAt) ? "starts_at" : "",
    hasTimestampChanged(currentEvent.registration_deadline, registrationDeadline) ? "registration_deadline" : "",
    Number(currentEvent.capacity) !== capacity ? "capacity" : ""
  ].filter(Boolean);
  const requiresReview = reviewSensitiveStatuses.has(String(currentEvent.status)) && reviewSensitiveChanges.length > 0;
  const appUser = requiresReview ? await findUserByAuthUserId(authContext.supabase, authContext.user.id) : null;
  const requesterId = appUser?.id ?? "";
  if (requiresReview && !requesterId) return jsonError("找不到当前用户资料，无法创建平台复审请求。", 500);

  const { data: updatedEvent, error } = await authContext.supabase
    .from("events")
    .update({
      name,
      city,
      venue_name: venueName,
      address: address || null,
      starts_at: startsAt,
      registration_deadline: registrationDeadline,
      capacity,
      description: description || null,
      review_status: requiresReview ? "pending" : currentEvent.review_status,
      updated_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .select("id, name, city, venue_name, address, starts_at, registration_deadline, capacity, description")
    .single();
  if (error || !updatedEvent?.id) return jsonError(error?.message ?? "活动编辑失败。", 500);

  if (requiresReview) {
    const { error: reviewError } = await authContext.supabase.from("review_requests").insert({
      target_type: "event",
      target_id: updatedEvent.id,
      event_id: updatedEvent.id,
      requester_id: requesterId,
      status: "pending",
      reason: `Sensitive post-publish fields changed: ${reviewSensitiveChanges.join(", ")}`,
      submitted_snapshot: {
        changed_fields: reviewSensitiveChanges,
        before: {
          city: currentEvent.city,
          venue_name: currentEvent.venue_name,
          address: currentEvent.address,
          starts_at: currentEvent.starts_at,
          registration_deadline: currentEvent.registration_deadline,
          capacity: currentEvent.capacity,
          review_status: currentEvent.review_status
        },
        after: { city, venue_name: venueName, address: address || null, starts_at: startsAt, registration_deadline: registrationDeadline, capacity, review_status: "pending" }
      }
    });
    if (reviewError) return jsonError(`活动已更新，但平台复审请求创建失败：${reviewError.message}`, 500);

    await notifyEventParticipantsOfImportantChange({
      eventId: updatedEvent.id,
      eventName: updatedEvent.name,
      startsAt: updatedEvent.starts_at ?? null,
      venueName: updatedEvent.venue_name ?? null,
      changedFields: reviewSensitiveChanges
    });
  }

  return NextResponse.json({ ok: true, event: updatedEvent, review_required: requiresReview, review_sensitive_changes: reviewSensitiveChanges });
}

export async function publishEventFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const eventId = getString(body, ["event_id", "eventId"]);
  if (!eventId) return jsonError("缺少 event_id。");

  const { canEditEvent } = await import("@/lib/server/api");
  const { getSupabaseServiceClient } = await import("@/lib/supabase/server");
  const canEdit = await canEditEvent(authContext.supabase, eventId);
  if (!canEdit) return jsonError("只有活动主办或具备编辑权限的协作者可以开放报名。", 403);

  const { data: event, error: eventError } = await authContext.supabase
    .from("events")
    .select("id, organizer_id, price_cents, payment_code_img, review_status")
    .eq("id", eventId)
    .single();
  if (eventError || !event?.id) return jsonError("找不到可开放报名的活动。", 404);

  const isPaidEvent = Number(event.price_cents ?? 0) > 0 || Boolean(event.payment_code_img);
  if (isPaidEvent) {
    const serviceSupabase = getSupabaseServiceClient();
    const { data: verification, error: verificationError } = await serviceSupabase
      .from("organizer_verifications")
      .select("status, force_review_required")
      .eq("user_id", event.organizer_id)
      .maybeSingle();
    if (verificationError || !verification || !paidEventVerificationStatuses.includes(String(verification.status)) || verification.force_review_required === true) {
      return jsonError("收费活动需要主办方完成认证，且当前账号未被要求重新审核。请先完成主办认证后再开放报名。", 403);
    }
  }

  if (["pending", "changes_requested", "rejected", "suspended"].includes(String(event.review_status))) {
    return jsonError("该活动仍在平台审核中或未通过审核，暂不能开放报名。", 403);
  }

  const { data: updatedEvent, error } = await authContext.supabase
    .from("events")
    .update({ status: "registration_open", updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .in("status", ["draft", "interest_collecting", "registration_scheduled"])
    .select("id, public_code, status")
    .single();
  if (error || !updatedEvent?.id) return jsonError(error?.message ?? "活动当前状态不允许开放报名。", 409);
  return NextResponse.json({ ok: true, event_id: updatedEvent.id, public_code: updatedEvent.public_code, status: updatedEvent.status });
}

export async function manageEventOrganizerFromRequestBody(
  body: Record<string, unknown>,
  authContext: AuthenticatedSupabaseContext,
  action: "add" | "remove" | "update",
  userAgent: string
) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const publicId = getString(body, ["public_id", "publicId", "gatherUpId"]).toUpperCase();
  const role = normalizeOrganizerRole(getString(body, ["role"]));
  const canManagePayments = body.can_manage_payments === true || body.canManagePayments === true;
  const permissions = role === "cohost" && canManagePayments ? { can_manage_payments: true } : {};
  if (!eventId || !publicId) return jsonError("缺少 event_id 或协作者 GatherUp ID。");

  const { data, error } = await authContext.supabase.rpc("manage_event_organizer_atomic", {
    p_action: action,
    p_event_id: eventId,
    p_permissions: permissions,
    p_public_id: publicId,
    p_reason: getString(body, ["reason"]) || null,
    p_role: role,
    p_user_agent: userAgent
  });
  if (error) return jsonError(error.message, 500);
  if (!data?.success) return jsonError(typeof data?.message === "string" ? data.message : "协作者管理失败。", organizerStatusForErrorCode(data?.error_code));
  return NextResponse.json({ ok: true, result: data });
}

export async function respondEventOrganizerInviteFromRequestBody(
  body: Record<string, unknown>,
  authContext: AuthenticatedSupabaseContext,
  userAgent: string
) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const response = getString(body, ["response", "status", "action"]).toUpperCase();
  if (!eventId) return jsonError("缺少 event_id。");
  if (!["ACCEPT", "DECLINE"].includes(response)) return jsonError("协作者邀请响应必须是 ACCEPT 或 DECLINE。");

  const { data, error } = await authContext.supabase.rpc("respond_event_organizer_invitation_atomic", {
    p_event_id: eventId,
    p_response: response,
    p_user_agent: userAgent
  });
  if (error) return jsonError(error.message, 500);
  const result = asRecord(data);
  if (result.success !== true) {
    return NextResponse.json(
      { ok: false, message: typeof result.message === "string" ? result.message : "协作者邀请处理失败。", error_code: result.error_code },
      { status: organizerRespondStatusForErrorCode(result.error_code) }
    );
  }

  return NextResponse.json({ ok: true, event_id: result.event_id, status: result.status, role: result.role });
}