"use client";

import { useRef, useState } from "react";
import { useUser } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { buttonClass } from "@/components/ui/Button";
import { EmailLinkDialog, type EmailLinkDialogHandle } from "@/components/auth/EmailLinkDialog";

export function AccountCard() {
  const user = useUser();
  const dialog = useRef<EmailLinkDialogHandle>(null);
  const [signingOut, setSigningOut] = useState(false);

  if (user === undefined) return <div className="looklab-skeleton mt-6 h-28 rounded-card" />;

  const permanent = !!user && !user.is_anonymous;
  return (
    <section aria-labelledby="account" className="mt-6 rounded-card bg-lavender p-5">
      <h2 id="account" className="font-display text-xl font-bold">{permanent ? "Your account" : "Browsing as a guest"}</h2>
      {permanent ? (
        <>
          <p className="mt-1 text-sm">Signed in as <strong>{user.email}</strong>. Your saved looks are kept on your account.</p>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await getBrowserSupabase().auth.signOut();
              setSigningOut(false);
            }}
            className={buttonClass("secondary", "mt-4")}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm">
            No account needed to browse or try things on. Add your email to save looks for good, or sign in to see looks you saved before.
          </p>
          <button type="button" onClick={() => dialog.current?.open()} className={buttonClass("primary", "mt-4")}>
            Add email or sign in
          </button>
          <EmailLinkDialog ref={dialog} title="Sign in to LookLab" intro="We'll email you a link. No password needed. Your try-ons from this visit come with you." next="/me" />
        </>
      )}
    </section>
  );
}
