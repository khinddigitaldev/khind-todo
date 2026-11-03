// Runs before every page request (see /proxy.ts). It refreshes the Supabase
// login cookie, sends signed-out visitors to /login, and sends signed-in
// visitors away from /login and /forgot-password. /auth/callback is open to both.
// Based on Supabase's official Next.js example — keep the order of steps.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

// Pages for signed-out visitors. Signed-in visitors are sent to the dashboard.
const SIGNED_OUT_PAGES = ["/login", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([header, value]) =>
          supabaseResponse.headers.set(header, value),
        );
      },
    },
  });

  // Don't add code between createServerClient and getClaims(): doing so can
  // cause users to be logged out at random.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");
  // If the reset link's address is not on Supabase's allowed list, Supabase sends
  // people to the home page instead; pass the code on to the callback.
  if (path === "/" && code) {
    return redirectKeepingCookies(request, "/auth/callback", supabaseResponse, { code, next: "/account/password" });
  }

  const signedOutPage = SIGNED_OUT_PAGES.some((p) => path.startsWith(p));
  if (!signedIn && !signedOutPage && !path.startsWith("/auth/callback")) {
    return redirectKeepingCookies(request, "/login", supabaseResponse);
  }
  if (signedIn && signedOutPage) {
    return redirectKeepingCookies(request, "/", supabaseResponse);
  }

  // Must return supabaseResponse as-is so the refreshed cookies reach the browser.
  return supabaseResponse;
}

// A redirect is a new response, so copy over any login cookies and cache
// headers Supabase just set — otherwise the browser loses the refreshed session.
function redirectKeepingCookies(request: NextRequest, pathname: string, from: NextResponse, params: Record<string, string> = {}) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) response.headers.set(header, value);
  }
  return response;
}
