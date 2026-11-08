import "server-only";
import { getClothsy } from "@/lib/clothsy/client";
import { logTryOnError, mapClothsyError, type MappedError } from "@/lib/clothsy/errors";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkQuota } from "@/lib/quota";
import { LOWER_CATEGORIES, UPPER_CATEGORIES } from "@/lib/outfit";
import { quotaCost } from "@/lib/quota";
import type { StartTryOnResponse, TryOnErrorCode, TryOnStatusResponse } from "@/lib/tryon-types";

const PHOTO_TTL_MS = 24 * 60 * 60 * 1000;
/** Don't reuse a photo id that expires within this window: the try-on could outlive it. */
const PHOTO_SAFETY_MS = 10 * 60 * 1000;
const RESULT_TTL_MS = 24 * 60 * 60 * 1000;

export type ServiceResult<T> =
  | { ok: true; data: T; httpStatus: number }
  | { ok: false; httpStatus: number; code: TryOnErrorCode; message: string; retryAfter?: number; sessionId?: string };

const fail = (httpStatus: number, code: TryOnErrorCode, message: string, extra: object = {}) =>
  ({ ok: false as const, httpStatus, code, message, ...extra });
const fromMapped = (m: MappedError) => fail(m.httpStatus, m.code, m.message, { retryAfter: m.retryAfter });

export interface StartInput {
  userId: string;
  /** One product, or two for an experimental outfit (one upper + one lower piece). */
  productIds: string[];
  requestId: string;
  /** Present when the shopper added a new photo; absent to reuse the last one. */
  photo?: { bytes: Uint8Array; contentType: "image/jpeg" | "image/png" };
}

/**
 * Starts a try-on. The garment URL and title always come from the database by product id,
 * never from the browser. A pending session row is claimed BEFORE calling the provider, so the
 * one-pending-per-user unique index makes double clicks and parallel requests cost one credit.
 */
