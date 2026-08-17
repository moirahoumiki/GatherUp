import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DELETION_RETENTION_DAYS = 30;

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "account:delete",
    limit: 6,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const context = await getAuthenticatedSupabaseClient(request);

  if (!context) {
    return NextResponse.json(
      {
        ok: false,
        message: "请先登录后再执行账号删除。"
      },
      { status: 401 }
    );
  }

  try {
    const admin = getSupabaseServiceClient();
    const authUserId = context.user.id;
    const nowIso = new Date().toISOString();
    const purgeAfterIso = addDaysIso(DELETION_RETENTION_DAYS);

    const { data: userRow, error: userLookupError } = await admin
      .from("users")
      .select("id,email,name,public_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (userLookupError) {
      return NextResponse.json(
        {
          ok: false,
          message: `读取用户资料失败：${userLookupError.message}`
        },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        {
          ok: false,
          message: "未找到对应用户资料，无法删除账号。"
        },
        { status: 404 }
      );
    }

    const anonymizedName = "Deleted User";
    const anonymizedPublicId = `GU-DELETED-${userRow.id.slice(0, 8).toUpperCase()}`;
    const anonymizedEmail = `deleted+${userRow.id}@deleted.gatherup.local`;

    const { error: profileUpdateError } = await admin
      .from("users")
      .update({
        name: anonymizedName,
        email: anonymizedEmail,
        public_id: anonymizedPublicId,
        avatar_url: null
      })
      .eq("id", userRow.id);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          message: `匿名化资料失败：${profileUpdateError.message}`
        },
        { status: 500 }
      );
    }

    const { error: auditInsertError } = await admin.from("audit_logs").insert({
      actor_id: userRow.id,
      event_id: null,
      target_type: "account",
      target_id: userRow.id,
      action: "account.delete_requested",
      metadata: {
        requested_at: nowIso,
        purge_after: purgeAfterIso,
        strategy: "soft_delete_30d_then_purge",
        note: "Auth user deleted immediately to satisfy Apple account deletion requirement."
      },
      risk_level: "medium"
    });

    if (auditInsertError) {
      return NextResponse.json(
        {
          ok: false,
          message: `记录删除审计日志失败：${auditInsertError.message}`
        },
        { status: 500 }
      );
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUserId, true);

    if (authDeleteError) {
      return NextResponse.json(
        {
          ok: false,
          message: `删除认证账号失败：${authDeleteError.message}`
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `账号删除已提交并执行。资料已匿名化，剩余数据将在 ${DELETION_RETENTION_DAYS} 天后清理。`
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "删除账号失败，请稍后再试。"
      },
      { status: 500 }
    );
  }
}