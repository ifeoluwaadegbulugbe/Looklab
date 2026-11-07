"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureUser, getBrowserSupabase } from "@/lib/supabase/browser";

const EVENT = "looklab:favourites";
let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

async function loadFavourites(): Promise<Set<string>> {
  const sb = getBrowserSupabase();
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return new Set();
  const { data } = await sb.from("favorites").select("product_id");
  return new Set((data ?? []).map((r) => r.product_id as string));
}

/** Favourite product ids for the current user (RLS: own rows only), shared across all hearts on a page. */
export function useFavourites() {
  const [ids, setIds] = useState<Set<string>>(cache ?? new Set());

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      inflight ??= loadFavourites().finally(() => { inflight = null; });
      void inflight.then((s) => { cache = s; if (alive) setIds(new Set(s)); });
    };
    if (!cache) refresh();
    const onChange = () => alive && setIds(new Set(cache ?? []));
    window.addEventListener(EVENT, onChange);
    const { data: sub } = getBrowserSupabase().auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") { cache = null; refresh(); }
    });
    return () => { alive = false; window.removeEventListener(EVENT, onChange); sub.subscription.unsubscribe(); };
  }, []);

  const toggle = useCallback(async (productId: string) => {
    await ensureUser(); // a heart is a deliberate action; an invisible anonymous user keeps it
    const sb = getBrowserSupabase();
    const { data: s } = await sb.auth.getSession();
    const userId = s.session!.user.id;
    const next = new Set(cache ?? []);
    const adding = !next.has(productId);
    if (adding) next.add(productId); else next.delete(productId);
    cache = next;
    window.dispatchEvent(new Event(EVENT));
    const { error } = adding
      ? await sb.from("favorites").insert({ user_id: userId, product_id: productId })
      : await sb.from("favorites").delete().eq("product_id", productId).eq("user_id", userId);
    if (error && error.code !== "23505") {
      // Roll back the optimistic update.
      const back = new Set(cache);
      if (adding) back.delete(productId); else back.add(productId);
      cache = back;
      window.dispatchEvent(new Event(EVENT));
    }
  }, []);

  return { ids, toggle };
}
