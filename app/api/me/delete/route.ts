import { getCurrentUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isSameOrigin, json, jsonError } from "@/lib/http";

/**
 * Deletes everything LookLab holds for the signed-in user: saved-look files, then the auth user,
 * which cascades to profiles, preferences, favourites, photo ids, try-on sessions and saved looks.
 * Clothsy's own copy of uploaded photos is outside our control (deleted by them within 35 days).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "FORBIDDEN_ORIGIN", "Request refused.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "There's nothing to delete: you don't have any saved data.");

  const admin = getAdminSupabase();
  try {
    // Remove stored files first so nothing is orphaned if the user deletion succeeds.
    const bucket = admin.storage.from("saved-looks");
    for (;;) {
      const { data: files, error } = await bucket.list(user.id, { limit: 100 });
      if (error) throw error;
      if (!files?.length) break;
      const { error: rmErr } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
      if (rmErr) throw rmErr;
      if (files.length < 100) break;
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;
  } catch {
    console.error("[me/delete] failed");
    return jsonError(500, "UNKNOWN", "We couldn't delete your data just now. Please try again.");
  }
  return json({ deleted: true });
}
