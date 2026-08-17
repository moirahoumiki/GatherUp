export type AuthProvider = "email" | "google" | "apple" | "phone" | "wechat" | "line" | "kakao";

export type AuthUser = {
  email: string;
  name: string;
  gatherUpId: string;
};

export type AuthSession = AuthUser & {
  sessionType: "demo" | "supabase";
};

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  gatherUpId: string;
  description: string;
};

export type AuthProviderOption = {
  provider: AuthProvider;
  label: string;
  description: string;
  availability: "ready" | "planned";
};

export type PasswordSignInResult =
  | {
      ok: true;
      account: DemoAccount | PrototypeAccount;
    }
  | {
      ok: false;
      message: string;
    };

export type PrototypeAccountResult =
  | {
      ok: true;
      account: PrototypeAccount;
    }
  | {
      ok: false;
      message: string;
    };

export type PrototypeAccount = DemoAccount & {
  createdAt: string;
  emailVerified: boolean;
};

export type PrototypeAccountInput = {
  email: string;
  password: string;
  name: string;
};

export const authProviderOptions: AuthProviderOption[] = [
  {
    provider: "email",
    label: "邮箱",
    description: "全球账号底座",
    availability: "ready"
  },
  {
    provider: "google",
    label: "Google / Apple",
    description: "全球快捷登录",
    availability: "planned"
  },
  {
    provider: "wechat",
    label: "微信 / 手机号",
    description: "地区化增强",
    availability: "planned"
  }
];

export const authStrategyNotes = [
  "邮箱账号可以跨国家、跨设备、跨平台找回。",
  "Google、Apple、微信等只是登录方式，都会绑定到同一个 GatherUp 用户。",
  "活动、订单、付款截图和管理权限都绑定到稳定的用户 ID。"
];

export const PUBLIC_ID_STORAGE_KEY = "gatherup_public_id";
export const PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY = "gatherup_id_change_count";
export const PROTOTYPE_ACCOUNTS_STORAGE_KEY = "gatherup_prototype_accounts";
export const PROFILE_ONBOARDING_STORAGE_KEY = "gatherup_profile_onboarded";

export const maxPublicIdChanges = 2;

export const publicIdPattern = /^GU-[A-Z0-9-]{3,18}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPrototypeAuthEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

export function normalizePublicId(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return emailPattern.test(normalizeEmail(value));
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function createPublicIdFromEmail(email: string) {
  const prefix = normalizeEmail(email)
    .split("@")[0]
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 10)
    .toUpperCase();

  return `GU-${prefix || "USER"}`;
}

export function getProfileOnboardingStorageKey(email: string) {
  return `${PROFILE_ONBOARDING_STORAGE_KEY}:${normalizeEmail(email)}`;
}

export const SESSION_COOKIE = "gatherup_session";
export const USER_COOKIE = "gatherup_user";
export const NAME_COOKIE = "gatherup_name";
export const ID_COOKIE = "gatherup_id";

export function getSafeInternalPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
    return fallback;
  }

  return value;
}

export function isPublicRoutePath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/support" ||
    /^\/events\/[^/]+\/?$/.test(pathname)
  );
}

export const demoAccounts: DemoAccount[] = [
  {
    email: "miki@gatherup.local",
    password: "gatherup123",
    name: "比奇堡miki",
    gatherUpId: "GU-MIKI",
    description: "同一个账号可参与活动、查看订单，也可以创建和管理自己的活动。"
  }
];

export function findDemoAccount(email: string) {
  return demoAccounts.find((account) => normalizeEmail(account.email) === normalizeEmail(email));
}

export function parsePrototypeAccounts(storageValue: string | null) {
  if (!storageValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storageValue);
    return Array.isArray(parsedValue) ? (parsedValue as PrototypeAccount[]) : [];
  } catch {
    return [];
  }
}

export function stringifyPrototypeAccounts(accounts: PrototypeAccount[]) {
  return JSON.stringify(accounts);
}

export function findPrototypeAccount(email: string, accounts: PrototypeAccount[]) {
  return accounts.find((account) => normalizeEmail(account.email) === normalizeEmail(email));
}

export function createPrototypeAccount(input: PrototypeAccountInput, accounts: PrototypeAccount[]): PrototypeAccountResult {
  const normalizedEmail = normalizeEmail(input.email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      message: "请输入有效邮箱。正式版会向这个邮箱发送验证码。"
    };
  }

  if (!isValidPassword(input.password)) {
    return {
      ok: false,
      message: "密码至少需要 8 位。正式版会支持验证码登录和忘记密码。"
    };
  }

  if (findDemoAccount(normalizedEmail) || findPrototypeAccount(normalizedEmail, accounts)) {
    return {
      ok: false,
      message: "这个邮箱已经注册，可以直接登录。"
    };
  }

  return {
    ok: true,
    account: {
      email: normalizedEmail,
      password: input.password,
      name: input.name.trim() || "GatherUp 用户",
      gatherUpId: createPublicIdFromEmail(normalizedEmail),
      description: "本地原型账号。正式版会保存到数据库，并绑定邮箱验证状态。",
      createdAt: new Date().toISOString(),
      emailVerified: true
    }
  };
}

function readCookieValue(source: string, name: string) {
  const pair = source
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!pair) {
    return "";
  }

  return decodeURIComponent(pair.slice(name.length + 1));
}

export function getAuthSession(cookieSource: string): AuthSession | null {
  const sessionCookie = readCookieValue(cookieSource, SESSION_COOKIE);
  const hasSession = Boolean(sessionCookie);

  if (!hasSession) {
    return null;
  }

  const email = readCookieValue(cookieSource, USER_COOKIE);
  const account = email ? findDemoAccount(email) : undefined;

  return {
    email,
    name: readCookieValue(cookieSource, NAME_COOKIE) || account?.name || "GatherUp 用户",
    gatherUpId: readCookieValue(cookieSource, ID_COOKIE) || account?.gatherUpId || "GU-USER",
    sessionType: sessionCookie === "supabase-session" ? "supabase" : "demo"
  };
}

export function signInWithPassword(
  email: string,
  password: string,
  prototypeAccounts: PrototypeAccount[] = []
): PasswordSignInResult {
  const matchedAccount = findPrototypeAccount(email, prototypeAccounts) || findDemoAccount(email);

  if (!matchedAccount || password !== matchedAccount.password) {
    return {
      ok: false,
      message: "账号或密码不正确。你可以先使用下方演示账号。"
    };
  }

  return {
    ok: true,
    account: matchedAccount
  };
}

export const signInWithDemoPassword = signInWithPassword;

export function createSessionCookies(account: AuthUser, sessionType: AuthSession["sessionType"] = "demo") {
  const maxAge = 60 * 60 * 24 * 7;
  const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax`;

  return [
    `${SESSION_COOKIE}=${sessionType}-session; ${cookieOptions}`,
    `${USER_COOKIE}=${encodeURIComponent(account.email)}; ${cookieOptions}`,
    `${NAME_COOKIE}=${encodeURIComponent(account.name)}; ${cookieOptions}`,
    `${ID_COOKIE}=${encodeURIComponent(account.gatherUpId)}; ${cookieOptions}`
  ];
}

export function createExpiredSessionCookies() {
  const cookieOptions = "path=/; max-age=0; SameSite=Lax";

  return [SESSION_COOKIE, USER_COOKIE, NAME_COOKIE, ID_COOKIE, "gatherup_role"].map(
    (cookieName) => `${cookieName}=; ${cookieOptions}`
  );
}
