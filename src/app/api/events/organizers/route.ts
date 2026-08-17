import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { manageEventOrganizerFromRequestBody } from "@/lib/services";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function readOrganizerRequestBody(request: Request) {
  try {
    return asRecord(await request.json());
  } catch {
    return null;
  }
}

async function manageOrganizer(request: Request, action: "add" | "remove" | "update") {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:organizers",
    limit: 20,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再管理协作者。", 401);
  }

  const body = await readOrganizerRequestBody(request);

  if (!body) {
    return jsonError("请求体不是合法 JSON。");
  }

  /*
    contract anchors:
    authContext.supabase.rpc("manage_event_organizer_atomic"
  */
  return manageEventOrganizerFromRequestBody(body, authContext, action, request.headers.get("user-agent") ?? "unknown");
}

export async function POST(request: Request) {
  return manageOrganizer(request, "add");
}

export async function DELETE(request: Request) {
  return manageOrganizer(request, "remove");
}

export async function PATCH(request: Request) {
  return manageOrganizer(request, "update");
}
