"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ensureUser } from "@/lib/supabase/browser";
import { PhotoError, preparePhoto } from "@/lib/photo";
import { getLocalPhoto, setLocalPhoto } from "@/lib/local-photo";
import { notifyFittingRoom } from "@/components/fitting-room/useFittingRoom";
import { SaveLookButton } from "@/components/looks/SaveLookButton";
import type { StartTryOnResponse, TryOnErrorBody, TryOnErrorCode, TryOnStatusResponse } from "@/lib/tryon-types";

export interface TryOnProduct {
  id: string;
  title: string;
  imageUrl: string;
}

type Step =
  | { kind: "form"; notice?: string }
  | { kind: "generating"; sessionId: string }
  | { kind: "slow"; sessionId: string }
  | { kind: "result"; resultUrl: string; sessionId: string }
  | { kind: "error"; code: TryOnErrorCode; message: string };

const POLL_MS = 2500;
const GIVE_UP_MS = 3 * 60 * 1000;
const PHOTO_KEY = "looklab.photoExpiresAt";
const ACTIVE_KEY = "looklab.activeTryOn";
const STATUS_LINES = ["Reading your photo…", "Fitting the garment…", "Matching light and drape…", "Adding final details…"];
export const CONSENT_TEXT =
  "I'm 18 or over, this is a photo of me, and I agree to it being processed by Clothsy AI to create a virtual try-on.";


const storage = {
  get(key: string) {
    try { return sessionStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { sessionStorage.setItem(key, value); } catch {}
  },
  remove(key: string) {
    try { sessionStorage.removeItem(key); } catch {}
  },
};

function canReusePhoto() {
  const exp = Date.parse(storage.get(PHOTO_KEY) ?? "");
  return Number.isFinite(exp) && exp - Date.now() > 10 * 60 * 1000;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("aborted", "AbortError")); }, { once: true });
  });

