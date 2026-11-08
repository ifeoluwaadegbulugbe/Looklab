import { getCurrentUser } from "@/lib/supabase/server";
import { deleteLook } from "@/lib/looks";
import { isSameOrigin, json, jsonError } from "@/lib/http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Delete one saved look: its stored image and its row. Owner only. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/looks/[id]">) {
  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN_ORIGIN", "Request refused.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in.");
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(400, "INVALID_REQUEST", "Please try again.");
  try {
    const ok = await deleteLook(user.id, id);
    return ok ? json({ deleted: true }) : jsonError(404, "NOT_FOUND", "We couldn't find that look.");
  } catch {
    console.error("[looks] delete crashed");
    return jsonError(500, "UNKNOWN", "We couldn't delete that look. Please try again.");
  }
}
