import { NextResponse } from "next/server";

import { asRecord, canEditEvent, findUserByAuthUserId, getNumber, getString, jsonError } from "@/lib/server/api";
import { notifyEventParticipantsOfImportantChange } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function toIsoDateTime(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
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

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:update",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再编辑活动。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const name = getString(body, ["name"]);
  const city = getString(body, ["city"]);
  const venueName = getString(body, ["venue_name", "venueName", "venue"]);
  const address = getString(body, ["address"]);
  const startsAt = toIsoDateTime(getString(body, ["starts_at", "startsAt"]));
  const registrationDeadline = toIsoDateTime(getString(body, ["registration_deadline", "registrationDeadline", "deadline"]));
  const description = getString(body, ["description"]);
  const capacity = Math.round(getNumber(body, ["capacity"], 0));

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!name || !city || !venueName || !startsAt || !registrationDeadline || capacity < 1) {
    return jsonError("请填写活动名称、城市、场地、活动时间、报名截止和有效人数上限。");
  }

  const canEdit = await canEditEvent(authContext.supabase, eventId);

  if (!canEdit) {
    return jsonError("只有活动主办或具备编辑权限的协作者可以编辑活动。", 403);
  }

  const { data: currentEvent, error: currentEventError } = await authContext.supabase
    .from("events")
    .select("id, public_code, name, city, venue_name, address, starts_at, registration_deadline, capacity, description, status, review_status")
    .eq("id", eventId)
    .single();

  if (currentEventError || !currentEvent?.id) {
    return jsonError("找不到可编辑的活动。", 404);
  }

  const { count, error: countError } = await authContext.supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("status", "in", "(cancelled,expired,refunded)");

  if (countError) {
    return jsonError(countError.message, 500);
  }

  const activeRegistrationCount = count ?? 0;

  if (capacity < activeRegistrationCount) {
    return jsonError(`人数上限不能小于当前有效报名数 ${activeRegistrationCount}。`, 409);
  }

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

  if (requiresReview && !requesterId) {
    return jsonError("找不到当前用户资料，无法创建平台复审请求。", 500);
  }

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

  if (error || !updatedEvent?.id) {
    return jsonError(error?.message ?? "活动编辑失败。", 500);
  }

  if (requiresReview) {
    const { error: reviewError } = await authContext.supabase
      .from("review_requests")
      .insert({
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
          after: {
            city,
            venue_name: venueName,
            address: address || null,
            starts_at: startsAt,
            registration_deadline: registrationDeadline,
            capacity,
            review_status: "pending"
          }
        }
      });

    if (reviewError) {
      return jsonError(`活动已更新，但平台复审请求创建失败：${reviewError.message}`, 500);
    }
  }

  if (requiresReview) {
    await notifyEventParticipantsOfImportantChange({
      eventId: updatedEvent.id,
      eventName: updatedEvent.name,
      startsAt: updatedEvent.starts_at ?? null,
      venueName: updatedEvent.venue_name ?? null,
      changedFields: reviewSensitiveChanges
    });
  }

  return NextResponse.json({
    ok: true,
    event: updatedEvent,
    review_required: requiresReview,
    review_sensitive_changes: reviewSensitiveChanges
  });
}
