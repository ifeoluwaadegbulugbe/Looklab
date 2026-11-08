"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export const PENDING_SAVE_KEY = "looklab.pendingSave";

const callbackUrl = (next: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

/**
 * Sends an email link. An anonymous user is upgraded in place (same id, so the Fitting Room comes
 * along). With no session, or if the email already has an account, it signs in to that account.
 */
export async function sendEmailLink(email: string, next = "/saved"): Promise<{ mode: "upgrade" | "signin" | "done" }> {
  const sb = getBrowserSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user?.is_anonymous) {
    const { data: upd, error } = await sb.auth.updateUser({ email }, { emailRedirectTo: callbackUrl(next) });
    // If the project doesn't require email confirmation, the upgrade applies immediately (no email is sent).
    if (!error && upd.user?.email?.toLowerCase() === email.toLowerCase()) {
      await sb.auth.refreshSession();
      return { mode: "done" };
    }
    if (!error) return { mode: "upgrade" };
    // Email already belongs to an account: fall through to signing in to it instead.
    if (!/already|registered|exists/i.test(error.message)) throw friendly(error.message);
  }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true } });
  if (error) throw friendly(error.message);
  return { mode: "signin" };
}

function friendly(message: string) {
  if (/rate|too many|security purposes/i.test(message)) {
    return new Error("We've hit our email limit for the moment. Please try again in a little while. Your Fitting Room looks are still here.");
  }
  if (/invalid/i.test(message)) return new Error("That email address doesn't look right.");
  return new Error("We couldn't send the email. Please try again.");
}

/** Current user, kept in sync with auth changes. `undefined` while loading. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const sb = getBrowserSupabase();
    void sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}
