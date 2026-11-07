"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Browser Supabase client (publishable key). Session is kept in cookies so route handlers can read it. */
export function getBrowserSupabase(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}

/**
 * Makes sure there is a user before a try-on. Creates an invisible anonymous user on first use,
 * so quotas, RLS and the Fitting Room work without a sign-up step.
 */
export async function ensureUser(): Promise<void> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error("We couldn't start your session. Please refresh and try again.");
}
