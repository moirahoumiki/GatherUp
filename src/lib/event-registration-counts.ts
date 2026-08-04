import type { SupabaseClient } from "@supabase/supabase-js";

type RegistrationCountRow = {
  event_id: string;
  registered_count: number | string;
};

export async function getActiveRegistrationCounts(supabase: SupabaseClient, eventIds: string[]) {
  if (eventIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase.rpc("get_public_event_registration_counts", {
    p_event_ids: eventIds
  });

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as RegistrationCountRow[]).map((row) => [row.event_id, Number(row.registered_count) || 0])
  );
}
