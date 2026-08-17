"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  PROTOTYPE_ACCOUNTS_STORAGE_KEY,
  createPrototypeAccount,
  createSessionCookies,
  demoAccounts,
  getProfileOnboardingStorageKey,
  getAuthSession,
  getSafeInternalPath,
  isPrototypeAuthEnabled,
  normalizeEmail,
  parsePrototypeAccounts,
  signInWithPassword,
  stringifyPrototypeAccounts
} from "@/lib/auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  sendSupabaseEmailCode,
  sendSupabasePasswordReset,
  signInWithApple,
  signInWithSupabasePassword,
  signUpWithSupabasePassword,
  verifySupabaseEmailCode
} from "@/lib/supabase/auth";
import { getCurrentSupabaseProfile } from "@/lib/supabase/profile";
import { isNativePlatform } from "@/lib/mobile/env";

type AuthMode = "login" | "register" | "code" | "reset";

const authModeCopy: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: "登录 GatherUp",
    description: "一个账号，完成参与和组织。"
  },
  register: {
    title: "创建账号",
    description: "注册后会生成你的 GatherUp ID。"
  },
  code: {
    title: "验证码登录",
    description: "通过邮箱验证码快捷登录。"
  },
  reset: {
    title: "找回账号",
    description: "通过邮箱验证后重设密码。"
  }
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GatherUp</strong>
            <span>正在准备登录入口。</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeInternalPath(searchParams.get("next"));
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  const supabaseEnabled = isSupabaseConfigured();
  const prototypeAuthAllowed = isPrototypeAuthEnabled();
  const authUnavailable = !supabaseEnabled && !prototypeAuthAllowed;
  const showAppleButton = supabaseEnabled && isNativePlatform();

  useEffect(() => {
    async function redirectExistingSession() {
      const existingSession = getAuthSession(document.cookie);

      if (existingSession) {
        router.replace(nextPath);
        return;
      }

      if (!supabaseEnabled) {
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const userResult = await supabase.auth.getUser();

      if (userResult.error || !userResult.data.user) {
        return;
      }

      const profileResult = await getCurrentSupabaseProfile();

      if (!profileResult.ok) {
        return;
      }

      createSessionCookies(profileResult.account, "supabase").forEach((cookie) => {
        document.cookie = cookie;
      });
      router.replace(nextPath);
    }

    redirectExistingSession();
  }, [nextPath, router, supabaseEnabled]);

  const currentCopy = authModeCopy[mode];

  function completeLogin(
    account: { email: string; name: string; gatherUpId: string },
    destination = nextPath,
    sessionType: "demo" | "supabase" = "demo"
  ) {
    createSessionCookies(account, sessionType).forEach((cookie) => {
      document.cookie = cookie;
    });
    router.replace(getSafeInternalPath(destination));
  }

  async function login() {
    if (supabaseEnabled) {
      const result = await signInWithSupabasePassword(email, password);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      completeLogin(result.account, nextPath, "supabase");
      return;
    }

    if (!prototypeAuthAllowed) {
      setMessage("账号服务暂时不可用，请联系管理员配置 Supabase。");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const result = signInWithPassword(email, password, prototypeAccounts);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (result.account.email === demoAccounts[0].email) {
      window.localStorage.setItem(getProfileOnboardingStorageKey(result.account.email), "done");
    }
    completeLogin(result.account);
  }

  async function register() {
    if (supabaseEnabled) {
      const result = await signUpWithSupabasePassword({ email, password, name });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (result.needsEmailConfirmation) {
        setMessage(result.message ?? "账号已创建，请先完成邮箱验证。");
        return;
      }

      completeLogin(result.account, "/onboarding", "supabase");
      return;
    }

    if (!prototypeAuthAllowed) {
      setMessage("账号服务暂时不可用，请联系管理员配置 Supabase。");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const result = createPrototypeAccount({ email, password, name }, prototypeAccounts);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    window.localStorage.setItem(
      PROTOTYPE_ACCOUNTS_STORAGE_KEY,
      stringifyPrototypeAccounts([...prototypeAccounts, result.account])
    );
    completeLogin(result.account, "/onboarding");
  }

  async function sendCode() {
    if (!email.trim()) {
      setMessage("请输入邮箱，正式版会向这里发送验证码。");
      return;
    }

    if (supabaseEnabled) {
      const result = await sendSupabaseEmailCode(email);
      setMessage(result.message);
      return;
    }

    if (!prototypeAuthAllowed) {
      setMessage("账号服务暂时不可用，请联系管理员配置 Supabase。");
      return;
    }

    setVerificationCode("123456");
    setMessage("原型验证码已生成：123456。正式版会通过邮箱服务发送。");
  }

  async function loginWithCode() {
    if (supabaseEnabled) {
      const result = await verifySupabaseEmailCode(email, verificationCode);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      completeLogin(result.account, nextPath, "supabase");
      return;
    }

    if (!prototypeAuthAllowed) {
      setMessage("账号服务暂时不可用，请联系管理员配置 Supabase。");
      return;
    }

    if (verificationCode !== "123456") {
      setMessage("请输入原型验证码 123456。正式版会校验邮件里的验证码。");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const normalizedEmail = normalizeEmail(email);
    const matchedAccount =
      prototypeAccounts.find((account) => normalizeEmail(account.email) === normalizedEmail) ||
      demoAccounts.find((account) => normalizeEmail(account.email) === normalizedEmail);

    if (!matchedAccount) {
      setMessage("当前原型需要先注册账号，正式版可以选择验证码注册或登录。");
      return;
    }

    completeLogin(matchedAccount);
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage("请输入需要找回的邮箱。");
      return;
    }

    if (supabaseEnabled) {
      const result = await sendSupabasePasswordReset(email);
      setMessage(result.message);
      return;
    }

    if (!prototypeAuthAllowed) {
      setMessage("账号服务暂时不可用，请联系管理员配置 Supabase。");
      return;
    }

    setMessage("已模拟发送找回邮件。正式版会通过验证链接或验证码重设密码。");
  }

  async function submitPrimaryAction() {
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register();
        return;
      }

      if (mode === "code") {
        await loginWithCode();
        return;
      }

      if (mode === "reset") {
        await resetPassword();
        return;
      }

      await login();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAppleAction() {
    setMessage("");
    setIsAppleSubmitting(true);

    try {
      const result = await signInWithApple();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      completeLogin(result.account, nextPath, "supabase");
    } finally {
      setIsAppleSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GatherUp</strong>
            <span>让兴趣在线下发生</span>
          </div>
        </div>

        <div>
          <h1>{currentCopy.title}</h1>
          <p className="subtle">{currentCopy.description}</p>
        </div>

        <div className="auth-tabs" aria-label="账号操作">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            登录
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            注册
          </button>
          <button className={mode === "code" ? "active" : ""} type="button" onClick={() => setMode("code")}>
            验证码
          </button>
          <button className={mode === "reset" ? "active" : ""} type="button" onClick={() => setMode("reset")}>
            找回
          </button>
        </div>

        <div className="form-grid">
          {mode === "register" && (
            <label>
              昵称
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：比奇堡miki" />
            </label>
          )}
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {(mode === "login" || mode === "register") && (
            <label>
              密码
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          {mode === "code" && (
            <label>
              验证码
              <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="原型验证码 123456" />
            </label>
          )}
        </div>

        {message && <p className="validation-note">{message}</p>}
        {authUnavailable && <p className="validation-note">账号服务暂时不可用，请联系管理员配置 Supabase。</p>}

        <div className="auth-action-grid">
          {showAppleButton && (
            <button
              className="button apple-signin full"
              type="button"
              onClick={submitAppleAction}
              disabled={isSubmitting || isAppleSubmitting || authUnavailable}
            >
              <span aria-hidden="true" className="apple-signin-logo">
                
              </span>
              {isAppleSubmitting ? "Apple 登录中…" : "Sign in with Apple"}
            </button>
          )}
          {mode === "code" && (
            <button className="button secondary full" type="button" onClick={sendCode} disabled={isSubmitting || authUnavailable}>
              发送验证码
            </button>
          )}
          <button className="button primary full" type="button" onClick={submitPrimaryAction} disabled={isSubmitting || authUnavailable}>
            {isSubmitting ? "处理中" : mode === "register" ? "创建账号" : mode === "reset" ? "发送找回邮件" : "登录"}
          </button>
        </div>

        {!supabaseEnabled && !authUnavailable && (
          <p className="login-demo-hint">
            演示账号 {demoAccounts[0].email}，密码已预填，直接点击登录即可体验。
          </p>
        )}
      </section>

      <footer className="app-footer login-footer">
        <span>© 2026 GatherUp</span>
        <nav aria-label="法律条款">
          <Link href="/terms">服务条款</Link>
          <Link href="/privacy">隐私政策</Link>
        </nav>
      </footer>
    </main>
  );
}
