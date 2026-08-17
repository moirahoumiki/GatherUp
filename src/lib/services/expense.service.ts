import { NextResponse } from "next/server";

import { canManageEventFinance, findUserByAuthUserId, getNumber, getString, jsonError } from "@/lib/server/api";
import { AppError } from "@/lib/services/errors";
import { type AuthenticatedSupabaseContext, getSupabaseServiceClient } from "@/lib/supabase/server";

const categoryMap: Record<string, string> = {
  场地费: "venue",
  物料采购: "materials",
  餐饮茶歇: "food",
  设备租赁: "equipment",
  交通快递: "transport",
  宣传设计: "marketing",
  其他: "other"
};

const statusMap: Record<string, string> = {
  预算中: "budgeted",
  已支付: "paid",
  待报销: "reimbursable"
};

const publicCategoryMap: Record<string, string> = Object.fromEntries(Object.entries(categoryMap).map(([label, value]) => [value, label]));
const publicStatusMap: Record<string, string> = Object.fromEntries(Object.entries(statusMap).map(([label, value]) => [value, label]));

function normalizeCategory(value: string) {
  return categoryMap[value] ?? (value || "other");
}

function normalizeStatus(value: string) {
  return statusMap[value] ?? (value || "budgeted");
}

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/^expense-proofs\//, "");
}

function pathMatchesExpenseProof(path: string, eventId: string, expenseId: string) {
  const parts = path.split("/");
  return parts.length >= 3 && parts[0] === eventId && parts[1] === expenseId && Boolean(parts[2]);
}

function toExpenseResponse(item: Record<string, unknown>, paidBy: string) {
  return {
    id: item.id,
    eventId: item.event_id,
    category: publicCategoryMap[String(item.category)] ?? "其他",
    title: item.title,
    amount: Math.round(Number(item.amount_cents ?? 0) / 100),
    status: publicStatusMap[String(item.status)] ?? "预算中",
    paidBy,
    proof: item.proof_url ?? "pending",
    note: item.note ?? "活动支出",
    createdAt: String(item.created_at ?? "").slice(0, 10)
  };
}

async function writeExpenseProofAudit({
  action,
  actorId,
  eventId,
  expenseId,
  beforeProofUrl,
  afterProofUrl,
  request,
  storagePath
}: {
  action: "expense_proof.uploaded" | "expense_proof.voided";
  actorId: string;
  eventId: string;
  expenseId: string;
  beforeProofUrl: string | null;
  afterProofUrl: string | null;
  request: Request;
  storagePath: string;
}) {
  const serviceSupabase = getSupabaseServiceClient();
  const { error } = await serviceSupabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_role: "finance_manager",
    event_id: eventId,
    target_type: "event_expense",
    target_id: expenseId,
    action,
    risk_level: "medium",
    reason: action === "expense_proof.voided" ? "Expense proof voided by finance manager" : "Expense proof uploaded by finance manager",
    before_snapshot: { proof_url: beforeProofUrl },
    after_snapshot: { proof_url: afterProofUrl },
    metadata: { bucket: "expense-proofs", storagePath },
    user_agent: request.headers.get("user-agent") ?? "unknown"
  });
  if (error) {
    throw new AppError(error.message, 500);
  }
}

export async function createExpenseFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const title = getString(body, ["title"]);
  const amount = getNumber(body, ["amount"], Number.NaN);
  const note = getString(body, ["note"]);
  const category = normalizeCategory(getString(body, ["category"]));
  const status = normalizeStatus(getString(body, ["status"]));

  if (!eventId) return jsonError("缺少 event_id。");
  if (!title) return jsonError("请填写支出名称。");
  if (!Number.isFinite(amount) || amount < 0) return jsonError("金额需要是有效数字。");

  const canManage = await canManageEventFinance(authContext.supabase, eventId);
  if (!canManage) return jsonError("只有活动主办或财务协作者可以记录支出。", 403);

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);
  if (!appUser?.id) return jsonError("找不到当前 GatherUp 用户资料，请先完成账号同步。", 404);

  const { data, error } = await authContext.supabase
    .from("event_expenses")
    .insert({
      event_id: eventId,
      category,
      title,
      amount_cents: Math.round(amount * 100),
      status,
      paid_by: appUser.id,
      note: note || null
    })
    .select("id, event_id, category, title, amount_cents, status, paid_by, proof_url, note, created_at")
    .single();

  if (error) return jsonError(error.message, 403);
  return NextResponse.json({ ok: true, expense: toExpenseResponse(data as Record<string, unknown>, appUser.public_id) });
}

