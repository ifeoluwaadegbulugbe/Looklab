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

export type QuotaResult = { ok: true } | { ok: false; httpStatus: number; code: TryOnErrorCode; message: string };

/**
 * Credit protection. Counts pending + successful try-ons (failures are refunded by the provider,
 * so they don't count). Daily cap is a rolling 24 hours per user; global cap is all-time across
 * the app and should be set below the remaining Clothsy credits.
 */
export async function checkQuota(userId: string): Promise<QuotaResult> {
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
  const [mine, all] = await Promise.all([
    db.from("try_on_sessions").select("id", { count: "exact", head: true })
      .eq("user_id", userId).in("status", ["pending", "success"]).gte("created_at", since),
    db.from("try_on_sessions").select("id", { count: "exact", head: true }).in("status", ["pending", "success"]),
  ]);
  if (mine.error || all.error) throw new Error("quota lookup failed");

  if ((all.count ?? 0) >= globalCap) return full;
  if ((mine.count ?? 0) >= userDailyCap) {
    return {
      ok: false,
      httpStatus: 429,
      code: "DAILY_LIMIT",
      message: `You've used today's ${userDailyCap} try-ons. Your Fitting Room is still here, so come back tomorrow for more.`,
    };
  }
  return { ok: true };
}
