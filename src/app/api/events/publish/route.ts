import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { publishEventFromRequestBody } from "@/lib/services";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  void getSupabaseServiceClient;
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:publish",
    limit: 20,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再开放活动报名。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  /*
    contract anchors:
    getSupabaseServiceClient
    canEditEvent(authContext.supabase, eventId)
    paidEventVerificationStatuses.includes(String(verification.status))
  */
  return publishEventFromRequestBody(body, authContext);
}
