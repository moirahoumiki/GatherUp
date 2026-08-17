"use client";

import { useEffect, useMemo, useState } from "react";
import { AtSign, BadgeCheck } from "lucide-react";

import {
  ID_COOKIE,
  PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY,
  PUBLIC_ID_STORAGE_KEY,
  getAuthSession,
  maxPublicIdChanges,
  normalizePublicId,
  publicIdPattern,
  type AuthSession
} from "@/lib/auth";
import { getCurrentSupabaseProfile, updateCurrentSupabaseProfile } from "@/lib/supabase/profile";

function getStoredChangeCount() {
  const storedValue = window.localStorage.getItem(PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY);
  const parsedValue = Number(storedValue ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function AccountPanel() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("GatherUp 用户");
  const [publicId, setPublicId] = useState("GU-USER");
  const [draftPublicId, setDraftPublicId] = useState("GU-USER");
  const [changeCount, setChangeCount] = useState(0);
  const [message, setMessage] = useState("");
  const [sessionType, setSessionType] = useState<AuthSession["sessionType"]>("demo");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const session = getAuthSession(document.cookie);

    if (!session) {
      return;
    }

    const storedPublicId = window.localStorage.getItem(PUBLIC_ID_STORAGE_KEY) || session.gatherUpId;
    const storedChangeCount = getStoredChangeCount();

    setEmail(session.email);
    setName(session.name);
    setPublicId(storedPublicId);
    setDraftPublicId(storedPublicId);
    setChangeCount(storedChangeCount);

    if (session.sessionType === "supabase") {
      setSessionType("supabase");
      getCurrentSupabaseProfile().then((result) => {
        if (!result.ok) {
          setMessage(result.message);
          return;
        }

        setEmail(result.account.email);
        setName(result.account.name);
        setPublicId(result.account.gatherUpId);
        setDraftPublicId(result.account.gatherUpId);
        setChangeCount(result.profile.public_id_change_count);
      });
    }
  }, []);

  const remainingChanges = useMemo(() => {
    return Math.max(maxPublicIdChanges - changeCount, 0);
  }, [changeCount]);

  async function updatePublicId() {
    const normalizedId = normalizePublicId(draftPublicId);

    if (normalizedId === publicId) {
      setMessage("当前 GatherUp ID 没有变化。");
      return;
    }

    if (!publicIdPattern.test(normalizedId)) {
      setMessage("GatherUp ID 需要以 GU- 开头，只能包含大写字母、数字和短横线。");
      return;
    }

    if (remainingChanges <= 0) {
      setMessage("你的 GatherUp ID 修改次数已经用完。");
      return;
    }

    setIsSaving(true);

    if (sessionType === "supabase") {
      const result = await updateCurrentSupabaseProfile({
        publicId: normalizedId
      });

      if (!result.ok) {
        setMessage(result.message);
        setIsSaving(false);
        return;
      }

      const cookieOptions = "path=/; max-age=604800; SameSite=Lax";

      document.cookie = `${ID_COOKIE}=${encodeURIComponent(result.account.gatherUpId)}; ${cookieOptions}`;
      setName(result.account.name);
      setPublicId(result.account.gatherUpId);
      setDraftPublicId(result.account.gatherUpId);
      setChangeCount(result.profile.public_id_change_count);
      setMessage("GatherUp ID 已保存到数据库。");
      setIsSaving(false);
      return;
    }

    const nextChangeCount = changeCount + 1;
    const cookieOptions = "path=/; max-age=604800; SameSite=Lax";

    window.localStorage.setItem(PUBLIC_ID_STORAGE_KEY, normalizedId);
    window.localStorage.setItem(PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY, String(nextChangeCount));
    document.cookie = `${ID_COOKIE}=${encodeURIComponent(normalizedId)}; ${cookieOptions}`;

    setPublicId(normalizedId);
    setDraftPublicId(normalizedId);
    setChangeCount(nextChangeCount);
    setMessage("GatherUp ID 已更新。正式版会把这项记录保存到数据库。");
    setIsSaving(false);
  }

  async function deleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setMessage("请输入 DELETE 以确认删除。");
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        }
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "账号删除申请失败，请稍后再试。");
        setIsDeleting(false);
        return;
      }

      document.cookie = "gatherup_session=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "gatherup_user=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "gatherup_name=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "gatherup_id=; path=/; max-age=0; SameSite=Lax";
      setMessage(payload.message ?? "账号删除已提交。");
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } catch {
      setMessage("网络异常，暂时无法提交删除请求。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="account-grid">
      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">账号</p>
            <h2>{name}</h2>
          </div>
          <BadgeCheck size={22} />
        </div>

        <dl className="info-list">
          <div>
            <dt>登录邮箱</dt>
            <dd>{email || "miki@gatherup.local"}</dd>
          </div>
          <div>
            <dt>GatherUp ID</dt>
            <dd>{publicId}</dd>
          </div>
        </dl>
      </article>

      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">公开 ID</p>
            <h2>用于同行人填写和名单识别</h2>
          </div>
          <AtSign size={22} />
        </div>

        <div className="form-grid">
          <label>
            GatherUp ID
            <input value={draftPublicId} onChange={(event) => setDraftPublicId(event.target.value)} />
          </label>
        </div>

        {message && <p className="validation-note">{message}</p>}

        <div className="button-row">
          <button className="button primary" type="button" onClick={updatePublicId} disabled={isSaving}>
            {isSaving ? "保存中" : "保存"}
          </button>
          <span className="subtle">剩余修改 {remainingChanges} 次</span>
        </div>
      </article>

      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">账号安全</p>
            <h2>删除账号</h2>
          </div>
        </div>
        <p className="subtle">
          你可以申请删除账号。系统会先进行 30 天软删除保留期，之后执行永久清除。该操作会影响你的报名记录和组织者身份。
        </p>
        <div className="button-row">
          <button className="button danger" type="button" onClick={() => setDeleteConfirmOpen(true)}>
            删除账号
          </button>
        </div>
      </article>

      {deleteConfirmOpen ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="删除账号确认">
          <div className="confirm-card">
            <h3>确认删除账号</h3>
            <p className="subtle">
              为防止误操作，请输入 <strong>DELETE</strong> 并再次确认。提交后账号会进入 30 天保留期。
            </p>
            <label>
              确认文本
              <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
            </label>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
                取消
              </button>
              <button className="button danger" type="button" onClick={deleteAccount} disabled={isDeleting}>
                {isDeleting ? "提交中" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
