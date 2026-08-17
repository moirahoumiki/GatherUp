import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseConfigured } from "@/lib/supabase/client";
import { type Database } from "@/lib/supabase/database.types";

let serverClient: SupabaseClient<Database> | null = null;
let adminClient: SupabaseClient<Database> | null = null;

export type AuthenticatedSupabaseContext = {
  accessToken: string;
  user: NonNullable<Awaited<ReturnType<SupabaseClient<Database>["auth"]["getUser"]>>["data"]["user"]>;
  supabase: SupabaseClient<Database>;
};

export function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (!serverClient) {
    serverClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  return serverClient;
}

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can read cookies but cannot always write refreshed cookies.
          }
        }
      }
    }
  );
}

export function getSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is not configured. Add SUPABASE_SERVICE_ROLE_KEY for server-side write APIs.");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!adminClient) {
    adminClient = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return adminClient;
}

export function getSupabaseUserClient(accessToken: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

export async function verifySupabaseAccessToken(accessToken: string) {
  if (!accessToken) {
    return null;
  }

  const admin = getSupabaseServiceClient();
  const { data, error } = await admin.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getAuthenticatedUser(request: Request) {
  const bearerUser = await verifySupabaseAccessToken(readBearerToken(request));

  if (bearerUser) {
    return bearerUser;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route Handlers that use this helper return their own responses.
        }
      }
    }
  );
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getAuthenticatedSupabaseClient(request: Request) {
  const accessToken = readBearerToken(request);
  const bearerUser = await verifySupabaseAccessToken(accessToken);

  if (bearerUser) {
    return {
      accessToken,
      user: bearerUser,
      supabase: getSupabaseUserClient(accessToken)
    };
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    accessToken: "",
    user,
    supabase
  };
}
