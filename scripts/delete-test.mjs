// Tests POST /api/me/delete against the running dev server. Spends no credits.
// Creates a temporary anonymous user with rows and a stored file, deletes via the API, checks it's all gone.
//   node --env-file=.env.local scripts/delete-test.mjs
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (n, ok, d) => { if (ok) pass++; else fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : `  (${d})`}`); };

async function anonUser() {
  const jar = new Map();
  const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const { data, error } = await ssr.auth.signInAnonymously();
  if (error) throw error;
  return { id: data.user.id, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}

const A = await anonUser();
const B = await anonUser(); // bystander: must be untouched
const { data: prod } = await admin.from("products").select("id").limit(1).single();
try {
  for (const u of [A, B]) {
    await admin.from("favorites").insert({ user_id: u.id, product_id: prod.id });
    await admin.from("style_preferences").upsert({ user_id: u.id, sections: ["women"], aesthetic_slugs: ["y2k"] });
    await admin.from("try_on_sessions").insert({ user_id: u.id, product_id: prod.id, request_id: `deltest${crypto.randomUUID().replaceAll("-", "")}`, status: "failed" });
    await admin.from("tryon_photos").insert({ user_id: u.id, clothsy_image_id: "img_test", expires_at: new Date(Date.now() + 3600e3).toISOString() });
    await admin.storage.from("saved-looks").upload(`${u.id}/test.jpg`, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg", upsert: true });
    await admin.from("saved_looks").insert({ user_id: u.id, product_id: prod.id, product_title: "x", product_image_url: "https://x", storage_path: `${u.id}/test.jpg` });
  }

  let r = await fetch(`${BASE}/api/me/delete`, { method: "POST", headers: { Origin: "https://evil.example", Cookie: A.cookie } });
  check("cross-origin delete refused", r.status === 403, r.status);
  r = await fetch(`${BASE}/api/me/delete`, { method: "POST", headers: { Origin: BASE } });
  check("delete without session → 401", r.status === 401, r.status);
  r = await fetch(`${BASE}/api/me/delete`, { method: "POST", headers: { Origin: BASE, Cookie: A.cookie } });
  check("delete own data → 200", r.status === 200, `${r.status} ${await r.text()}`);

  const { data: au } = await admin.auth.admin.getUserById(A.id);
  check("auth user removed", !au?.user);
  for (const t of ["profiles", "style_preferences", "favorites", "tryon_photos", "try_on_sessions", "saved_looks"]) {
    const col = t === "profiles" ? "id" : "user_id";
    const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq(col, A.id);
    check(`${t} rows removed`, count === 0, count);
  }
  const { data: files } = await admin.storage.from("saved-looks").list(A.id);
  check("saved-look files removed", (files ?? []).length === 0, files?.length);

  const { count: bFav } = await admin.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", B.id);
  const { data: bFiles } = await admin.storage.from("saved-looks").list(B.id);
  check("other user's data untouched", bFav === 1 && bFiles?.length === 1, `${bFav} / ${bFiles?.length}`);
} finally {
  await admin.storage.from("saved-looks").remove([`${A.id}/test.jpg`, `${B.id}/test.jpg`]);
  await admin.auth.admin.deleteUser(A.id).catch(() => {});
  await admin.auth.admin.deleteUser(B.id);
  console.log("Cleaned up.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
