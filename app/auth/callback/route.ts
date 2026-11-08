import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Landing point for email links (account upgrade and sign-in). Handles both PKCE (`code`) and
 * token-hash links, sets the session cookies, then sends the user on to a same-site path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/saved";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/saved";
  const supabase = await getServerSupabase();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const dest = new URL(safeNext, url.origin);
  if (!ok) dest.searchParams.set("auth", "failed");
  return NextResponse.redirect(dest);
}
