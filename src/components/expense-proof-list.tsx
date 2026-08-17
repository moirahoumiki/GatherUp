"use client";

import { useEffect, useState } from "react";
import { FileImage, Trash2, Upload } from "lucide-react";

import { type EventExpense } from "@/lib/mock-data";
import { isNativePlatform } from "@/lib/mobile/env";
import { pickCompressedImage } from "@/lib/mobile/upload";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ExpenseProofListProps = {
  eventId: string;
  expenses: EventExpense[];
};

function safeFileName(value: string) {
  const fallback = "expense-proof";
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

export function ExpenseProofList({ eventId, expenses }: ExpenseProofListProps) {
  const [proofsByExpenseId, setProofsByExpenseId] = useState(() => {
    return new Map(expenses.map((expense) => [expense.id, expense.proof]));
  });
  const [busyExpenseId, setBusyExpenseId] = useState("");
  const [nativePickingExpenseId, setNativePickingExpenseId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setProofsByExpenseId(new Map(expenses.map((expense) => [expense.id, expense.proof])));
  }, [expenses]);

  async function uploadProof(expense: EventExpense, file: File) {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法上传支出凭证，请配置 Supabase 后重试。");
      return;
    }

    setBusyExpenseId(expense.id);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const storagePath = `${eventId}/${expense.id}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("expense-proofs")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (uploadError) {
        setNotice(uploadError.message);
        return;
      }

      const response = await fetch("/api/expenses/proof", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: eventId,
          expense_id: expense.id,
          storage_path: storagePath
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload.proof_url) {
        setNotice(typeof payload?.message === "string" ? payload.message : "支出凭证状态更新失败。");
        return;
      }

      setProofsByExpenseId((current) => {
        const next = new Map(current);
        next.set(expense.id, String(payload.proof_url));
        return next;
      });
      setNotice("支出凭证已上传并写入 Supabase。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "支出凭证上传失败。");
    } finally {
      setBusyExpenseId("");
    }
  }

  async function voidProof(expense: EventExpense) {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法作废支出凭证，请配置 Supabase 后重试。");
      return;
    }

    setBusyExpenseId(expense.id);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/expenses/proof", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: eventId,
          expense_id: expense.id
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "支出凭证作废失败。");
        return;
      }

      setProofsByExpenseId((current) => {
        const next = new Map(current);
        next.set(expense.id, "pending");
        return next;
      });
      setNotice("支出凭证已作废，原始文件仍保留在私有 Storage 中。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "支出凭证作废失败。");
    } finally {
      setBusyExpenseId("");
    }
  }

  async function pickAndUploadNativeProof(expense: EventExpense) {
    if (!isNativePlatform()) return;

    setNativePickingExpenseId(expense.id);
    setNotice("");
    try {
      const file = await pickCompressedImage({ quality: 72, source: "prompt" });
      if (file) {
        await uploadProof(expense, file);
      }
    } catch {
      setNotice("系统相机/相册调用失败，请稍后重试。");
    } finally {
      setNativePickingExpenseId("");
    }
  }

  return (
    <div className="notice-list">
      {notice && <p className="inline-notice">{notice}</p>}
      {expenses.map((expense) => {
        const proof = proofsByExpenseId.get(expense.id) ?? expense.proof;
        const hasProof = proof !== "pending";
        const isBusy = busyExpenseId === expense.id;

        return (
          <div className="expense-proof-row" key={`${expense.id}-proof`}>
            <span>
              <strong>{expense.title}</strong>
              <small>{hasProof ? proof : "待补充凭证"}</small>
            </span>
            <div className="button-row compact-actions">
              {hasProof && (
                <button className="button secondary compact" type="button" disabled={isBusy} onClick={() => void voidProof(expense)}>
                  <Trash2 size={15} />
                  作废凭证
                </button>
              )}
              <label className={`button secondary compact ${isBusy ? "disabled" : ""}`}>
                {hasProof ? <FileImage size={15} /> : <Upload size={15} />}
                {isBusy ? "处理中" : hasProof ? "替换凭证" : "上传凭证"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  disabled={isBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";

                    if (file) {
                      void uploadProof(expense, file);
                    }
                  }}
                />
              </label>
              {isNativePlatform() && (
                <button
                  className="button secondary compact"
                  type="button"
                  disabled={isBusy || nativePickingExpenseId === expense.id}
                  onClick={() => void pickAndUploadNativeProof(expense)}
                >
                  <Upload size={15} />
                  {nativePickingExpenseId === expense.id ? "读取中" : "相机/相册"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
