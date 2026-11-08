"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PENDING_SAVE_KEY } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { EmailLinkDialog, type EmailLinkDialogHandle } from "@/components/auth/EmailLinkDialog";
import { saveLookRequest } from "@/components/looks/useSavedLooks";

/**
 * Saves a finished try-on. Guests are asked for their email first (their anonymous account is
 * upgraded in place); the save completes when they come back from the email link.
 */
export function SaveLookButton({ sessionId, className = "" }: { sessionId: string; className?: string }) {
  const dialog = useRef<EmailLinkDialogHandle>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onClick() {
    const { data } = await getBrowserSupabase().auth.getUser();
    if (!data.user || data.user.is_anonymous) {
      try { localStorage.setItem(PENDING_SAVE_KEY, sessionId); } catch {}
      dialog.current?.open();
      return;
    }
    setState("saving");
    const r = await saveLookRequest(sessionId);
    if (r.ok) setState("saved");
    else { setState("error"); setMessage(r.message); }
  }

  return (
    <>
      {state === "saved" ? (
        <Link href="/saved?tab=looks" className={`inline-flex min-h-12 items-center justify-center gap-1 rounded-full bg-secondary px-6 font-semibold text-white ${className}`}>
          Saved ✓ View
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={state === "saving"}
          className={`inline-flex min-h-12 items-center justify-center rounded-full border-2 border-ink px-6 font-semibold transition hover:bg-ink hover:text-white disabled:opacity-50 ${className}`}
        >
          {state === "saving" ? "Saving…" : "Save look"}
        </button>
      )}
      {state === "error" && <p role="alert" className="mt-2 text-sm">{message}</p>}
      <EmailLinkDialog
        ref={dialog}
        title="Save your look"
        intro="Add your email to keep this look after the 24-hour preview expires. We'll send you a sign-in link and save it as soon as you're back."
        next="/saved?tab=looks"
      />
    </>
  );
}
