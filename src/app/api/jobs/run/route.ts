import { NextResponse } from "next/server";

import { processPendingEmailNotifications } from "@/lib/server/email-notifications";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";

  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, message: "Supabase service role is not configured for scheduled jobs." },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServiceClient();

  const [seatLocksResult, waitlistResult] = await Promise.all([
    supabase.rpc("expire_seat_locks_for_event"),
    supabase.rpc("expire_waitlist_invitations")
  ]);

  const errors: string[] = [];

  if (seatLocksResult.error) {
    errors.push(`expire_seat_locks_for_event: ${seatLocksResult.error.message}`);
  }

  if (waitlistResult.error) {
    errors.push(`expire_waitlist_invitations: ${waitlistResult.error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, message: errors.join("；") }, { status: 500 });
  }

  const emailResults = await processPendingEmailNotifications(supabase);

  return NextResponse.json({
    ok: true,
    expired_seat_locks: typeof seatLocksResult.data === "number" ? seatLocksResult.data : 0,
    expired_waitlist_invitations: typeof waitlistResult.data === "number" ? waitlistResult.data : 0,
    email_processed_count: emailResults.length,
    email_sent_count: emailResults.filter((result) => result.ok).length,
    email_failed_count: emailResults.filter((result) => !result.ok).length
  });
}
