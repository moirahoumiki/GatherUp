import { asRecord, jsonError } from "@/lib/server/api";
import { hasPlatformAdminError, requirePlatformAdmin } from "@/lib/server/admin";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { listEventReviews, reviewEventReviewRequest } from "@/lib/services";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  void getSupabaseServiceClient;
  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  return listEventReviews();
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "admin:event-reviews",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  return reviewEventReviewRequest(body, adminCheck.appUser.id);
}
