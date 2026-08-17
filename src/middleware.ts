import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getSafeInternalPath, isPublicRoutePath } from "@/lib/auth";
import { type Database } from "@/lib/supabase/database.types";

function buildLoginUrl(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);

  return loginUrl;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname, searchParams } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured) {
    if (!isApiRoute && !isPublicRoutePath(pathname)) {
      return NextResponse.redirect(buildLoginUrl(request));
    }

    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        }
      }
    }
  );
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (isApiRoute) {
    return supabaseResponse;
  }

  if (!user && !isPublicRoutePath(pathname)) {
    return NextResponse.redirect(buildLoginUrl(request));
  }

  if (user && isLoginPage) {
    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = getSafeInternalPath(searchParams.get("next"));
    destinationUrl.search = "";

    return NextResponse.redirect(destinationUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
