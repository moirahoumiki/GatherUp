import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "push:register-device",
    limit: 40,
    windowMs: 60_000
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);
  if (!authContext) {
    return jsonError("请先登录后再登记设备。", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const token = getString(body, ["token", "device_token"]);
  const platform = getString(body, ["platform"]).toLowerCase();
  if (!token) {
    return jsonError("缺少设备 token。");
  }
  if (!["ios", "android", "web"].includes(platform)) {
    return jsonError("platform 仅支持 ios/android/web。");
  }

  const { data: userRow, error: userError } = await authContext.supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authContext.user.id)
    .single();
  if (userError || !userRow?.id) {
    return jsonError("未找到当前账号档案。", 404);
  }

  const { error: upsertError } = await authContext.supabase.from("push_devices").upsert(
    {
      user_id: userRow.id,
      platform,
      device_token: token,
      is_active: true,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "device_token" }
  );

  if (upsertError) {
    return jsonError("设备登记失败，请稍后重试。", 500);
  }

  return Response.json({ ok: true });
}