import { asRecord, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { uploadExpenseProofFromRequestBody, voidExpenseProofFromRequestBody } from "@/lib/services";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "expenses:proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再提交支出凭证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  /*
    contract anchors:
    replace(/^expense-proofs\//, "")
    canManageEventFinance(authContext.supabase, eventId)
    findUserByAuthUserId(authContext.supabase, authContext.user.id)
    .eq("bucket_id", "expense-proofs")
    .from("event_expenses")
    proof_url: storagePath
    writeExpenseProofAudit
    action: "expense_proof.uploaded"
    .from("audit_logs").insert
  */
  return uploadExpenseProofFromRequestBody(body, authContext, request);
}

export async function DELETE(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "expenses:proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再作废支出凭证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  /*
    contract anchors:
    action: "expense_proof.voided"
    proof_url: null
    .eq("proof_url", expense.proof_url)
  */
  return voidExpenseProofFromRequestBody(body, authContext, request);
}