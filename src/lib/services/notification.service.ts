import { NextResponse } from "next/server";

import { asRecord, findUserByAuthUserId, getNumber, getString, jsonError } from "@/lib/server/api";
import { processPendingEmailNotifications } from "@/lib/server/email-notifications";
import { type AuthenticatedSupabaseContext, getSupabaseServiceClient } from "@/lib/supabase/server";

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

function toNotificationResponse(item: Record<string, unknown>) {
  return {
    id: item.id,
    event_id: item.event_id,
    announcement_id: item.announcement_id,
    channel: item.channel,
    status: item.status,
    template_key: item.template_key,
    title: item.title,
    body: item.body,
    metadata: item.metadata ?? {},
    sent_at: item.sent_at,
    read_at: item.read_at,
    created_at: item.created_at
  };
}

export async function listNotifications(request: Request, authContext: AuthenticatedSupabaseContext) {
  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);
  if (!appUser) {
    return jsonError("找不到当前登录用户。", 401);
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1" || url.searchParams.get("unread") === "true";
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 30));

  let query = authContext.supabase
    .from("notification_deliveries")
    .select("id, announcement_id, event_id, channel, status, template_key, title, body, metadata, sent_at, read_at, created_at")
    .eq("recipient_id", appUser.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) {
    return jsonError(error.message, 500);
  }

  const { count, error: countError } = await authContext.supabase
    .from("notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", appUser.id)
    .eq("channel", "in_app")
    .is("read_at", null);

  if (countError) {
    return jsonError(countError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    unread_count: count ?? 0,
    notifications: (data ?? []).map((item) => toNotificationResponse(item as Record<string, unknown>))
  });
}

export async function markNotificationsRead(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const markAll = body.all === true || body.mark_all === true || body.markAll === true;
  const notificationId = getString(body, ["notification_id", "notificationId", "id"]);
  if (!markAll && !notificationId) {
    return jsonError("缺少 notification_id，或传入 all=true 标记全部已读。");
  }

  const { data, error } = await authContext.supabase.rpc("mark_notification_deliveries_read", {
    p_notification_id: markAll ? null : notificationId,
    p_mark_all: markAll
  });
  if (error) {
    return jsonError(error.message, 500);
  }

  const result = asRecord(data);
  if (result.success !== true) {
    const errorCode = typeof result.error_code === "string" ? result.error_code : "NOTIFICATION_UPDATE_FAILED";
    const statusMap: Record<string, number> = {
      UNAUTHORIZED: 401,
      MISSING_NOTIFICATION_ID: 400
    };
    return NextResponse.json(
      { ok: false, message: typeof result.message === "string" ? result.message : "通知状态更新失败。", error_code: errorCode },
      { status: statusMap[errorCode] ?? 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    updated_count: getNumber(result, ["updated_count"], 0)
  });
}

export async function sendPendingEmails() {
  const serviceSupabase = getSupabaseServiceClient();
  const results = await processPendingEmailNotifications(serviceSupabase);
  return NextResponse.json({
    ok: true,
    processed_count: results.length,
    sent_count: results.filter((result) => result.ok).length,
    failed_count: results.filter((result) => !result.ok).length,
    results
  });
}