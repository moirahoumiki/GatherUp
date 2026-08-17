"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, LayoutDashboard, LogOut, MapPinned, Plus, UserRound } from "lucide-react";

import {
  createSessionCookies,
  createExpiredSessionCookies,
  demoAccounts,
  getAuthSession,
  getProfileOnboardingStorageKey,
  isPublicRoutePath,
  type AuthSession
} from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { initCapacitor } from "@/lib/mobile/capacitor-init";
import { disposeDeepLinkListener, initDeepLinkListener } from "@/lib/mobile/deep-link";
import { registerPushNotifications } from "@/lib/mobile/push";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getCurrentSupabaseProfile } from "@/lib/supabase/profile";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const isWorkspace = pathname.startsWith("/organizer") || pathname.startsWith("/admin") || pathname.startsWith("/dev");
  const shellClassName = `app-shell ${isWorkspace ? "workspace-shell" : "community-shell"}`;

  function navClassName(href: string) {
    const isActive = href === "/" ? pathname === href : pathname.startsWith(href);
    return isActive ? "active" : undefined;
  }

  useEffect(() => {
    void initCapacitor();
  }, []);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    function handleOnlineChange() {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);

    return () => {
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
    };
  }, []);

  useEffect(() => {
    initDeepLinkListener({
      onAppleOAuthCallback() {
        router.push("/login");
      },
      router
    });

    return () => {
      disposeDeepLinkListener();
    };
  }, [router]);

  useEffect(() => {
    void registerPushNotifications({
      onNavigate(route) {
        router.push(route);
      }
    });
  }, [router]);

  useEffect(() => {
    let isCancelled = false;
    const isPublicRoute = isPublicRoutePath(pathname);

    async function checkAuth() {
      setIsCheckingAuth(true);
      let currentSession = getAuthSession(document.cookie);

      if (!currentSession && isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        const userResult = await supabase.auth.getUser();

        if (!userResult.error && userResult.data.user) {
          const profileResult = await getCurrentSupabaseProfile();

          if (profileResult.ok) {
            createSessionCookies(profileResult.account, "supabase").forEach((cookie) => {
              document.cookie = cookie;
            });
            currentSession = {
              ...profileResult.account,
              sessionType: "supabase"
            };
          }
        }
      }

      if (isCancelled) {
        return;
      }

      setSession(currentSession);
      setIsCheckingAuth(false);

      if (!currentSession && !isPublicRoute) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }

      if (currentSession && pathname !== "/onboarding") {
        const isSeedDemoAccount = currentSession.email === demoAccounts[0].email;
        const hasCompletedProfile = window.localStorage.getItem(getProfileOnboardingStorageKey(currentSession.email)) === "done";

        if (!isSeedDemoAccount && !hasCompletedProfile) {
          router.replace("/onboarding");
        }
      }
    }

    checkAuth();

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isCheckingAuth) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">G</span>
            <div>
              <strong>GatherUp</strong>
              <span>正在确认登录状态。</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!session && isPublicRoutePath(pathname)) {
    return (
      <div className="app-shell community-shell">
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">G</span>
            <span>
              <strong>GatherUp</strong>
              <small>活动详情</small>
            </span>
          </Link>

          <div className="topbar-actions">
            <Link className="button secondary" href={`/login?next=${encodeURIComponent(pathname)}`}>
              登录
            </Link>
          </div>
        </header>

        <main className="page-shell">{children}</main>

        <footer className="app-footer">
          <span>© 2026 GatherUp</span>
          <nav aria-label="法律条款">
            <Link href="/terms">服务条款</Link>
            <Link href="/privacy">隐私政策</Link>
            <Link href="/support">支持与反馈</Link>
          </nav>
        </footer>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">G</span>
            <div>
              <strong>GatherUp</strong>
              <span>正在前往登录入口。</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  async function logout() {
    if (session?.sessionType === "supabase" && isSupabaseConfigured()) {
      await getSupabaseBrowserClient().auth.signOut();
    }

    createExpiredSessionCookies().forEach((cookie) => {
      document.cookie = cookie;
    });
    setSession(null);
    router.replace("/login");
  }

  return (
    <div className={shellClassName}>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>
            <strong>GatherUp</strong>
            <small>{isWorkspace ? "主办运营中心" : "让兴趣在线下发生"}</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          <Link className={navClassName("/")} href="/">活动广场</Link>
          <Link className={navClassName("/venues")} href="/venues">场地库</Link>
          <Link className={navClassName("/me")} href="/me">我的活动</Link>
          <Link className={navClassName("/organizer")} href="/organizer">工作台</Link>
        </nav>

        <div className="topbar-actions">
          <Link className="icon-button" href="/organizer/events/new" aria-label="创建活动">
            <Plus size={19} />
          </Link>
          <NotificationBell enabled={session.sessionType === "supabase"} />
          <span className="account-pill" title={`${session.email} · ${session.gatherUpId}`}>
            已登录
          </span>
          <Link className="avatar-button" href="/me" aria-label="个人中心">
            {session.name.slice(0, 1)}
          </Link>
          <button className="icon-button" type="button" aria-label="退出登录" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {isOffline && (
        <div className="network-status-banner" role="status" aria-live="polite">
          当前网络不可用，正在显示已加载内容；网络恢复后会自动刷新。
        </div>
      )}

      <main className="page-shell">{children}</main>

      <nav className="mobile-nav" aria-label="移动端导航">
        <Link className={navClassName("/")} href="/">
          <CalendarRange size={18} />
          广场
        </Link>
        <Link className={navClassName("/venues")} href="/venues">
          <MapPinned size={18} />
          场地
        </Link>
        <Link className={navClassName("/me")} href="/me">
          <UserRound size={18} />
          我的
        </Link>
        <Link className={navClassName("/organizer")} href="/organizer">
          <LayoutDashboard size={18} />
          工作台
        </Link>
      </nav>

      <footer className="app-footer">
        <span>© 2026 GatherUp</span>
        <nav aria-label="法律条款">
          <Link href="/terms">服务条款</Link>
          <Link href="/privacy">隐私政策</Link>
          <Link href="/support">支持与反馈</Link>
        </nav>
      </footer>
    </div>
  );
}
