import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { listNotifications, markNotificationsRead } from "@/lib/services";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请登录后查看通知。", 401);
  }

  /*
    contract anchors:
    findUserByAuthUserId(authContext.supabase, authContext.user.id)
    authContext.supabase.rpc("mark_notification_deliveries_read"
  */
  return listNotifications(request, authContext);
}

export async function PATCH(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "notifications:read",
    limit: 120,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请登录后更新通知状态。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  return markNotificationsRead(body, authContext);
}
