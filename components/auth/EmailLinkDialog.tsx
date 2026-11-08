"use client";

import { forwardRef, useId, useImperativeHandle, useRef, useState } from "react";
import { sendEmailLink } from "@/lib/auth";
import { completePendingSave } from "@/components/looks/useSavedLooks";
import { buttonClass } from "@/components/ui/Button";

export interface EmailLinkDialogHandle {
  open: () => void;
}

/** Email magic-link dialog: upgrades an anonymous user (keeping their Fitting Room) or signs in. */
export const EmailLinkDialog = forwardRef<EmailLinkDialogHandle, { title: string; intro: string; next?: string }>(
  function EmailLinkDialog({ title, intro, next = "/saved" }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const ids = { title: useId(), email: useId() };
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"form" | "sending" | "sent" | "done">("form");
    const [doneMsg, setDoneMsg] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"upgrade" | "signin" | "done">("upgrade");

    useImperativeHandle(ref, () => ({
      open: () => {
        setState("form");
        setError(null);
        dialogRef.current?.showModal();
      },
    }));

    async function submit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
      setState("sending");
      try {
        const r = await sendEmailLink(email.trim(), next);
        setMode(r.mode);
        if (r.mode === "done") {
          const msg = await completePendingSave();
          setDoneMsg(msg ?? "Your account is ready.");
          setState("done");
        } else {
          setState("sent");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setState("form");
      }
    }

    return (
      <dialog ref={dialogRef} aria-labelledby={ids.title} className="m-0 mt-auto w-full max-w-none rounded-t-[28px] bg-white p-0 text-ink backdrop:bg-ink/60 sm:m-auto sm:max-w-md sm:rounded-[28px]">
        <div className="p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h2 id={ids.title} className="font-display text-2xl font-bold">{state === "sent" ? "Check your email" : state === "done" ? "You're all set" : title}</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="grid size-12 place-items-center rounded-full text-2xl hover:bg-black/5">×</button>
          </div>

          {state === "done" ? (
            <div role="status" className="flex flex-col gap-3">
              <p>{doneMsg} You&apos;re signed in as <strong>{email}</strong>.</p>
              <a href="/saved?tab=looks" className={buttonClass("primary")}>See my saved looks</a>
            </div>
          ) : state === "sent" ? (
            <div role="status" className="flex flex-col gap-3">
              <p>
                We sent a link to <strong>{email}</strong>. Open it on this device to{" "}
                {mode === "upgrade" ? "finish setting up your account. Your Fitting Room comes with you." : "sign in."}
              </p>
              {mode === "signin" && (
                <p className="text-sm opacity-80">
                  This email already has a LookLab account, so you&apos;ll sign in to that one. Try-ons from this visit stay
                  with this browser&apos;s guest session.
                </p>
              )}
              <p className="text-sm opacity-70">No email? Check spam, or wait a minute and try again.</p>
              <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("secondary")}>Done</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <p>{intro}</p>
              <label htmlFor={ids.email} className="text-sm font-semibold">Email</label>
              <input
                id={ids.email}
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                className="-mt-2 min-h-12 rounded-2xl border-2 border-ink/15 px-4 outline-none focus:border-ink"
              />
              {error && <p role="alert" className="rounded-2xl bg-secondary/10 p-3 text-sm">{error}</p>}
              <button type="submit" disabled={state === "sending"} className={buttonClass("primary")}>
                {state === "sending" ? "Sending…" : "Email me a link"}
              </button>
              <p className="text-xs opacity-70">No password. We only use your email to sign you in.</p>
            </form>
          )}
        </div>
      </dialog>
    );
  },
);
