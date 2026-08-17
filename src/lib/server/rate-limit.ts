import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Database = import("../supabase/database.types").Database;

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();
let rateLimitServiceClient: SupabaseClient<Database> | null = null;

function isDistributedRateLimitConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getRateLimitServiceClient() {
  if (!rateLimitServiceClient) {
    rateLimitServiceClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  return rateLimitServiceClient;
}

export function pruneExpiredRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getRateLimitBucketCount() {
  return buckets.size;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfIp || "local";
}

function consumeMemoryRateLimit(key: string, options: RateLimitOptions, now: number): RateLimitDecision {
  pruneExpiredRateLimitBuckets(now);

  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: Math.max(options.limit - bucket.count, 0),
    retryAfterSeconds: 0
  };
}

async function consumeDistributedRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitDecision | null> {
  try {
    const supabase = getRateLimitServiceClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_bucket_key: key,
      p_limit: options.limit,
      p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000))
    });

    if (error) {
      console.error("[gatherup:rate-limit] consume_rate_limit RPC failed, falling back to in-memory limiter", error);

      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || typeof row.allowed !== "boolean") {
      return null;
    }

    return {
      allowed: row.allowed,
      remaining: typeof row.remaining === "number" ? row.remaining : 0,
      retryAfterSeconds: typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : 1
    };
  } catch (error) {
    console.error("[gatherup:rate-limit] distributed limiter unavailable, falling back to in-memory limiter", error);

    return null;
  }
}

function buildRateLimitedResponse(options: RateLimitOptions, decision: RateLimitDecision) {
  return Response.json(
    {
      ok: false,
      message: "请求过于频繁，请稍后再试。",
      error_code: "RATE_LIMITED"
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, decision.retryAfterSeconds)),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0"
      }
    }
  );
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions): Promise<Response | null> {
  const key = `${options.keyPrefix}:${getClientKey(request)}`;
  let decision: RateLimitDecision | null = null;

  if (isDistributedRateLimitConfigured()) {
    decision = await consumeDistributedRateLimit(key, options);
  }

  if (!decision) {
    decision = consumeMemoryRateLimit(key, options, Date.now());
  }

  if (!decision.allowed) {
    return buildRateLimitedResponse(options, decision);
  }

  return null;
}
