// Email links (password reset) land here with a one-time ?code=. We swap it
// for a login session, then open ?next= (a path on this site only).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const url = request.nextUrl.clone();
  url.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      url.pathname = next;
      return NextResponse.redirect(url);
    }
  }
  // Expired, already used, or opened in a different browser from the one that asked.
  url.pathname = "/login";
  url.searchParams.set("reason", "link");
  return NextResponse.redirect(url);
}
