import { getCurrentUser } from "@/lib/supabase/server";
import { getTryOn, startTryOn } from "@/lib/clothsy/service";
import { isSameOrigin, json, jsonError } from "@/lib/http";
import { MAX_PHOTO_BYTES, REQUEST_ID_RE } from "@/lib/tryon-types";

// Provider guidance: allow up to 60 s for upload + start on Vercel.
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Start a try-on. multipart/form-data: productId, requestId, consent="true", optional photo (JPEG/PNG ≤ 4 MB). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN_ORIGIN", "Request refused.");

  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please refresh the page and try again.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "Please try again.");
  }

  const productId = form.get("productId");
  const requestId = form.get("requestId");
  const consent = form.get("consent");
  const photo = form.get("photo");

  if (typeof productId !== "string" || !UUID_RE.test(productId)) {
    return jsonError(400, "INVALID_REQUEST", "Please try again.");
  }
  if (typeof requestId !== "string" || !REQUEST_ID_RE.test(requestId)) {
    return jsonError(400, "INVALID_REQUEST", "Please try again.");
  }
  // Consent must be an explicit user action every time; never defaulted.
  if (consent !== "true") {
    return jsonError(400, "CONSENT_REQUIRED", "Please confirm you're 18 or over and agree to your photo being processed.");
  }

  let photoInput: { bytes: Uint8Array; contentType: "image/jpeg" | "image/png" } | undefined;
  if (photo !== null) {
    if (!(photo instanceof File) || photo.size === 0) {
      return jsonError(400, "PHOTO_INVALID", "Please choose a JPEG or PNG photo.");
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return jsonError(413, "PHOTO_INVALID", "That photo is too large. Please use one under 4 MB.");
    }
    // Check the real file signature, not just the declared type. Bytes stay in memory only.
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (!isJpeg && !isPng) return jsonError(400, "PHOTO_INVALID", "Please use a JPEG or PNG photo.");
    photoInput = { bytes, contentType: isPng ? "image/png" : "image/jpeg" };
  }

  try {
    const result = await startTryOn({ userId: user.id, productId, requestId, photo: photoInput });
    if (!result.ok) {
      return jsonError(result.httpStatus, result.code, result.message, { retryAfter: result.retryAfter, sessionId: result.sessionId });
    }
    return json(result.data, result.httpStatus);
  } catch {
    console.error("[tryon] start crashed");
    return jsonError(500, "UNKNOWN", "Something went wrong creating your try-on. Please try again.");
  }
}

/** Poll a try-on by LookLab session id: GET /api/tryon?id=<session uuid>. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please refresh the page and try again.");

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !UUID_RE.test(id)) return jsonError(400, "INVALID_REQUEST", "Please try again.");

  try {
    const result = await getTryOn(user.id, id);
    if (!result.ok) return jsonError(result.httpStatus, result.code, result.message, { retryAfter: result.retryAfter });
    return json(result.data);
  } catch {
    console.error("[tryon] poll crashed");
    return jsonError(500, "UNKNOWN", "Something went wrong. Please try again.");
  }
}
