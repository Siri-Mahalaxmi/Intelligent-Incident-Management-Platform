/**
 * proxy.ts — Next.js 16 server-side proxy (formerly middleware.ts).
 *
 * Refreshes the Supabase session cookie and redirects unauthenticated
 * users to /login. Errors are caught so a bad env var never causes a
 * silent blank page — we fall through to the client-side auth guard.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing or still placeholder, skip — client guard handles it
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("<") ||
    supabaseAnonKey.includes("<")
  ) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isLoginPage = pathname === "/login";

    // Unauthenticated — redirect to /login
    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Already authenticated — redirect away from /login
    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } catch {
    // Supabase client error (bad key format, network issue, etc.)
    // Fall through — let the client-side auth guard in shell layout handle it
    const pathname = request.nextUrl.pathname;
    if (pathname !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
