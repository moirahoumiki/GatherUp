import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { joinWaitlistFromRequestBody } from "@/lib/services";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "waitlist:join",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再加入候补。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  // p_event_id: eventId
  // p_desired_quantity:
  // CAPACITY_AVAILABLE
  // authContext.supabase.rpc("join_waitlist_atomic", ...) is executed in service layer.
  return joinWaitlistFromRequestBody(body, authContext);
}
