import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getTryOn } from "@/lib/clothsy/service";
import type { TryOnErrorCode } from "@/lib/tryon-types";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Result images are only ever fetched from the provider's own host (no open fetch/SSRF). */
const RESULT_HOST_RE = /(^|\.)fabricvton\.com$/i;

export type SaveResult =
  | { ok: true; id: string; created: boolean }
  | { ok: false; httpStatus: number; code: TryOnErrorCode; message: string };

/**
 * Copies a finished try-on into private storage so it outlives the provider's 24-hour link.
 * Bytes are stored exactly as downloaded so the provider's embedded AI label survives.
 */
export async function saveLook(userId: string, sessionId: string): Promise<SaveResult> {
  const db = getAdminSupabase();

  const { data: existing } = await db.from("saved_looks").select("id").eq("user_id", userId).eq("try_on_session_id", sessionId).maybeSingle();
  if (existing) return { ok: true, id: existing.id, created: false };

  const { data: s } = await db.from("try_on_sessions")
    .select("id,status,product:products(id,title,image_url)")
    .eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (!s) return { ok: false, httpStatus: 404, code: "NOT_FOUND", message: "We couldn't find that try-on." };
  if (s.status !== "success") return { ok: false, httpStatus: 409, code: "NOT_READY", message: "Only finished try-ons can be saved." };

  // Ask for the current result link (refreshes it if the stored one is close to expiring).
  const status = await getTryOn(userId, sessionId);
  if (!status.ok || status.data.status !== "success" || !status.data.resultUrl) {
    return { ok: false, httpStatus: 410, code: "EXPIRED", message: "This preview has expired and can't be saved any more. Try the piece on again to save it." };
  }

  let resultUrl: URL;
  try {
    resultUrl = new URL(status.data.resultUrl);
  } catch {
    return { ok: false, httpStatus: 502, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }
  if (resultUrl.protocol !== "https:" || !RESULT_HOST_RE.test(resultUrl.hostname)) {
    console.error("[looks] unexpected result host");
    return { ok: false, httpStatus: 502, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }

  const res = await fetch(resultUrl, { redirect: "error", signal: AbortSignal.timeout(20_000) }).catch(() => null);
  const type = res?.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const ext = TYPES[type];
  const declared = Number(res?.headers.get("content-length") ?? 0);
  if (!res?.ok || !ext || declared > MAX_BYTES) {
    return { ok: false, httpStatus: 502, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return { ok: false, httpStatus: 502, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }

  const lookId = crypto.randomUUID();
  const path = `${userId}/${lookId}.${ext}`;
  const { error: upErr } = await db.storage.from("saved-looks").upload(path, bytes, { contentType: type, upsert: false });
  if (upErr) {
    console.error("[looks] upload failed");
    return { ok: false, httpStatus: 500, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }

  const product = s.product as unknown as { id: string; title: string; image_url: string } | null;
  const { error: insErr } = await db.from("saved_looks").insert({
    id: lookId,
    user_id: userId,
    product_id: product?.id ?? null,
    product_title: product?.title ?? "Saved look",
    product_image_url: product?.image_url ?? "",
    storage_path: path,
    try_on_session_id: sessionId,
  });
  if (insErr) {
    await db.storage.from("saved-looks").remove([path]);
    // A parallel save of the same try-on won the race (unique index): return that look instead.
    if (insErr.code === "23505") {
      const { data: winner } = await db.from("saved_looks").select("id").eq("user_id", userId).eq("try_on_session_id", sessionId).maybeSingle();
      if (winner) return { ok: true, id: winner.id, created: false };
    }
    console.error("[looks] insert failed");
    return { ok: false, httpStatus: 500, code: "UNKNOWN", message: "We couldn't save this look. Please try again." };
  }
  return { ok: true, id: lookId, created: true };
}

export async function deleteLook(userId: string, lookId: string) {
  const db = getAdminSupabase();
  const { data: look } = await db.from("saved_looks").select("id,storage_path").eq("id", lookId).eq("user_id", userId).maybeSingle();
  if (!look) return false;
  await db.storage.from("saved-looks").remove([look.storage_path]);
  await db.from("saved_looks").delete().eq("id", look.id).eq("user_id", userId);
  return true;
}
