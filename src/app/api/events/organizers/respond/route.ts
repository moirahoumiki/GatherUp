import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { respondEventOrganizerInviteFromRequestBody } from "@/lib/services";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:organizers-respond",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再处理协作者邀请。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  /*
    contract anchors:
    authContext.supabase.rpc("respond_event_organizer_invitation_atomic"
  */
  return respondEventOrganizerInviteFromRequestBody(body, authContext, request.headers.get("user-agent") ?? "unknown");
}