export async function uploadExpenseProofFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext, request: Request) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const expenseId = getString(body, ["expense_id", "expenseId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));

  if (!eventId) return jsonError("缺少 event_id。");
  if (!expenseId) return jsonError("缺少 expense_id。");
  if (!storagePath) return jsonError("缺少支出凭证存储路径。");

  const canManage = await canManageEventFinance(authContext.supabase, eventId);
  if (!canManage) return jsonError("只有活动主办或财务协作者可以提交支出凭证。", 403);

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);
  if (!appUser?.id) return jsonError("找不到当前用户资料，无法记录支出凭证审计。", 404);

  const { data: expense, error: expenseError } = await authContext.supabase
    .from("event_expenses")
    .select("id, event_id, proof_url")
    .eq("id", expenseId)
    .eq("event_id", eventId)
    .single();

  if (expenseError || !expense?.id) return jsonError("找不到可处理的支出记录。", 404);
  if (!pathMatchesExpenseProof(storagePath, eventId, expense.id)) return jsonError("支出凭证路径与支出记录不匹配。", 400);

  const { data: storedObject, error: storedObjectError } = await authContext.supabase
    .schema("storage")
    .from("objects")
    .select("id")
    .eq("bucket_id", "expense-proofs")
    .eq("name", storagePath)
    .maybeSingle();

  if (storedObjectError || !storedObject?.id) return jsonError("找不到已上传的支出凭证文件。", 404);

  const { data: updatedExpense, error: updateError } = await authContext.supabase
    .from("event_expenses")
    .update({ proof_url: storagePath })
    .eq("id", expense.id)
    .eq("event_id", eventId)
    .select("id, proof_url")
    .single();

  if (updateError || !updatedExpense?.id) return jsonError(updateError?.message ?? "支出凭证已上传，但凭证状态更新失败。", 500);

  try {
    await writeExpenseProofAudit({
      action: "expense_proof.uploaded",
      actorId: appUser.id,
      eventId,
      expenseId: updatedExpense.id,
      beforeProofUrl: typeof expense.proof_url === "string" ? expense.proof_url : null,
      afterProofUrl: updatedExpense.proof_url,
      request,
      storagePath
    });
  } catch (error) {
    return jsonError(error instanceof Error ? `支出凭证已更新，但审计日志写入失败：${error.message}` : "支出凭证已更新，但审计日志写入失败。", 500);
  }

  return NextResponse.json({ ok: true, expense_id: updatedExpense.id, proof_url: updatedExpense.proof_url });
}

export async function voidExpenseProofFromRequestBody(body: Record<string, unknown>, authContext: AuthenticatedSupabaseContext, request: Request) {
  const eventId = getString(body, ["event_id", "eventId"]);
  const expenseId = getString(body, ["expense_id", "expenseId"]);
  if (!eventId) return jsonError("缺少 event_id。");
  if (!expenseId) return jsonError("缺少 expense_id。");

  const canManage = await canManageEventFinance(authContext.supabase, eventId);
  if (!canManage) return jsonError("只有活动主办或财务协作者可以作废支出凭证。", 403);

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);
  if (!appUser?.id) return jsonError("找不到当前用户资料，无法记录支出凭证审计。", 404);

  const { data: expense, error: expenseError } = await authContext.supabase
    .from("event_expenses")
    .select("id, event_id, proof_url")
    .eq("id", expenseId)
    .eq("event_id", eventId)
    .single();
  if (expenseError || !expense?.id) return jsonError("找不到可处理的支出记录。", 404);
  if (!expense.proof_url) return jsonError("该支出记录暂无可作废凭证。", 409);

  const { data: updatedExpense, error: updateError } = await authContext.supabase
    .from("event_expenses")
    .update({ proof_url: null })
    .eq("id", expense.id)
    .eq("event_id", eventId)
    .eq("proof_url", expense.proof_url)
    .select("id, proof_url")
    .single();
  if (updateError || !updatedExpense?.id) return jsonError(updateError?.message ?? "支出凭证作废失败。", 500);

  try {
    await writeExpenseProofAudit({
      action: "expense_proof.voided",
      actorId: appUser.id,
      eventId,
      expenseId: updatedExpense.id,
      beforeProofUrl: expense.proof_url,
      afterProofUrl: null,
      request,
      storagePath: expense.proof_url
    });
  } catch (error) {
    return jsonError(error instanceof Error ? `支出凭证已作废，但审计日志写入失败：${error.message}` : "支出凭证已作废，但审计日志写入失败。", 500);
  }

  return NextResponse.json({ ok: true, expense_id: updatedExpense.id, proof_url: updatedExpense.proof_url ?? "pending" });
}