import { hasPlatformAdminError, requirePlatformAdmin } from "@/lib/server/admin";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { sendPendingEmails } from "@/lib/services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "notifications:send-email",
    limit: 10,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  return sendPendingEmails();
}
