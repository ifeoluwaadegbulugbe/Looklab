"use client";

import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { buttonClass } from "@/components/ui/Button";

const LOCAL_KEYS = ["looklab.prefs", "looklab.onboarded"];
const SESSION_KEYS = ["looklab.photoExpiresAt", "looklab.activeTryOn"];

export function DeleteMyData() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirmDelete() {
    setState("busy");
    try {
      const res = await fetch("/api/me/delete", { method: "POST" });
      // 401 means there was never a user: nothing on our side to delete, just clear this browser.
      if (!res.ok && res.status !== 401) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "We couldn't delete your data just now. Please try again.");
      }
      await getBrowserSupabase().auth.signOut({ scope: "local" });
      for (const k of LOCAL_KEYS) try { localStorage.removeItem(k); } catch {}
      for (const k of SESSION_KEYS) try { sessionStorage.removeItem(k); } catch {}
      setState("done");
      setMessage("Done. Everything LookLab held about you has been deleted, and this browser has been reset.");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      dialogRef.current?.close();
    }
  }

  return (
    <section aria-labelledby="delete-data" className="mt-10 rounded-card border-2 border-secondary/30 bg-surface p-5">
      <h2 id="delete-data" className="font-display text-xl font-bold">Delete my data</h2>
      <p className="mt-1 text-sm opacity-80">
        Removes your try-on history, saved looks and their images, hearts, picks and your account from LookLab. This can&apos;t
        be undone. Clothsy AI deletes its copy of your uploaded photo within 35 days; we can&apos;t remove it sooner.
      </p>
      {message && (
        <p role={state === "error" ? "alert" : "status"} className="mt-3 rounded-2xl bg-lavender p-3 text-sm">{message}</p>
      )}
      <button type="button" onClick={() => dialogRef.current?.showModal()} disabled={state === "busy"} className={buttonClass("secondary", "mt-4")}>
        Delete my data
      </button>

      <dialog ref={dialogRef} aria-labelledby="delete-confirm" className="m-auto max-w-sm rounded-[28px] bg-white p-6 text-ink backdrop:bg-ink/60">
        <h3 id="delete-confirm" className="font-display text-xl font-bold">Delete everything?</h3>
        <p className="mt-2 text-sm">Your Fitting Room, saved looks, hearts and picks will be permanently deleted.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={confirmDelete} disabled={state === "busy"} className="min-h-12 rounded-full bg-secondary px-6 font-semibold text-white disabled:opacity-50">
            {state === "busy" ? "Deleting…" : "Yes, delete"}
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("ghost")}>Cancel</button>
        </div>
      </dialog>
    </section>
  );
}