export async function startTryOn(input: StartInput): Promise<ServiceResult<StartTryOnResponse>> {
  const db = getAdminSupabase();
  const { userId, productIds, requestId } = input;

  // Idempotent retry of the same click: return the session it already created.
  const { data: sameReq } = await db.from("try_on_sessions")
    .select("id,user_id").eq("request_id", requestId).maybeSingle();
  if (sameReq) {
    if (sameReq.user_id !== userId) return fail(400, "INVALID_REQUEST", "Please try again.");
    return { ok: true, httpStatus: 202, data: { sessionId: sameReq.id, photoExpiresAt: await latestPhotoExpiry(userId) } };
  }

  // One running try-on at a time: refresh it first in case it has actually finished.
  const pending = await findPending(userId);
  if (pending) {
    const refreshed = await getTryOn(userId, pending.id);
    if (refreshed.ok && refreshed.data.status === "pending") {
      return fail(409, "ALREADY_RUNNING", "You already have a try-on in progress.", { sessionId: pending.id });
    }
  }


  // Garment(s) always come from the database by id. Never URLs or titles from the browser.
  const { data: rows } = await db.from("products")
    .select("id,title,image_url,tryon_enabled,category:categories(slug)").in("id", productIds);
  type Row = { id: string; title: string; image_url: string; tryon_enabled: boolean; category: { slug: string } | null };
  const found = (rows ?? []) as unknown as Row[];
  if (found.length !== productIds.length || found.some((p) => !p.tryon_enabled)) {
    return fail(404, "PRODUCT_UNAVAILABLE", productIds.length > 1 ? "One of those pieces isn't available for virtual try-on." : "This item isn't available for virtual try-on.");
  }
  const isOutfit = found.length === 2;
  let upper = found[0];
  let lower: Row | undefined;
  if (isOutfit) {
    const inCat = (p: Row, cats: readonly string[]) => !!p.category && cats.includes(p.category.slug);
    const u = found.find((p) => inCat(p, UPPER_CATEGORIES));
    const l = found.find((p) => inCat(p, LOWER_CATEGORIES));
    if (!u || !l) return fail(400, "INVALID_REQUEST", "An outfit needs one top or jacket and one pair of trousers or a skirt.");
    upper = u;
    lower = l;
  }
  const product = upper;

  // An outfit is layered: two try-ons (top first, then the bottom on that result), so it costs 2.
  const quota = await checkQuota(userId, quotaCost(isOutfit));
  if (!quota.ok) return fail(quota.httpStatus, quota.code, quota.message);

  const clothsy = getClothsy();

  // Step 1 of an outfit is the upper piece; step 2 is started automatically when step 1 finishes.
  const garment = { url: product.image_url };
  const title = product.title.slice(0, 120);

  // Photo: upload the new one (free) or reuse the newest id that is still safely valid.
  let photo: { id: string; imageId: string; expiresAt: string };
  if (input.photo) {
    try {
      const blob = new Blob([input.photo.bytes as BlobPart], { type: input.photo.contentType });
      const uploaded = await clothsy.images.upload(blob, {
        filename: input.photo.contentType === "image/png" ? "photo.png" : "photo.jpg",
        contentType: input.photo.contentType,
      });
      // Store our own conservative expiry (upload time + 24 h), never later than the provider's.
      const expiresAt = new Date(Math.min(Date.parse(uploaded.expiresAt) || Infinity, Date.now() + PHOTO_TTL_MS)).toISOString();
      const { data: row, error } = await db.from("tryon_photos")
        .insert({ user_id: userId, clothsy_image_id: uploaded.id, expires_at: expiresAt })
        .select("id").single();
      if (error) throw error;
      photo = { id: row.id, imageId: uploaded.id, expiresAt };
    } catch (e) {
      logTryOnError("upload", e);
      return fromMapped(mapClothsyError(e));
    }
  } else {
    const { data: row } = await db.from("tryon_photos")
      .select("id,clothsy_image_id,expires_at").eq("user_id", userId)
      .gt("expires_at", new Date(Date.now() + PHOTO_SAFETY_MS).toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!row) return fail(409, "PHOTO_REQUIRED", "Add a photo of yourself to try this on.");
    photo = { id: row.id, imageId: row.clothsy_image_id, expiresAt: row.expires_at };
  }

  // Claim the single pending slot. The unique indexes reject double clicks and replays.
  const { data: session, error: claimErr } = await db.from("try_on_sessions")
    .insert({
      user_id: userId, product_id: product.id, request_id: requestId, status: "pending",
      // Only outfits write this column, so single try-ons keep working even before the outfits migration.
      ...(isOutfit && lower ? { outfit_product_ids: [upper.id, lower.id], outfit_step: 1 } : {}),
    })
    .select("id").single();
  if (claimErr || !session) {
    if (claimErr?.code === "23505") {
      const again = await findPending(userId);
      if (again) return fail(409, "ALREADY_RUNNING", "You already have a try-on in progress.", { sessionId: again.id });
      const { data: req } = await db.from("try_on_sessions").select("id").eq("request_id", requestId).eq("user_id", userId).maybeSingle();
      if (req) return { ok: true, httpStatus: 202, data: { sessionId: req.id, photoExpiresAt: photo.expiresAt } };
    }
    console.error("[tryon] claim failed");
    return fail(500, "UNKNOWN", "Something went wrong creating your try-on. Please try again.");
  }

  try {
    const created = await clothsy.tryons.create({
      person: { imageId: photo.imageId },
      garment,
      title,
      consent: true,
      idempotencyKey: requestId,
    });
    await db.from("try_on_sessions").update({ clothsy_job_id: created.id }).eq("id", session.id);
    return { ok: true, httpStatus: 202, data: { sessionId: session.id, photoExpiresAt: photo.expiresAt } };
  } catch (e) {
    logTryOnError("create", e);
    const mapped = mapClothsyError(e);
    await finishFailed(session.id, mapped);
    if (mapped.code === "PHOTO_REQUIRED") await db.from("tryon_photos").delete().eq("id", photo.id);
    if (mapped.code === "GARMENT_REJECTED" && !isOutfit) await db.from("products").update({ tryon_enabled: false }).eq("id", product.id);
    return fromMapped(mapped);
  }
}

