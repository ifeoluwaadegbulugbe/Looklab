"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { PENDING_SAVE_KEY } from "@/lib/auth";

export interface SavedLook {
  id: string;
  productId: string | null;
  productTitle: string;
  productImageUrl: string;
  createdAt: string;
  imageUrl: string | null; // short-lived signed URL to the private file
  productSlug: string | null;
}

export const SAVED_LOOKS_EVENT = "looklab:saved-looks";

/** Saved looks for the signed-in account (RLS: own rows; storage policy: own folder only). */
export function useSavedLooks() {
  const [looks, setLooks] = useState<SavedLook[] | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const load = useCallback(async () => {
    const sb = getBrowserSupabase();
    const { data: u } = await sb.auth.getUser();
    if (!u.user || u.user.is_anonymous) { setIsGuest(true); return setLooks([]); }
    setIsGuest(false);
    const { data } = await sb.from("saved_looks")
      .select("id,product_id,product_title,product_image_url,storage_path,created_at,product:products(slug)")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as {
      id: string; product_id: string | null; product_title: string; product_image_url: string;
      storage_path: string; created_at: string; product: { slug: string } | null;
    }[];
    const signed = rows.length
      ? (await sb.storage.from("saved-looks").createSignedUrls(rows.map((r) => r.storage_path), 60 * 60)).data ?? []
      : [];
    const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));
    setLooks(rows.map((r) => ({
      id: r.id, productId: r.product_id, productTitle: r.product_title, productImageUrl: r.product_image_url,
      createdAt: r.created_at, imageUrl: urlFor.get(r.storage_path) ?? null, productSlug: r.product?.slug ?? null,
    })));
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- initial fetch
    const on = () => void load();
    window.addEventListener(SAVED_LOOKS_EVENT, on);
    const { data: sub } = getBrowserSupabase().auth.onAuthStateChange(() => void load());
    return () => { window.removeEventListener(SAVED_LOOKS_EVENT, on); sub.subscription.unsubscribe(); };
  }, [load]);

  return { looks, isGuest, reload: load };
}

export async function saveLookRequest(sessionId: string): Promise<{ ok: true } | { ok: false; code?: string; message: string }> {
  const res = await fetch("/api/looks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(() => null);
  if (res?.ok) {
    window.dispatchEvent(new Event(SAVED_LOOKS_EVENT));
    return { ok: true };
  }
  const body = (await res?.json().catch(() => null)) as { code?: string; message?: string } | null;
  return { ok: false, code: body?.code, message: body?.message ?? "We couldn't save this look. Please try again." };
}

/** After the email link lands the user back, finish the save they started as a guest. */
let pendingRun: Promise<string | null> | null = null;

export function completePendingSave(): Promise<string | null> {
  // Single flight: effects can run twice (dev Strict Mode, several components); save once.
  pendingRun ??= (async () => {
    let pending: string | null = null;
    try { pending = localStorage.getItem(PENDING_SAVE_KEY); } catch {}
    if (!pending) return null;
    const sb = getBrowserSupabase();
    const { data: u } = await sb.auth.getUser();
    if (!u.user || u.user.is_anonymous) return null;
    try { localStorage.removeItem(PENDING_SAVE_KEY); } catch {} // claim it before the request
    const r = await saveLookRequest(pending);
    return r.ok ? "Your look is saved." : r.message;
  })().finally(() => { pendingRun = null; });
  return pendingRun;
}
