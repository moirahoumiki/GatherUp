import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { sendInstantEmailNotifications } from "@/lib/server/instant-email";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "waitlist:invite",
    limit: 60,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再邀请候补用户。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const waitlistEntryId = getString(body, ["waitlist_entry_id", "waitlistEntryId", "id"]);

  if (!waitlistEntryId) {
    return jsonError("缺少 waitlist_entry_id。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("invite_waitlist_entry_atomic", {
      p_waitlist_entry_id: waitlistEntryId
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "WAITLIST_INVITE_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        WAITLIST_ENTRY_NOT_FOUND: 404,
        INVALID_WAITLIST_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "候补邀请失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    await sendInstantEmailNotifications({ templateKeys: ["waitlist_invited"] });

    return NextResponse.json({
      ok: true,
      waitlist_entry_id: result.waitlist_entry_id,
      status: result.status,
      invitation_expires_at: result.invitation_expires_at
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "候补邀请接口暂时不可用。", 500);
  }
}