/** Polls one of the user's sessions. Only the owner can read it; the provider job id never leaves the server. */
export async function getTryOn(userId: string, sessionId: string): Promise<ServiceResult<TryOnStatusResponse>> {
  const db = getAdminSupabase();
  const { data: s } = await db.from("try_on_sessions")
    .select("*")
    .eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (!s) return fail(404, "NOT_FOUND", "We couldn't find that try-on.");
  const outfitIds = (s.outfit_product_ids as string[] | null | undefined) ?? null;
  const step = outfitIds ? ((s.outfit_step as number | null) ?? 1) : undefined;

  if (s.status === "failed") {
    return { ok: true, httpStatus: 200, data: { status: "failed", resultUrl: null, code: s.error_code ?? "TRYON_FAILED", message: s.error_message ?? undefined } };
  }
  const fresh = s.status === "success" && s.result_url && s.result_expires_at && Date.parse(s.result_expires_at) > Date.now() + 60_000;
  if (fresh) return { ok: true, httpStatus: 200, data: { status: "success", resultUrl: s.result_url, message: s.error_message ?? undefined } };

  // Still being created by the POST that claimed it.
  if (!s.clothsy_job_id) {
    if (Date.now() - Date.parse(s.created_at) > 2 * 60 * 1000) {
      await finishFailed(s.id, { code: "UNKNOWN", message: "That try-on didn't start. Please try again." });
      return { ok: true, httpStatus: 200, data: { status: "failed", resultUrl: null, code: "UNKNOWN", message: "That try-on didn't start. Please try again." } };
    }
    return { ok: true, httpStatus: 200, data: { status: "pending", resultUrl: null, step } };
  }

  try {
    const job = await getClothsy().tryons.retrieve(s.clothsy_job_id);
    if (job.status === "success" && job.resultUrl && s.status === "pending" && outfitIds && step === 1) {
      return await advanceOutfit(s.id, s.request_id as string, outfitIds[1], job.resultUrl);
    }
    if (job.status === "failed" && s.status === "pending" && outfitIds && step === 2 && s.result_url) {
      // The top worked but the bottom didn't (refunded): keep the top look rather than losing it.
      const message = "We added the top, but couldn't add the bottom to this photo, so this shows the top only. Nothing was charged for the bottom.";
      await db.from("try_on_sessions").update({
        status: "success", error_message: message, finished_at: new Date().toISOString(),
        result_expires_at: s.result_expires_at ?? new Date(Date.now() + RESULT_TTL_MS).toISOString(),
      }).eq("id", s.id).eq("status", "pending");
      return { ok: true, httpStatus: 200, data: { status: "success", resultUrl: s.result_url, message } };
    }
    if (s.status === "success" && job.status !== "success") {
      // Already finished earlier: never downgrade a finished look because a later lookup differs.
      return { ok: true, httpStatus: 200, data: { status: "success", resultUrl: s.result_url, message: s.error_message ?? undefined } };
    }
    if (job.status === "success" && job.resultUrl) {
      await db.from("try_on_sessions").update({
        status: "success",
        result_url: job.resultUrl,
        result_expires_at: new Date(Date.now() + RESULT_TTL_MS).toISOString(),
        finished_at: s.status === "pending" ? new Date().toISOString() : undefined,
      }).eq("id", s.id);
      return { ok: true, httpStatus: 200, data: { status: "success", resultUrl: job.resultUrl } };
    }
    if (job.status === "failed") {
      // Failed jobs are refunded by the provider. Its message talks about "credits", which shoppers don't have,
      // so show LookLab's own copy. (Seen so far: safety screening, garment not detected on the photo.)
      const message =
        "We couldn't create this preview. It sometimes happens with very revealing cuts or busy photos. Nothing was charged. Try a different piece or photo.";
      await finishFailed(s.id, { code: "TRYON_FAILED", message });
      return { ok: true, httpStatus: 200, data: { status: "failed", resultUrl: null, code: "TRYON_FAILED", message } };
    }
    return { ok: true, httpStatus: 200, data: { status: "pending", resultUrl: null, step } };
  } catch (e) {
    logTryOnError("retrieve", e);
    return fromMapped(mapClothsyError(e));
  }
}