export function TryOnSheet({
  product,
  outfitWith,
  triggerClassName,
  triggerLabel,
}: {
  product: TryOnProduct;
  /** Experimental outfit: a second (lower) piece tried on together with `product` for one credit. */
  outfitWith?: TryOnProduct;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const tryKey = outfitWith ? `${product.id}+${outfitWith.id}` : product.id;
  const displayTitle = outfitWith ? `${product.title} + ${outfitWith.title}` : product.title;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pollAbort = useRef<AbortController | null>(null);
  const ids = { title: useId(), file: useId(), consent: useId() };

  const [step, setStep] = useState<Step>({ kind: "form" });
  const [preview, setPreview] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<Blob | null>(null);
  const [reuse, setReuse] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusLine, setStatusLine] = useState(0);

  const poll = useCallback(async (sessionId: string) => {
    pollAbort.current?.abort();
    const ac = new AbortController();
    pollAbort.current = ac;
    setStep({ kind: "generating", sessionId });
    storage.set(ACTIVE_KEY, JSON.stringify({ sessionId, productId: tryKey }));
    const started = Date.now();
    try {
      while (!ac.signal.aborted) {
        let wait = POLL_MS;
        try {
          const res = await fetch(`/api/tryon?id=${encodeURIComponent(sessionId)}`, { cache: "no-store", signal: ac.signal });
          if (res.status === 429) {
            wait = Math.max(POLL_MS, Number(res.headers.get("Retry-After") ?? 5) * 1000);
          } else if (!res.ok) {
            const body = (await res.json().catch(() => null)) as TryOnErrorBody | null;
            if (res.status >= 500 || res.status === 503) wait = 5000; // transient: keep polling
            else {
              storage.remove(ACTIVE_KEY);
              setStep({ kind: "error", code: body?.code ?? "UNKNOWN", message: body?.message ?? "Something went wrong. Please try again." });
              return;
            }
          } else {
            const data = (await res.json()) as TryOnStatusResponse;
            if (data.status === "success" && data.resultUrl) {
              storage.remove(ACTIVE_KEY);
              setStep({ kind: "result", resultUrl: data.resultUrl, sessionId });
              notifyFittingRoom();
              return;
            }
            if (data.status === "failed") {
              storage.remove(ACTIVE_KEY);
              setStep({ kind: "error", code: data.code ?? "TRYON_FAILED", message: data.message ?? "This try-on didn't work out. Please try again." });
              return;
            }
          }
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          wait = 5000; // network blip: keep the job, try again
        }
        if (Date.now() - started > GIVE_UP_MS) {
          setStep({ kind: "slow", sessionId });
          return;
        }
        await sleep(wait, ac.signal);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") throw e;
    }
  }, [tryKey]);

  // Rotate status copy while generating.
  useEffect(() => {
    if (step.kind !== "generating") return;
    const t = setInterval(() => setStatusLine((i) => (i + 1) % STATUS_LINES.length), 3500);
    return () => clearInterval(t);
  }, [step.kind]);

  useEffect(() => () => pollAbort.current?.abort(), []);

  // Cards and the home strip link here with ?try=1 to open the sheet straight away.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("try") !== "1") return;
    url.searchParams.delete("try");
    window.history.replaceState(null, "", url.pathname + url.search);
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open() {
    // Fresh consent every time; offer the photo from earlier in this tab if its provider id is still valid.
    setConsent(false);
    const reusable = canReusePhoto();
    setReuse(reusable);
    setNewPhoto(null);
    setPreview(reusable ? getLocalPhoto()?.url ?? null : null);
    setStep({ kind: "form" });
    dialogRef.current?.showModal();
    // Recover a try-on that was running when the tab was closed or the sheet dismissed.
    try {
      const active = JSON.parse(storage.get(ACTIVE_KEY) ?? "null") as { sessionId: string; productId: string } | null;
      if (active?.productId === tryKey) void poll(active.sessionId);
    } catch {}
  }

  function close() {
    pollAbort.current?.abort(); // stops polling only; the job keeps running and can be recovered
    dialogRef.current?.close();
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await preparePhoto(file);
      if (newPhoto && preview) URL.revokeObjectURL(preview);
      setNewPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      setReuse(false);
      setStep({ kind: "form" });
    } catch (e) {
      setStep({ kind: "form", notice: e instanceof PhotoError ? e.message : "We couldn't use that photo." });
    }
  }

  function removePhoto() {
    if (newPhoto && preview) URL.revokeObjectURL(preview);
    setNewPhoto(null);
    setPreview(null);
    setReuse(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !consent || (!newPhoto && !reuse)) return;
    setSubmitting(true);
    const requestId = crypto.randomUUID(); // one per click, reused for retries of this click
    try {
      await ensureUser();
      const form = new FormData();
      form.append("productId", product.id);
      if (outfitWith) form.append("outfitWith", outfitWith.id);
      form.append("requestId", requestId);
      form.append("consent", "true");
      if (newPhoto) form.append("photo", newPhoto, "photo.jpg");

      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch("/api/tryon", { method: "POST", body: form });
          if (res.status !== 429) break;
          await new Promise((r) => setTimeout(r, Number(res!.headers.get("Retry-After") ?? 5) * 1000));
        } catch {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // same requestId: never charged twice
        }
      }
      if (!res) throw new Error("network");

      if (res.ok) {
        const data = (await res.json()) as StartTryOnResponse;
        storage.set(PHOTO_KEY, data.photoExpiresAt);
        if (newPhoto) {
          setLocalPhoto(newPhoto, preview!);
          setNewPhoto(null); // next try-on reuses the uploaded photo id instead of uploading again
          setReuse(true);
        }
        notifyFittingRoom();
        void poll(data.sessionId);
        return;
      }
      const body = (await res.json().catch(() => null)) as TryOnErrorBody | null;
      if (body?.code === "ALREADY_RUNNING" && body.sessionId) return void poll(body.sessionId);
      if (body?.code === "PHOTO_REQUIRED") {
        storage.remove(PHOTO_KEY);
        removePhoto();
        setStep({ kind: "form", notice: body.message });
        return;
      }
      setStep({ kind: "error", code: body?.code ?? "UNKNOWN", message: body?.message ?? "Something went wrong. Please try again." });
    } catch (err) {
      setStep({ kind: "error", code: "UNKNOWN", message: err instanceof Error && err.message !== "network" ? err.message : "We couldn't reach LookLab. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = consent && (!!newPhoto || reuse) && !submitting;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={triggerClassName ?? "min-h-12 rounded-full bg-[#6C2BFF] px-6 font-semibold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6C2BFF]"}
      >
        {triggerLabel ?? "Try it on"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={ids.title}
        onCancel={(e) => { e.preventDefault(); close(); }}
        className="m-0 mt-auto w-full max-w-none rounded-t-[28px] bg-white p-0 text-[#1A1325] backdrop:bg-[#1A1325]/60 sm:m-auto sm:max-w-lg sm:rounded-[28px]"
      >
        <div className="max-h-[90dvh] overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={ids.title} className="text-xl font-bold">{outfitWith ? "Try the outfit on" : "Try it on"}</h2>
              <p className="text-sm opacity-70">{displayTitle}</p>
              {outfitWith && (
                <p className="mt-1 inline-block -rotate-2 rounded-full bg-butter px-3 py-0.5 text-xs font-bold">Experimental: both pieces, 1 try-on. Tops may blend with what you&apos;re wearing.</p>
              )}
            </div>
            <button type="button" onClick={close} aria-label="Close" className="grid size-12 place-items-center rounded-full text-2xl hover:bg-black/5">×</button>
          </div>

          {step.kind === "form" && (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              {preview ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Your photo" className="h-32 w-24 rounded-2xl object-cover" />
                  <div className="flex flex-col gap-2 text-sm">
                    {reuse && <span>Using your photo from earlier.</span>}
                    <label htmlFor={ids.file} className="cursor-pointer font-semibold underline">Replace photo</label>
                    <button type="button" onClick={removePhoto} className="text-left underline">Remove</button>
                  </div>
                </div>
              ) : reuse ? (
                <p className="rounded-2xl bg-[#EDE4FF] p-4 text-sm">
                  We&apos;ll use the photo you added earlier.{" "}
                  <label htmlFor={ids.file} className="cursor-pointer font-semibold underline">Use a different photo</label>
                </p>
              ) : (
                <label htmlFor={ids.file} className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-[#6C2BFF]/40 bg-[#EDE4FF]/50 p-6 text-center">
                  <span className="font-semibold">Add a photo of you</span>
                  <span className="text-sm opacity-80">
                    One adult, full or half body, good light, facing the camera, plain background. Works best wearing a fitted top with trousers or a skirt. JPEG or PNG.
                  </span>
                </label>
              )}
              <input
                id={ids.file}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => { void onPickFile(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }}
              />

              {step.notice && <p role="alert" className="rounded-2xl bg-[#FF2E93]/10 p-3 text-sm">{step.notice}</p>}

              <label htmlFor={ids.consent} className="flex items-start gap-3 text-sm">
                <input id={ids.consent} type="checkbox" checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} className="mt-0.5 size-5 accent-[#6C2BFF]" />
                <span>{CONSENT_TEXT}</span>
              </label>
              <p className="text-xs opacity-70">
                Clothsy AI keeps uploaded photos for up to 35 days, then deletes them. LookLab never stores your photo.{" "}
                <a href="/privacy" className="underline">Privacy</a>
              </p>

              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-12 rounded-full bg-[#6C2BFF] px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Starting…" : "See it on me"}
              </button>
            </form>
          )}

          {(step.kind === "generating" || step.kind === "slow") && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-80 w-60 overflow-hidden rounded-3xl bg-[#EDE4FF]">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="size-full object-cover" />
                )}
                <div aria-hidden className="looklab-scan absolute inset-x-0 h-1 bg-[#6C2BFF] shadow-[0_0_24px_8px_rgba(108,43,255,0.5)]" />
              </div>
              <p role="status" aria-live="polite" className="font-semibold">
                {step.kind === "slow" ? "This one is taking a while. It's still working." : STATUS_LINES[statusLine]}
              </p>
              <p className="text-sm opacity-70">
                {step.kind === "slow" ? "You can check again now, or come back later. It won't be charged twice." : "Usually under 30 seconds."}
              </p>
              {step.kind === "slow" ? (
                <button type="button" onClick={() => void poll(step.sessionId)} className="min-h-12 rounded-full border-2 border-[#1A1325] px-6 font-semibold">Check again</button>
              ) : (
                <button type="button" onClick={close} className="min-h-12 rounded-full px-6 underline">Cancel</button>
              )}
            </div>
          )}

          {step.kind === "result" && (
            <figure className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.resultUrl} alt={`AI-generated preview of you wearing the ${outfitWith ? `outfit: ${displayTitle}` : product.title}`} className="looklab-reveal w-full" />
                <span className="absolute left-3 top-3 rounded-full bg-[#1A1325] px-3 py-1 text-xs font-semibold text-white">AI-generated try-on</span>
              </div>
              <figcaption className="text-sm opacity-80">
                AI-generated try-on. A preview, not a guarantee of fit, size or how the fabric behaves.{outfitWith ? " Outfit try-ons are experimental and may blend pieces." : ""}
              </figcaption>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => { setConsent(false); setReuse(canReusePhoto()); setStep({ kind: "form" }); }} className="min-h-12 rounded-full border-2 border-[#1A1325] px-6 font-semibold">Change photo</button>
                <button type="button" onClick={close} className="min-h-12 rounded-full bg-[#6C2BFF] px-6 font-semibold text-white">Keep browsing</button>
                <SaveLookButton sessionId={step.sessionId} />
                <a href="/fitting-room" className="inline-flex min-h-12 items-center rounded-full px-4 font-semibold underline">Compare in Fitting Room</a>
              </div>
            </figure>
          )}

          {step.kind === "error" && (
            <div className="flex flex-col gap-4">
              <p role="alert" className="rounded-2xl bg-[#FF2E93]/10 p-4">{step.message}</p>
              {step.code === "FITTING_ROOM_FULL" ? (
                <a href="/fitting-room/full" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#6C2BFF] px-6 font-semibold text-white">What can I do?</a>
              ) : step.code === "DAILY_LIMIT" || step.code === "GARMENT_REJECTED" || step.code === "PRODUCT_UNAVAILABLE" ? (
                <button type="button" onClick={close} className="min-h-12 rounded-full border-2 border-[#1A1325] px-6 font-semibold">Close</button>
              ) : (
                <button type="button" onClick={() => { setConsent(false); setReuse(canReusePhoto()); setStep({ kind: "form" }); }} className="min-h-12 rounded-full bg-[#6C2BFF] px-6 font-semibold text-white">Try again</button>
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
