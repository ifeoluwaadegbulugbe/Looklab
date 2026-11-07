// Two-user RLS test. Creates two anonymous users and a temporary product, checks isolation,
// then deletes everything it created. Spends no Clothsy credits.
//   node --env-file=.env.local scripts/rls-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const newClient = () => createClient(url, pubKey, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
};

// 1. Tables exist (admin)
const TABLES = ["categories", "aesthetics", "products", "product_aesthetics", "collections", "collection_items",
  "profiles", "style_preferences", "favorites", "tryon_photos", "try_on_sessions", "saved_looks"];
for (const t of TABLES) {
  const { error } = await admin.from(t).select("*", { head: true, count: "exact" });
  check(`table ${t} exists`, !error, error?.message);
}
if (fail) process.exit(1);

// Temporary catalogue row
const slug = `rls-test-${Date.now()}`;
const { data: cat } = await admin.from("categories").insert({ slug, name: "RLS test" }).select().single();
const { data: prod } = await admin.from("products").insert({
  slug, title: "RLS test product", category_id: cat.id, section: "unisex",
  image_url: "https://example.com/x.jpg", is_demo: true,
}).select().single();

const A = newClient();
const B = newClient();
const guest = newClient();
const created = [];
const files = [];
try {
  const { data: a, error: ea } = await A.auth.signInAnonymously();
  const { data: b, error: eb } = await B.auth.signInAnonymously();
  check("anonymous sign-in works", !ea && !eb, (ea ?? eb)?.message);
  if (ea || eb) throw new Error("Enable anonymous sign-ins in Supabase");
  const idA = a.user.id;
  const idB = b.user.id;
  created.push(idA, idB);

  // Profiles trigger
  const { data: profA } = await A.from("profiles").select("id");
  check("profile row auto-created for A", profA?.length === 1 && profA[0].id === idA);
  const { data: profAll } = await A.from("profiles").select("id");
  check("A sees only own profile", profAll?.every((p) => p.id === idA));

  // Catalogue
  const { data: gp, error: gpe } = await guest.from("products").select("id").eq("id", prod.id);
  check("guest can read products", !gpe && gp?.length === 1, gpe?.message);
  const { error: gw } = await guest.from("products").insert({ slug: "hack", title: "x", category_id: cat.id, section: "unisex", image_url: "https://x" });
  check("guest cannot insert products", !!gw);
  const { error: aw } = await A.from("products").update({ title: "hacked" }).eq("id", prod.id).select();
  const { data: still } = await admin.from("products").select("title").eq("id", prod.id).single();
  check("user cannot update products", still.title === "RLS test product", aw?.message);

  // Favorites + preferences
  const { error: fa } = await A.from("favorites").insert({ user_id: idA, product_id: prod.id });
  check("A can add own favorite", !fa, fa?.message);
  const { error: fspoof } = await B.from("favorites").insert({ user_id: idA, product_id: prod.id });
  check("B cannot add favorite as A", !!fspoof);
  const { data: fb } = await B.from("favorites").select("*");
  check("B cannot see A's favorites", fb?.length === 0);
  const { error: pa } = await A.from("style_preferences").upsert({ user_id: idA, sections: ["women"], aesthetic_slugs: ["y2k"] });
  check("A can save preferences", !pa, pa?.message);
  const { data: pb } = await B.from("style_preferences").select("*");
  check("B cannot see A's preferences", pb?.length === 0);

  // Server-only tables
  const { error: si } = await A.from("try_on_sessions").insert({ user_id: idA, product_id: prod.id, request_id: "forgedreq123" });
  check("user cannot insert try_on_sessions", !!si);
  const { error: ti } = await A.from("tryon_photos").select("*");
  check("user cannot read tryon_photos", !!ti);
  const { data: sess } = await admin.from("try_on_sessions").insert({
    user_id: idA, product_id: prod.id, request_id: `rlstest${Date.now()}`, clothsy_job_id: "job-secret",
  }).select().single();
  const { data: sA, error: sAe } = await A.from("try_on_sessions").select("id,status");
  check("A can read own session", !sAe && sA?.length === 1, sAe?.message);
  const { error: jobErr } = await A.from("try_on_sessions").select("clothsy_job_id");
  check("A cannot read provider job id column", !!jobErr);
  const { data: sB } = await B.from("try_on_sessions").select("id");
  check("B cannot see A's session", sB?.length === 0);
  const { error: dup } = await admin.from("try_on_sessions").insert({
    user_id: idA, product_id: prod.id, request_id: `rlstest2${Date.now()}`,
  });
  check("second pending session for A is refused by DB", !!dup);
  const { error: up } = await A.from("try_on_sessions").update({ status: "success" }).eq("id", sess.id).select();
  const { data: sNow } = await admin.from("try_on_sessions").select("status").eq("id", sess.id).single();
  check("user cannot change session status", sNow.status === "pending", up?.message);

  // Saved looks + storage
  const path = `${idA}/rls-test.jpg`;
  files.push(path);
  await admin.storage.from("saved-looks").upload(path, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg", upsert: true });
  await admin.from("saved_looks").insert({ user_id: idA, product_id: prod.id, product_title: "x", product_image_url: "https://x", storage_path: path });
  const { data: la } = await A.from("saved_looks").select("id");
  check("A can read own saved look", la?.length === 1);
  const { data: lb } = await B.from("saved_looks").select("id");
  check("B cannot see A's saved look", lb?.length === 0);
  const { error: ld } = await A.from("saved_looks").delete().eq("user_id", idA).select();
  const { data: lStill } = await admin.from("saved_looks").select("id").eq("user_id", idA);
  check("user cannot delete saved_looks directly (server route only)", lStill?.length === 1, ld?.message);
  const { data: dA, error: dAe } = await A.storage.from("saved-looks").download(path);
  check("A can download own saved file", !dAe && !!dA, dAe?.message);
  const { error: dBe } = await B.storage.from("saved-looks").download(path);
  check("B cannot download A's file by guessing path", !!dBe);
  const { error: gBe } = await guest.storage.from("saved-looks").download(path);
  check("guest cannot download saved file", !!gBe);
  const pubRes = await fetch(admin.storage.from("saved-looks").getPublicUrl(path).data.publicUrl);
  check("saved-looks has no public URL access", !pubRes.ok, `HTTP ${pubRes.status}`);
  const { error: upB } = await B.storage.from("saved-looks").upload(`${idB}/x.jpg`, new Uint8Array([1]), { contentType: "image/jpeg" });
  check("user cannot upload to saved-looks directly", !!upB);
} finally {
  if (files.length) await admin.storage.from("saved-looks").remove(files);
  for (const id of created) await admin.auth.admin.deleteUser(id); // cascades user rows
  await admin.from("products").delete().eq("id", prod.id);
  await admin.from("categories").delete().eq("id", cat.id);
  console.log("Cleaned up test users, rows and files.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
