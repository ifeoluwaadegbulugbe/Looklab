import { getCurrentUser } from "@/lib/supabase/server";
import { saveLook } from "@/lib/looks";
import { isSameOrigin, json, jsonError } from "@/lib/http";

export const maxDuration = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Save a finished try-on as a look. JSON body: { sessionId }. Requires a signed-in (non-guest) account. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN_ORIGIN", "Request refused.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to save looks.");
  // Saved images must belong to a real account, never a throwaway guest identity.
  if (user.is_anonymous) return jsonError(403, "ACCOUNT_REQUIRED", "Add your email to save looks.");

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = body?.sessionId;
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) return jsonError(400, "INVALID_REQUEST", "Please try again.");

  try {
    const r = await saveLook(user.id, sessionId);
    if (!r.ok) return jsonError(r.httpStatus, r.code, r.message);
    return json({ id: r.id, created: r.created }, r.created ? 201 : 200);
  } catch {
    console.error("[looks] save crashed");
    return jsonError(500, "UNKNOWN", "We couldn't save this look. Please try again.");
  }
}
