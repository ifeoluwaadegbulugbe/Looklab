"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface FittingRoomItem {
  id: string;
  status: "pending" | "success" | "failed";
  resultUrl: string | null;
  resultExpiresAt: string | null;
  message: string | null;
  createdAt: string;
  product: { id: string; slug: string; title: string; image_url: string } | null;
  /** Experimental outfit: the second (lower) piece, when this try-on was an outfit. */
  outfitWith: { id: string; slug: string; title: string; image_url: string } | null;
}

export const FITTING_ROOM_EVENT = "looklab:fitting-room";
/** Call after a try-on starts or finishes so the tray and badge refresh. */
export const notifyFittingRoom = () => window.dispatchEvent(new Event(FITTING_ROOM_EVENT));

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The shopper's try-ons from the last 24 hours (provider results expire after that).
 * Read straight from Supabase with RLS: users only ever see their own rows.
 * Never creates a user: guests who haven't tried anything on simply have an empty room.
 */
export function useFittingRoom() {
  const [items, setItems] = useState<FittingRoomItem[] | null>(null);

  const load = useCallback(async () => {
    const sb = getBrowserSupabase();
    const { data: session } = await sb.auth.getSession();
    if (!session.session) return setItems([]);
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const base = "id,status,result_url,result_expires_at,error_message,created_at,product:products(id,slug,title,image_url)";
    const query = (cols: string) =>
      sb.from("try_on_sessions").select(cols).gte("created_at", since).order("created_at", { ascending: false });
    let res = await query(`${base},outfit_product_ids`);
    // Before the outfits migration runs, the column doesn't exist: fall back so the room still works.
    if (res.error) res = await query(base);
    const { data, error } = res;
    if (error) return setItems([]);
    const lowerIds = [...new Set((data as unknown as { outfit_product_ids?: string[] | null }[]).map((r) => r.outfit_product_ids?.[1]).filter((x): x is string => !!x))];
    const lowers = new Map<string, FittingRoomItem["outfitWith"]>();
    if (lowerIds.length) {
      const { data: ps } = await sb.from("products").select("id,slug,title,image_url").in("id", lowerIds);
      for (const p of ps ?? []) lowers.set(p.id, p);
    }
    type Row = { id: string; status: FittingRoomItem["status"]; result_url: string | null; result_expires_at: string | null; error_message: string | null; created_at: string; product: FittingRoomItem["product"]; outfit_product_ids?: string[] | null };
    setItems((data as unknown as Row[]).map((r) => ({
      id: r.id, status: r.status, resultUrl: r.result_url, resultExpiresAt: r.result_expires_at,
      message: r.error_message, createdAt: r.created_at, product: r.product,
      outfitWith: (r.outfit_product_ids?.[1] && lowers.get(r.outfit_product_ids[1])) || null,
    })));
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- initial fetch
    const onChange = () => void load();
    window.addEventListener(FITTING_ROOM_EVENT, onChange);
    const { data: sub } = getBrowserSupabase().auth.onAuthStateChange(() => void load());
    return () => {
      window.removeEventListener(FITTING_ROOM_EVENT, onChange);
      sub.subscription.unsubscribe();
    };
  }, [load]);

  return { items, reload: load };
}

/** Count for the nav badge: ready or in-progress looks. */
export function useFittingRoomCount() {
  const { items } = useFittingRoom();
  return items?.filter((i) => i.status !== "failed").length ?? 0;
}
