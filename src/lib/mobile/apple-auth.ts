import { SignInWithApple, type SignInWithAppleResponse } from "@capacitor-community/apple-sign-in";
import { isNativePlatform } from "@/lib/mobile/env";

export type AppleIdentityPayload =
  | {
      ok: true;
      identityToken: string;
      givenName: string | null;
      familyName: string | null;
      email: string | null;
    }
  | {
      ok: false;
      message: string;
      canceled?: boolean;
    };

function mapAppleErrorMessage(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");

  if (!message) {
    return "Apple 登录暂时不可用，请稍后重试。";
  }

  if (/canceled|cancelled|popup_closed_by_user|user cancel/i.test(message)) {
    return "已取消 Apple 登录。";
  }

  return message;
}

export async function requestAppleIdentityToken(): Promise<AppleIdentityPayload> {
  try {
    const response: SignInWithAppleResponse = await SignInWithApple.authorize(
      isNativePlatform()
        ? undefined
        : {
            clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "",
            redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? "",
            scopes: "email name"
          }
    );

    const payload = response.response;
    if (!payload?.identityToken) {
      return {
        ok: false,
        message: "Apple 登录未返回有效身份令牌，请重试。"
      };
    }

    return {
      ok: true,
      identityToken: payload.identityToken,
      givenName: payload.givenName ?? null,
      familyName: payload.familyName ?? null,
      email: payload.email ?? null
    };
  } catch (error) {
    const message = mapAppleErrorMessage(error);
    return {
      ok: false,
      message,
      canceled: message.includes("已取消")
    };
  }
}