import { type SupabaseClient } from "@supabase/supabase-js";

import { buildInstantEmailContent } from "@/domain/notification-emails";
import { isResendConfigured, sendEmail } from "@/lib/resend";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const INSTANT_EMAIL_LOOKBACK_MINUTES = 15;
const INSTANT_EMAIL_BATCH_SIZE = 20;

export type InstantEmailDispatchResult = {
  attempted: number;
  sent: number;
  failed: number;
};

type PendingEmailRow = {
  id: string;
  recipient_id: string;
  event_id: string | null;
  template_key: string | null;
  metadata: Record<string, unknown> | null;
};

type EventSummary = {
  name: string;
  starts_at: string | null;
};

const EMPTY_RESULT: InstantEmailDispatchResult = { attempted: 0, sent: 0, failed: 0 };

async function loadEventSummaries(supabase: SupabaseClient, eventIds: readonly string[]) {
  const summaries = new Map<string, EventSummary>();
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));

  if (!uniqueIds.length) {
    return summaries;
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, name, starts_at")
    .in("id", uniqueIds);

  if (error) {
    return summaries;
  }

  for (const event of data ?? []) {
    summaries.set(String(event.id), {
      name: String(event.name ?? ""),
      starts_at: typeof event.starts_at === "string" ? event.starts_at : null
    });
  }

  return summaries;
}

async function loadRecipientEmails(supabase: SupabaseClient, recipientIds: readonly string[]) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email")
    .in("id", Array.from(new Set(recipientIds)));

  if (error) {
    return new Map<string, string | null>();
  }

  return new Map((data ?? []).map((user) => [user.id as string, (user.email as string | null) ?? null]));
}

/**
 * Sends the pending email mirrors for time-critical events right away instead
 * of waiting for the daily cron. Failures keep the delivery in `pending` so the
 * cron-driven processor (processPendingEmailNotifications) can retry later.
 * This function never throws: notification delivery must not break the
 * business API route that triggered it.
 */
export async function sendInstantEmailNotifications(options: {
  templateKeys: readonly string[];
  eventId?: string;
}): Promise<InstantEmailDispatchResult> {
  try {
    const supabase = getSupabaseServiceClient();
    const sinceIso = new Date(Date.now() - INSTANT_EMAIL_LOOKBACK_MINUTES * 60_000).toISOString();

    let query = supabase
      .from("notification_deliveries")
      .select("id, recipient_id, event_id, template_key, metadata")
      .eq("channel", "email")
      .eq("status", "pending")
      .in("template_key", Array.from(options.templateKeys))
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(INSTANT_EMAIL_BATCH_SIZE);

    if (options.eventId) {
      query = query.eq("event_id", options.eventId);
    }

    const { data: pendingRows, error: pendingError } = await query;

    if (pendingError || !pendingRows?.length) {
      return EMPTY_RESULT;
    }

    const rows = pendingRows as PendingEmailRow[];
    const eventSummaries = await loadEventSummaries(
      supabase,
      rows.map((row) => row.event_id ?? "")
    );
    const emailById = await loadRecipientEmails(
      supabase,
      rows.map((row) => row.recipient_id)
    );

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      const event = row.event_id ? eventSummaries.get(row.event_id) : undefined;
      const content = buildInstantEmailContent(row.template_key ?? "", {
        eventName: event?.name,
        eventStartsAt: event?.starts_at,
        metadata: row.metadata ?? {}
      });

      if (content) {
        await supabase
          .from("notification_deliveries")
          .update({ title: content.subject, body: content.body })
          .eq("id", row.id);
      }

      if (!content || !isResendConfigured()) {
        continue;
      }

      const recipientEmail = emailById.get(row.recipient_id);

      if (!recipientEmail) {
        await supabase
          .from("notification_deliveries")
          .update({ status: "failed", error_message: "Recipient has no email address on file." })
          .eq("id", row.id);

        failed += 1;
        continue;
      }

      const sendResult = await sendEmail({
        to: recipientEmail,
        subject: content.subject,
        body: content.body
      });

      if (sendResult.ok) {
        await supabase
          .from("notification_deliveries")
          .update({
            status: "sent",
            provider_message_id: sendResult.providerMessageId,
            error_message: null,
            sent_at: new Date().toISOString()
          })
          .eq("id", row.id);

        sent += 1;
      } else {
        await supabase
          .from("notification_deliveries")
          .update({ error_message: sendResult.error })
          .eq("id", row.id);

        failed += 1;
      }
    }

    return { attempted: rows.length, sent, failed };
  } catch {
    return EMPTY_RESULT;
  }
}

const ACTIVE_REGISTRATION_STATUSES = [
  "pending_review",
  "awaiting_payment",
  "payment_submitted",
  "payment_rejected_resubmittable",
  "partial_paid_needs_topup",
  "confirmed",
  "waitlisted"
];

/**
 * Creates the in-app "event important change" notification for every active
 * participant. The DB mirror trigger fans each row out to a pending email
 * delivery, which sendInstantEmailNotifications then flushes immediately.
 * This function never throws.
 */
export async function notifyEventParticipantsOfImportantChange(options: {
  eventId: string;
  eventName: string;
  startsAt: string | null;
  venueName: string | null;
  changedFields: readonly string[];
}): Promise<InstantEmailDispatchResult> {
  try {
    const supabase = getSupabaseServiceClient();

    const { data: registrations, error: registrationsError } = await supabase
      .from("registrations")
      .select("user_id")
      .eq("event_id", options.eventId)
      .in("status", ACTIVE_REGISTRATION_STATUSES);

    if (registrationsError || !registrations?.length) {
      return EMPTY_RESULT;
    }

    const recipientIds = Array.from(new Set(registrations.map((row) => row.user_id as string).filter(Boolean)));

    if (!recipientIds.length) {
      return EMPTY_RESULT;
    }

    const nowIso = new Date().toISOString();
    const metadata = {
      workflow: "event_update",
      eventId: options.eventId,
      changedFields: options.changedFields.join(","),
      startsAt: options.startsAt ?? "",
      venueName: options.venueName ?? ""
    };

    const { error: insertError } = await supabase.from("notification_deliveries").insert(
      recipientIds.map((recipientId) => ({
        event_id: options.eventId,
        recipient_id: recipientId,
        channel: "in_app",
        status: "sent",
        template_key: "event_updated",
        title: `活动信息有重要变更：${options.eventName}`,
        body: `「${options.eventName}」的关键信息已更新，请前往活动页确认最新安排。`,
        metadata,
        sent_at: nowIso
      }))
    );

    if (insertError) {
      return EMPTY_RESULT;
    }

    return sendInstantEmailNotifications({
      eventId: options.eventId,
      templateKeys: ["event_updated"]
    });
  } catch {
    return EMPTY_RESULT;
  }
}
