import { jsonError } from "@/lib/server/api";
import { exportAttendees } from "@/lib/services";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  void getSupabaseServiceClient;
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再导出名单。", 401);
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id") || searchParams.get("eventId");

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  return exportAttendees(eventId, authContext);
}
