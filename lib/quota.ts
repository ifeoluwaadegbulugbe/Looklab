import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { TryOnErrorCode } from "@/lib/tryon-types";

function intEnv(name: string, fallback: number) {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const quotaConfig = () => ({
  enabled: process.env.TRYON_ENABLED !== "false",
  userDailyCap: intEnv("TRYON_USER_DAILY_CAP", 3),
  globalCap: intEnv("TRYON_GLOBAL_CAP", 10),
});

/** A layered outfit runs two try-ons (top, then bottom), so it costs 2. */
export const quotaCost = (isOutfit: boolean) => (isOutfit ? 2 : 1);

export type QuotaResult = { ok: true } | { ok: false; httpStatus: number; code: TryOnErrorCode; message: string };

/**
 * Credit protection. Counts pending + successful try-ons (failures are refunded by the provider,
 * so they don't count). Daily cap is a rolling 24 hours per user; global cap is all-time across
 * the app and should be set below the remaining Clothsy credits.
 */
export async function checkQuota(userId: string, cost = 1): Promise<QuotaResult> {
  const { enabled, userDailyCap, globalCap } = quotaConfig();
  const full = {
    ok: false as const,
    httpStatus: 503,
    code: "FITTING_ROOM_FULL" as const,
    message: "The fitting room is full right now. Have a look at some sample results instead.",
  };
  if (!enabled) return full;

  const db = getAdminSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const live = ["pending", "success"];
  const head = { count: "exact" as const, head: true };
  // Outfits are counted twice (each one is two provider try-ons).
  const [mine, mineOutfits, all, allOutfits] = await Promise.all([
    db.from("try_on_sessions").select("id", head).eq("user_id", userId).in("status", live).gte("created_at", since),
    db.from("try_on_sessions").select("id", head).eq("user_id", userId).in("status", live).gte("created_at", since).not("outfit_product_ids", "is", null),
    db.from("try_on_sessions").select("id", head).in("status", live),
    db.from("try_on_sessions").select("id", head).in("status", live).not("outfit_product_ids", "is", null),
  ]);
  if (mine.error || all.error) throw new Error("quota lookup failed");
  // Before the outfits migration the outfit column doesn't exist; treat that as zero outfits.
  const used = (mine.count ?? 0) + (mineOutfits.error ? 0 : mineOutfits.count ?? 0);
  const usedAll = (all.count ?? 0) + (allOutfits.error ? 0 : allOutfits.count ?? 0);

  if (usedAll + cost > globalCap) return full;
  if (used + cost > userDailyCap) {
    return {
      ok: false,
      httpStatus: 429,
      code: "DAILY_LIMIT",
      message: cost > 1 && used < userDailyCap
        ? `An outfit uses 2 try-ons and you have ${userDailyCap - used} left today. Try a single piece instead, or come back tomorrow.`
        : `You've used today's ${userDailyCap} try-ons. Your Fitting Room is still here, so come back tomorrow for more.`,
    };
  }
  return { ok: true };
}
