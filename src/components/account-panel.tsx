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
    </section>
  );
}
