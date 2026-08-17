import { NextResponse } from "next/server";

import { getString, jsonError, normalizeReviewDecision } from "@/lib/server/api";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const reviewStatusMap: Record<string, string> = {
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changes_requested",
  SUSPENDED: "suspended"
};

const organizerReviewStatusMap: Record<string, string> = {
  APPROVED: "light_verified",
  LIGHT_VERIFIED: "light_verified",
  ENHANCED_VERIFIED: "enhanced_verified",
  REJECTED: "rejected",
  SUSPENDED: "suspended"
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toPublicEventReview(row: Record<string, unknown>) {
  const event = firstRelation(row.events as Record<string, unknown> | Record<string, unknown>[] | null);
  const requester = firstRelation(row.users as { public_id?: string; name?: string } | { public_id?: string; name?: string }[] | null);

  return {
    id: row.id,
    event_id: row.event_id,
    target_id: row.target_id,
    status: row.status,
    reason: row.reason,
    review_note: row.review_note,
    submitted_snapshot: row.submitted_snapshot,
    requester_name: requester?.name ?? "未知提交人",
    requester_public_id: requester?.public_id ?? "GU-UNKNOWN",
    event_name: event?.name ?? "未命名活动",
    event_public_code: event?.public_code ?? "GU-EVENT",
    event_city: event?.city ?? null,
    event_venue_name: event?.venue_name ?? null,
    event_starts_at: event?.starts_at ?? null,
    event_price_cents: event?.price_cents ?? 0,
    event_status: event?.status ?? "draft",
    event_review_status: event?.review_status ?? row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toPublicVerification(row: Record<string, unknown>) {
  const applicant = firstRelation(row.users as { public_id?: string; name?: string } | { public_id?: string; name?: string }[] | null);

  return {
    id: row.id,
    user_id: row.user_id,
    applicant_name: applicant?.name ?? "未命名用户",
    applicant_public_id: applicant?.public_id ?? "GU-UNKNOWN",
    status: row.status,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    community_account: row.community_account,
    past_event_summary: row.past_event_summary,
    review_note: row.review_note,
    force_review_required: row.force_review_required === true,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function listEventReviews() {
  const serviceSupabase = getSupabaseServiceClient();
  const { data, error } = await serviceSupabase
    .from("review_requests")
    .select("id, target_type, target_id, event_id, requester_id, status, reason, submitted_snapshot, review_note, created_at, updated_at, events(id, public_code, name, city, venue_name, starts_at, price_cents, status, review_status), users(public_id, name)")
    .eq("target_type", "event")
    .in("status", ["pending", "changes_requested"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({
    ok: true,
    reviews: ((data ?? []) as Record<string, unknown>[]).map(toPublicEventReview)
  });
}

export async function reviewEventReviewRequest(body: Record<string, unknown>, adminUserId: string) {
  const reviewId = getString(body, ["review_id", "reviewId", "id"]);
  const requestedDecision = getString(body, ["status", "decision", "result"]);
  const normalizedDecision = normalizeReviewDecision(requestedDecision);
  const nextStatus = reviewStatusMap[normalizedDecision] ?? reviewStatusMap[requestedDecision.toUpperCase()];
  const reviewNote = getString(body, ["review_note", "reviewNote", "note"]);

  if (!reviewId) return jsonError("缺少 review_id。");
  if (!nextStatus) return jsonError("审核结果必须是 approved、rejected、changes_requested 或 suspended。");
  if (nextStatus !== "approved" && !reviewNote) return jsonError("驳回、要求修改或暂停活动时必须填写审核备注。");

  const serviceSupabase = getSupabaseServiceClient();
  const { data: current, error: currentError } = await serviceSupabase
    .from("review_requests")
    .select("id, target_type, target_id, event_id, status, reason, review_note")
    .eq("id", reviewId)
    .eq("target_type", "event")
    .single();

  if (currentError || !current?.id || !current.event_id) return jsonError("找不到可审核的活动审核请求。", 404);
  if (!["pending", "changes_requested"].includes(String(current.status))) return jsonError("该活动审核请求当前状态不能再次处理。", 409);

  const now = new Date().toISOString();
  const { data: updatedReview, error: reviewError } = await serviceSupabase
    .from("review_requests")
    .update({
      status: nextStatus,
      reviewed_by: adminUserId,
      reviewed_at: now,
      review_note: reviewNote || null,
      updated_at: now
    })
    .eq("id", reviewId)
    .in("status", ["pending", "changes_requested"])
    .select("id, target_id, event_id, status, review_note")
    .single();

  if (reviewError || !updatedReview?.id) return jsonError(reviewError?.message ?? "活动审核请求更新失败。", 409);

  const { data: updatedEvent, error: eventError } = await serviceSupabase
    .from("events")
    .update({
      review_status: nextStatus,
      updated_at: now
    })
    .eq("id", updatedReview.event_id)
    .select("id, public_code, name, review_status, status")
    .single();

  if (eventError || !updatedEvent?.id) return jsonError(eventError?.message ?? "活动审核状态更新失败。", 500);

  await serviceSupabase.from("audit_logs").insert({
    actor_id: adminUserId,
    actor_role: "admin",
    event_id: updatedEvent.id,
    target_type: "review_request",
    target_id: updatedReview.id,
    action: `event_review.${nextStatus}`,
    risk_level: nextStatus === "approved" ? "medium" : "high",
    reason: reviewNote || "Platform event review",
    before_snapshot: {
      review_request_status: current.status,
      review_note: current.review_note
    },
    after_snapshot: {
      review_request_status: updatedReview.status,
      event_review_status: updatedEvent.review_status,
      review_note: updatedReview.review_note
    },
    metadata: {
      eventPublicCode: updatedEvent.public_code,
      eventName: updatedEvent.name
    }
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: updatedReview.id,
      event_id: updatedEvent.id,
      event_public_code: updatedEvent.public_code,
      event_name: updatedEvent.name,
      status: updatedReview.status,
      event_review_status: updatedEvent.review_status
    }
  });
}

export async function listOrganizerVerifications() {
  const serviceSupabase = getSupabaseServiceClient();
  const { data, error } = await serviceSupabase
    .from("organizer_verifications")
    .select("id, user_id, status, contact_email, contact_phone, community_account, past_event_summary, review_note, force_review_required, created_at, updated_at, users(public_id, name)")
    .in("status", ["pending", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({
    ok: true,
    verifications: ((data ?? []) as Record<string, unknown>[]).map(toPublicVerification)
  });
}

export async function reviewOrganizerVerification(body: Record<string, unknown>, adminUserId: string) {
  const verificationId = getString(body, ["verification_id", "verificationId"]);
  const requestedDecision = getString(body, ["status", "decision", "result"]);
  const normalizedDecision = normalizeReviewDecision(requestedDecision);
  const nextStatus = organizerReviewStatusMap[normalizedDecision] ?? organizerReviewStatusMap[requestedDecision.toUpperCase()];
  const reviewNote = getString(body, ["review_note", "reviewNote", "note"]);

  if (!verificationId) return jsonError("缺少 verification_id。");
  if (!nextStatus) return jsonError("审核结果必须是 approved、enhanced_verified、rejected 或 suspended。");
  if ((nextStatus === "rejected" || nextStatus === "suspended") && !reviewNote) return jsonError("驳回或暂停认证时必须填写审核备注。");

  const serviceSupabase = getSupabaseServiceClient();
  const { data: current, error: currentError } = await serviceSupabase
    .from("organizer_verifications")
    .select("id, user_id, status, force_review_required, review_note")
    .eq("id", verificationId)
    .single();
  if (currentError || !current?.id) return jsonError("找不到可审核的主办认证申请。", 404);

  const { data: updated, error: updateError } = await serviceSupabase
    .from("organizer_verifications")
    .update({
      status: nextStatus,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
      force_review_required: false
    })
    .eq("id", verificationId)
    .select("id, user_id, status, review_note, force_review_required")
    .single();

  if (updateError || !updated?.id) return jsonError(updateError?.message ?? "主办认证审核失败。", 500);

  await serviceSupabase.from("audit_logs").insert({
    actor_id: adminUserId,
    actor_role: "admin",
    target_type: "organizer_verification",
    target_id: updated.id,
    action: `organizer_verification.${nextStatus}`,
    risk_level: nextStatus === "suspended" ? "high" : "medium",
    reason: reviewNote || "Platform organizer verification review",
    before_snapshot: {
      status: current.status,
      force_review_required: current.force_review_required,
      review_note: current.review_note
    },
    after_snapshot: {
      status: updated.status,
      force_review_required: updated.force_review_required,
      review_note: updated.review_note
    },
    metadata: {
      applicantUserId: updated.user_id
    }
  });

  return NextResponse.json({
    ok: true,
    verification: toPublicVerification(updated as Record<string, unknown>)
  });
}