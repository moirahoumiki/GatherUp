import { createPublicIdFromEmail, isValidEmail, isValidPassword, normalizeEmail, type AuthUser } from "@/lib/auth";
import { requestAppleIdentityToken } from "@/lib/mobile/apple-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createStablePublicId, ensureSupabaseProfile } from "@/lib/supabase/profile";

export type SupabaseAuthResult =
  | {
      ok: true;
      account: AuthUser;
      needsEmailConfirmation?: boolean;
      message?: string;
    }
  | {
      ok: false;
      message: string;
    };

export type SupabaseActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function unavailableResult(): SupabaseAuthResult {
  return {
    ok: false,
    message: "还没有配置 Supabase 环境变量，当前会继续使用本地原型账号。"
  };
}

function mapSupabaseError(message?: string) {
  if (!message) {
    return "账号服务暂时不可用，请稍后再试。";
  }

  if (message.includes("Invalid login credentials")) {
    return "邮箱或密码不正确，或这个邮箱还没有完成确认。请确认使用的是收到确认邮件的同一个邮箱。";
  }

  if (message.includes("Email not confirmed")) {
    return "这个邮箱还没有完成验证，请先打开邮件里的确认链接。";
  }

  if (message.includes("User already registered")) {
    return "这个邮箱已经注册，可以直接登录。";
  }

  if (message.includes("rate limit")) {
    return "邮箱发送太频繁，Supabase 暂时限制了邮件发送。请稍等一会儿再试，或先使用已经确认过的账号登录。";
  }

  if (message.includes("Load failed") || message.includes("Failed to fetch")) {
    return "连接 Supabase 失败。请检查网络，或稍后刷新页面重试。";
  }

  return message;
}

function accountFromSupabaseUser(email: string, metadata: Record<string, unknown> | null | undefined): AuthUser {
  const normalizedEmail = normalizeEmail(email);
  const metadataName = metadata?.name || metadata?.full_name || metadata?.display_name;
  const metadataGatherUpId = metadata?.gatherUpId || metadata?.gather_up_id;

  return {
    email: normalizedEmail,
    name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : "GatherUp 用户",
    gatherUpId:
      typeof metadataGatherUpId === "string" && metadataGatherUpId.trim()
        ? metadataGatherUpId.trim()
        : createPublicIdFromEmail(normalizedEmail)
  };
}

async function syncProfileFromAuthUser(input: {
  authUserId: string;
  email: string;
  metadata: Record<string, unknown> | null | undefined;
  provider?: "email" | "apple";
}): Promise<SupabaseAuthResult> {
  const metadataName = input.metadata?.name || input.metadata?.full_name || input.metadata?.display_name;
  const avatarUrl = input.metadata?.avatar_url || input.metadata?.picture;
  const profileResult = await ensureSupabaseProfile({
    authUserId: input.authUserId,
    email: input.email,
    name: typeof metadataName === "string" ? metadataName : "GatherUp 用户",
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
    provider: input.provider ?? "email"
  });

  if (!profileResult.ok) {
    return profileResult;
  }

  return {
    ok: true,
    account: profileResult.account
  };
}

function buildAppleDisplayName(givenName: string | null, familyName: string | null) {
  const parts = [givenName, familyName].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length > 0 ? parts.join(" ").trim() : null;
}

export async function signInWithApple(): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return unavailableResult();
  }

  const appleResult = await requestAppleIdentityToken();
  if (!appleResult.ok) {
    return {
      ok: false,
      message: appleResult.message
    };
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: appleResult.identityToken
  });

  if (error || !data.user) {
    return {
      ok: false,
      message: mapSupabaseError(error?.message)
    };
  }

  const rawUserMetadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const nextMetadata: Record<string, unknown> = {
    ...rawUserMetadata
  };
  const appleName = buildAppleDisplayName(appleResult.givenName, appleResult.familyName);
  if (!nextMetadata.name && appleName) {
    nextMetadata.name = appleName;
  }

  const userEmail = data.user.email ?? appleResult.email;
  if (!userEmail) {
    return {
      ok: false,
      message: "Apple 登录成功，但未获取到邮箱信息。请在 Apple 账号中允许共享邮箱后重试。"
    };
  }

  return syncProfileFromAuthUser({
    authUserId: data.user.id,
    email: userEmail,
    metadata: nextMetadata,
    provider: "apple"
  });
}

export async function signInWithSupabasePassword(email: string, password: string): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return unavailableResult();
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error || !data.user?.email) {
    return {
      ok: false,
      message: mapSupabaseError(error?.message)
    };
  }

  return syncProfileFromAuthUser({
    authUserId: data.user.id,
    email: data.user.email,
    metadata: data.user.user_metadata
  });
}

export async function signUpWithSupabasePassword(input: {
  email: string;
  password: string;
  name: string;
}): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return unavailableResult();
  }

  const normalizedEmail = normalizeEmail(input.email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。"
    };
  }

  if (!isValidPassword(input.password)) {
    return {
      ok: false,
      message: "密码至少需要 8 位。"
    };
  }

  const name = input.name.trim() || "GatherUp 用户";
  const metadataGatherUpId = createStablePublicId(normalizedEmail, crypto.randomUUID());
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        name,
        gatherUpId: metadataGatherUpId
      }
    }
  });

  if (error || !data.user) {
    return {
      ok: false,
      message: mapSupabaseError(error?.message)
    };
  }

  const userEmail = data.user.email ?? normalizedEmail;

  if (!data.session) {
    return {
      ok: true,
      account: accountFromSupabaseUser(userEmail, data.user.user_metadata),
      needsEmailConfirmation: true,
      message: "账号已创建，请先打开邮箱里的确认链接完成验证。"
    };
  }

  const profileResult = await syncProfileFromAuthUser({
    authUserId: data.user.id,
    email: userEmail,
    metadata: data.user.user_metadata
  });

  if (!profileResult.ok) {
    return profileResult;
  }

  return {
    ...profileResult,
    message: "账号已创建。"
  };
}

export async function sendSupabaseEmailCode(email: string): Promise<SupabaseActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "还没有配置 Supabase 环境变量，当前会继续使用本地原型验证码。"
    };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) {
    return {
      ok: false,
      message: mapSupabaseError(error.message)
    };
  }

  return {
    ok: true,
    message: "验证码或登录链接已发送，请查看邮箱。"
  };
}

export async function verifySupabaseEmailCode(email: string, token: string): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured()) {
    return unavailableResult();
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: "email"
  });

  if (error || !data.user?.email) {
    return {
      ok: false,
      message: mapSupabaseError(error?.message)
    };
  }

  return syncProfileFromAuthUser({
    authUserId: data.user.id,
    email: data.user.email,
    metadata: data.user.user_metadata
  });
}

export async function sendSupabasePasswordReset(email: string): Promise<SupabaseActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "还没有配置 Supabase 环境变量，当前会继续使用本地原型找回流程。"
    };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/login`;
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo
  });

  if (error) {
    return {
      ok: false,
      message: mapSupabaseError(error.message)
    };
  }

  return {
    ok: true,
    message: "找回邮件已发送，请查看邮箱。"
  };
}