async function findPending(userId: string) {
  const { data } = await getAdminSupabase().from("try_on_sessions")
    .select("id").eq("user_id", userId).eq("status", "pending").maybeSingle();
  return data;
}

async function finishFailed(sessionId: string, m: Pick<MappedError, "code" | "message">) {
  await getAdminSupabase().from("try_on_sessions").update({
    status: "failed", error_code: m.code, error_message: m.message, finished_at: new Date().toISOString(),
  }).eq("id", sessionId);
}

async function latestPhotoExpiry(userId: string) {
  const { data } = await getAdminSupabase().from("tryon_photos")
    .select("expires_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.expires_at ?? new Date().toISOString();
}

const RESULT_HOST_RE = /(^|\.)fabricvton\.com$/i;
const TRANSIENT = new Set(["RATE_LIMITED", "UNAVAILABLE", "UNKNOWN"]);

/**
 * Layered outfit, step 2: take the step-1 result (the shopper wearing the top), upload it as the new
 * person image (uploads are free) and start a try-on for the bottom. Guarded so concurrent polls
 * start at most one job: the idempotency key is derived from the click's request id, so a repeat
 * never charges twice, and the row only moves from step 1 to step 2 once.
 */
async function advanceOutfit(
  sessionId: string,
  requestId: string,
  lowerId: string,
  step1Url: string,
): Promise<ServiceResult<TryOnStatusResponse>> {
  const db = getAdminSupabase();
  const keepTop = async (message: string) => {
    await db.from("try_on_sessions").update({
      status: "success", result_url: step1Url, error_message: message,
      result_expires_at: new Date(Date.now() + RESULT_TTL_MS).toISOString(), finished_at: new Date().toISOString(),
    }).eq("id", sessionId).eq("status", "pending");
    return { ok: true as const, httpStatus: 200, data: { status: "success" as const, resultUrl: step1Url, message } };
  };

  const { data: lower } = await db.from("products").select("id,title,image_url,tryon_enabled").eq("id", lowerId).maybeSingle();
  if (!lower?.tryon_enabled) return keepTop("We added the top, but the bottom isn't available for try-on any more.");

  try {
    const url = new URL(step1Url);
    if (url.protocol !== "https:" || !RESULT_HOST_RE.test(url.hostname)) throw new Error("unexpected result host");
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
    const type = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!res.ok || (type !== "image/jpeg" && type !== "image/png")) throw new Error("step 1 result not usable");
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) throw new Error("step 1 result too large");

    const clothsy = getClothsy();
    const person = await clothsy.images.upload(new Blob([bytes as BlobPart], { type }), {
      filename: type === "image/png" ? "step1.png" : "step1.jpg",
      contentType: type,
    });
    const created = await clothsy.tryons.create({
      person: { imageId: person.id },
      garment: { url: lower.image_url },
      title: lower.title.slice(0, 120),
      consent: true, // the shopper's consent for this outfit covers both layers
      idempotencyKey: `${requestId.slice(0, 120)}_step2`,
    });
    await db.from("try_on_sessions").update({
      clothsy_job_id: created.id, outfit_step: 2, result_url: step1Url,
      result_expires_at: new Date(Date.now() + RESULT_TTL_MS).toISOString(),
    }).eq("id", sessionId).eq("outfit_step", 1);
    return { ok: true, httpStatus: 200, data: { status: "pending", resultUrl: null, step: 2 } };
  } catch (e) {
    logTryOnError("outfit step 2", e);
    const mapped = mapClothsyError(e);
    // Busy or a blip: stay on step 1 and the next poll tries again (same idempotency key, no double charge).
    if (TRANSIENT.has(mapped.code) && !(e instanceof Error && /unexpected|not usable|too large/.test(e.message))) {
      return { ok: true, httpStatus: 200, data: { status: "pending", resultUrl: null, step: 1 } };
    }
    return keepTop("We added the top, but couldn't add the bottom to this look. Nothing was charged for the bottom.");
  }
}
