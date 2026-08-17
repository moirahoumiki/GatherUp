import { type SupabaseClient } from "@supabase/supabase-js";

import { type Database } from "@/lib/supabase/database.types";

export type ServiceUser = {
  id: string;
  email?: string | null;
};

export type ServiceContext = {
  supabase: SupabaseClient<Database>;
  user: ServiceUser;
  accessToken?: string;
  userAgent?: string;
};
