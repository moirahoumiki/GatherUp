"use client";

import { useState } from "react";
import { Check, RefreshCcw, Upload, X } from "lucide-react";

import type { EventRefundRequest } from "@/lib/organizer-data";
import { isNativePlatform } from "@/lib/mobile/env";
import { pickCompressedImage } from "@/lib/mobile/upload";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type RefundReviewPanelProps = {
  eventId: string;
  refundRequests: EventRefundRequest[];
};

type RefundReviewResult = {
  approved_amount_cents?: number;
  amount_cents?: number;
  message?: string;
  ok?: boolean;
  status?: string;
  storage_path?: string;
};

function safeFileName(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  return cleaned || "refund-proof";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: "待审核",
    approved: "已同意",
    rejected: "已拒绝",
    paid_offline: "已线下打款",
    proof_uploaded: "凭证已上传",
    confirmed: "参与者已确认",
    disputed: "有争议",
    cancelled: "已取消"
  };

  return labels[status] ?? status;
}

export function RefundReviewPanel({ eventId, refundRequests }: RefundReviewPanelProps) {
  const [rows, setRows] = useState(refundRequests);
  const [busyId, setBusyId] = useState("");
  const [nativePickingId, setNativePickingId] = useState("");
  const [notice, setNotice] = useState("");

  async function getAccessToken() {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法处理真实退款，请配置 Supabase 后重试。");
      return "";
    }

    const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

    if (!accessToken) {
      setNotice("请先使用 Supabase 账号登录后再处理退款。");
      return "";
    }

    return accessToken;
  }

  async function reviewRefund(refundRequest: EventRefundRequest, result: "APPROVED" | "REJECTED") {
    setBusyId(refundRequest.id);
    setNotice("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) return;

      const response = await fetch("/api/orders/refund/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          refund_request_id: refundRequest.id,
          result,
          approved_amount_cents: result === "APPROVED" ? refundRequest.requestedAmount * 100 : undefined,
          organizer_note: result === "APPROVED" ? "主办方同意退款" : "主办方拒绝退款"
        })
      });
      const payload = (await response.json().catch(() => ({}))) as RefundReviewResult;

      if (!response.ok || !payload.ok) {
        setNotice(payload.message ?? "退款审核失败。");
        return;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === refundRequest.id
            ? {
                ...item,
                approvedAmount:
                  typeof payload.approved_amount_cents === "number"
                    ? Math.round(payload.approved_amount_cents / 100)
                    : item.approvedAmount,
                reviewNote: result === "APPROVED" ? "主办方同意退款" : "主办方拒绝退款",
                status: String(payload.status ?? (result === "APPROVED" ? "approved" : "rejected"))
              }
            : item
        )
      );
      setNotice(`${refundRequest.orderNumber} 退款已${result === "APPROVED" ? "同意" : "拒绝"}。`);
    } catch {
      setNotice("退款审核接口暂时不可用，请稍后重试。");
    } finally {
      setBusyId("");
    }
  }

  async function uploadRefundProof(refundRequest: EventRefundRequest, file: File) {
    setBusyId(refundRequest.id);
    setNotice("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) return;

      const supabase = getSupabaseBrowserClient();
      const storagePath = `${eventId}/${refundRequest.id}/${Date.now()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("refund-proofs")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (uploadError) {
        setNotice(uploadError.message);
        return;
      }

      const response = await fetch("/api/orders/refund/proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          refund_request_id: refundRequest.id,
          storage_path: storagePath,
          amount_cents: (refundRequest.approvedAmount ?? refundRequest.requestedAmount) * 100
        })
      });
      const payload = (await response.json().catch(() => ({}))) as RefundReviewResult;

      if (!response.ok || !payload.ok) {
        setNotice(payload.message ?? "退款凭证提交失败。");
        return;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === refundRequest.id
            ? {
                ...item,
                proofAmount:
                  typeof payload.amount_cents === "number" ? Math.round(payload.amount_cents / 100) : item.proofAmount,
                proofPath: String(payload.storage_path ?? storagePath),
                status: String(payload.status ?? "proof_uploaded")
              }
            : item
        )
      );
      setNotice(`${refundRequest.orderNumber} 退款凭证已上传。`);
    } catch {
      setNotice("退款凭证上传失败，请稍后重试。");
    } finally {
      setBusyId("");
    }
  }

  async function resolveDispute(refundRequest: EventRefundRequest, resolution: "CONFIRM_REFUNDED" | "REOPEN_PROOF") {
    setBusyId(refundRequest.id);
    setNotice("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) return;

      const response = await fetch("/api/orders/refund/dispute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          refund_request_id: refundRequest.id,
          resolution,
          note: resolution === "CONFIRM_REFUNDED" ? "主办方确认争议已解决" : "主办方重新处理打款凭证"
        })
      });
      const payload = (await response.json().catch(() => ({}))) as RefundReviewResult;

      if (!response.ok || !payload.ok) {
        setNotice(payload.message ?? "退款争议处理失败。");
        return;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === refundRequest.id
            ? {
                ...item,
                proofPath: resolution === "REOPEN_PROOF" ? null : item.proofPath,
                reviewNote: resolution === "CONFIRM_REFUNDED" ? "主办方确认争议已解决" : "主办方重新处理打款凭证",
                status: String(payload.status ?? (resolution === "CONFIRM_REFUNDED" ? "confirmed" : "approved"))
              }
            : item
        )
      );
      setNotice(resolution === "CONFIRM_REFUNDED" ? `${refundRequest.orderNumber} 争议已解决。` : `${refundRequest.orderNumber} 已重新进入打款凭证上传。`);
    } catch {
      setNotice("退款争议处理接口暂时不可用，请稍后重试。");
    } finally {
      setBusyId("");
    }
  }

  async function pickAndUploadNativeProof(refundRequest: EventRefundRequest) {
    if (!isNativePlatform()) return;
    setNativePickingId(refundRequest.id);
    setNotice("");
    try {
      const file = await pickCompressedImage({ quality: 72, source: "prompt" });
      if (file) {
        await uploadRefundProof(refundRequest, file);
      }
    } catch {
      setNotice("系统相机/相册调用失败，请稍后重试。");
    } finally {
      setNativePickingId("");
    }
  }

  const pendingCount = rows.filter((item) => item.status === "requested").length;
  const disputeCount = rows.filter((item) => item.status === "disputed").length;

  return (
    <div className="review-table-stack">
      <div className="review-toolbar">
        <strong>{pendingCount} 笔退款待审核 · {disputeCount} 笔争议</strong>
        <span>同意后请在线下完成打款，并上传退款凭证留档。</span>
      </div>
      {notice && <p className="inline-notice">{notice}</p>}
      {rows.length === 0 ? (
        <div className="empty-state">暂无退款申请。</div>
      ) : (
        <div className="data-table compact">
          <div className="table-row header">
            <span>订单</span><span>申请</span><span>状态</span><span>原因</span><span>处理</span>
          </div>
          {rows.map((refundRequest) => {
            const isBusy = busyId === refundRequest.id;
            const canReview = refundRequest.status === "requested";
            const canUploadProof = refundRequest.status === "approved" && !refundRequest.proofPath;
            const canResolveDispute = refundRequest.status === "disputed";

            return (
              <div className="table-row" key={refundRequest.id}>
                <span>
                  <strong>{refundRequest.orderNumber}</strong>
                  <small>{refundRequest.participantName} · {refundRequest.quantity} 人</small>
                </span>
                <span>
                  ¥{refundRequest.requestedAmount}
                  <small>订单 ¥{refundRequest.orderAmount}</small>
                </span>
                <span className="status-badge neutral">{statusLabel(refundRequest.status)}</span>
                <span>{refundRequest.reason}</span>
                <span className="review-actions">
                  {canReview && (
                    <>
                      <button className="mini-action approve" disabled={isBusy} type="button" onClick={() => void reviewRefund(refundRequest, "APPROVED")}>
                        <Check size={14} />同意
                      </button>
                      <button className="mini-action reject" disabled={isBusy} type="button" onClick={() => void reviewRefund(refundRequest, "REJECTED")}>
                        <X size={14} />拒绝
                      </button>
                    </>
                  )}
                  {canUploadProof && (
                    <>
                      <label className={`mini-action approve ${isBusy ? "disabled" : ""}`}>
                        <Upload size={14} />上传凭证
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          disabled={isBusy}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";

                            if (file) {
                              void uploadRefundProof(refundRequest, file);
                            }
                          }}
                        />
                      </label>
                      {isNativePlatform() && (
                        <button
                          className="mini-action approve"
                          disabled={isBusy || nativePickingId === refundRequest.id}
                          type="button"
                          onClick={() => void pickAndUploadNativeProof(refundRequest)}
                        >
                          <Upload size={14} />
                          {nativePickingId === refundRequest.id ? "读取中" : "相机/相册"}
                        </button>
                      )}
                    </>
                  )}
                  {canResolveDispute && (
                    <>
                      <button className="mini-action approve" disabled={isBusy} type="button" onClick={() => void resolveDispute(refundRequest, "CONFIRM_REFUNDED")}>
                        <Check size={14} />确认解决
                      </button>
                      <button className="mini-action reject" disabled={isBusy} type="button" onClick={() => void resolveDispute(refundRequest, "REOPEN_PROOF")}>
                        <RefreshCcw size={14} />重新打款
                      </button>
                    </>
                  )}
                  {refundRequest.proofPath && <small>{refundRequest.proofPath}</small>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
