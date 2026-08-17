import {
  asRecord,
  jsonError
} from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { createOrderFromRequestBody } from "@/lib/services";
import {
  getAuthenticatedSupabaseClient
} from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再创建真实报名订单。", 401);
  }

  // payment_id: payment?.id ?? null
  // authContext.supabase.rpc("create_registration_atomic", ...) is executed in service layer.
  return createOrderFromRequestBody(body, authContext);
}
