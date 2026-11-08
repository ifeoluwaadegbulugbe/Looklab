// Tests layered outfits via the running dev server. Spends NO credits:
// - request validation and quota (outfit costs 2) stop before any provider call
// - step transitions are exercised with EXISTING provider jobs (retrieve is free) and paths that
//   never start a new try-on (bottom unavailable; step 2 already failed)
//   node --env-file=.env.local scripts/outfit-test.mjs   (dev server on :3000, outfit_step migration applied)
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (n, ok, d) => { if (ok) pass++; else fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : `  (${d})`}`); };

const jar = new Map();
const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)) },
});
const { data: auth } = await ssr.auth.signInAnonymously();
const userId = auth.user.id;
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
const id = async (slug) => (await admin.from("products").select("id").eq("slug", slug).single()).data.id;
const top = await id("navy-pinstripe-off-shoulder-top");
const jacket = await id("chocolate-leather-belted-jacket");
const jeans = await id("light-wash-barrel-jeans");
const cami = await id("navy-ribbed-henley-cami"); // try-on disabled
const rid = () => `outfit${crypto.randomUUID().replaceAll("-", "")}`;

async function post(productId, outfitWith) {
  const form = new FormData();
  form.append("productId", productId);
  if (outfitWith) form.append("outfitWith", outfitWith);
  form.append("requestId", rid());
  form.append("consent", "true");
  const res = await fetch(`${BASE}/api/tryon`, { method: "POST", body: form, headers: { Origin: BASE, Cookie: cookie } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const poll = async (sid) => (await fetch(`${BASE}/api/tryon?id=${sid}`, { headers: { Cookie: cookie } })).json();

// Existing finished provider jobs to reuse (free to retrieve).
const { data: okJob } = await admin.from("try_on_sessions").select("clothsy_job_id,result_url").eq("status", "success").is("outfit_product_ids", null).not("clothsy_job_id", "is", null).order("created_at", { ascending: false }).limit(1).single();
const { data: badJob } = await admin.from("try_on_sessions").select("clothsy_job_id").eq("status", "failed").not("clothsy_job_id", "is", null).limit(1).single();

try {
  // Validation
  let r = await post(top, top);
  check("same piece twice → 400", r.status === 400, JSON.stringify(r));
  r = await post(top, jacket);
  check("two upper pieces → 400", r.status === 400 && /one top or jacket/.test(r.body.message), JSON.stringify(r));
  r = await post(cami, jeans);
  check("disabled piece → 404", r.status === 404, JSON.stringify(r));
  r = await post(jeans, top);
  check("valid outfit (either order) → asks for photo, no credit", r.status === 409 && r.body.code === "PHOTO_REQUIRED", JSON.stringify(r));

  // Step 1 finished, bottom no longer available → keeps the top look (no new try-on started)
  const { data: s1 } = await admin.from("try_on_sessions").insert({
    user_id: userId, product_id: top, request_id: rid(), status: "pending",
    clothsy_job_id: okJob.clothsy_job_id, outfit_product_ids: [top, cami], outfit_step: 1,
  }).select("id").single();
  let p = await poll(s1.id);
  check("step 1 done + bottom unavailable → success with top only + note", p.status === "success" && !!p.resultUrl && /bottom/.test(p.message ?? ""), JSON.stringify(p));
  const { data: s1row } = await admin.from("try_on_sessions").select("status,outfit_step").eq("id", s1.id).single();
  check("no step 2 job was started", s1row.outfit_step === 1 && s1row.status === "success", JSON.stringify(s1row));

  // Step 2 failed (e.g. safety screening) → keep the step-1 look, don't fail the outfit
  const { data: s2 } = await admin.from("try_on_sessions").insert({
    user_id: userId, product_id: top, request_id: rid(), status: "pending",
    clothsy_job_id: badJob.clothsy_job_id, outfit_product_ids: [top, jeans], outfit_step: 2,
    result_url: okJob.result_url, result_expires_at: new Date(Date.now() + 3600e3).toISOString(),
  }).select("id").single();
  p = await poll(s2.id);
  check("step 2 failed → success showing the top look + note", p.status === "success" && p.resultUrl === okJob.result_url && /top/.test(p.message ?? ""), JSON.stringify(p));
  p = await poll(s2.id);
  check("finished outfit stays finished on re-poll", p.status === "success", JSON.stringify(p));

  // Pending outfit on step 2 reports the step
  const { data: s3 } = await admin.from("try_on_sessions").insert({
    user_id: userId, product_id: top, request_id: rid(), status: "pending", outfit_product_ids: [top, jeans], outfit_step: 2,
  }).select("id").single();
  p = await poll(s3.id);
  check("pending outfit reports its step", p.status === "pending" && p.step === 2, JSON.stringify(p));
  await admin.from("try_on_sessions").update({ status: "failed" }).eq("id", s3.id);

  // Quota: an outfit costs 2. Remove this test's outfit rows, then leave exactly 1 global slot
  // (counting outfits twice, like the server) and check outfit = refused, single piece = allowed.
  await admin.from("try_on_sessions").delete().eq("user_id", userId);
  const cap = Number(process.env.TRYON_GLOBAL_CAP ?? 10);
  const live = ["pending", "success"];
  const count = async (outfitsOnly) => {
    let q = admin.from("try_on_sessions").select("id", { count: "exact", head: true }).in("status", live);
    if (outfitsOnly) q = q.not("outfit_product_ids", "is", null);
    return (await q).count ?? 0;
  };
  let used = (await count(false)) + (await count(true));
  const rows = [];
  if (cap - used >= 3) { rows.push({ user_id: userId, product_id: top, request_id: rid(), status: "success", outfit_product_ids: [top, jeans], outfit_step: 2 }); used += 2; }
  while (cap - used > 1) { rows.push({ user_id: userId, product_id: jeans, request_id: rid(), status: "success" }); used += 1; }
  if (rows.length) await admin.from("try_on_sessions").insert(rows);
  console.log(`      (global cap ${cap}, used ${used}, 1 slot left; filler rows ${rows.length}, outfit rows counted x2)`);
  r = await post(top, jeans);
  check("outfit (needs 2) refused when 1 slot left", r.status === 503 && r.body.code === "FITTING_ROOM_FULL", JSON.stringify(r));
  r = await post(jeans);
  check("single piece (needs 1) still allowed (asks for photo)", r.body.code === "PHOTO_REQUIRED", JSON.stringify(r));
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log("Cleaned up.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
