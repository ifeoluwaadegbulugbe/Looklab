// Tests the experimental outfit path of POST /api/tryon. Spends NO credits:
// the valid request has no photo, so it composes + uploads the outfit image (free) and then stops
// with PHOTO_REQUIRED before any try-on is created.
//   node --env-file=.env.local scripts/outfit-test.mjs   (dev server on :3000)
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
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
const id = async (slug) => (await admin.from("products").select("id").eq("slug", slug).single()).data.id;
const top = await id("navy-pinstripe-off-shoulder-top");
const jacket = await id("chocolate-leather-belted-jacket");
const jeans = await id("light-wash-barrel-jeans");
const cami = await id("navy-ribbed-henley-cami"); // try-on disabled

async function post(productId, outfitWith) {
  const form = new FormData();
  form.append("productId", productId);
  if (outfitWith) form.append("outfitWith", outfitWith);
  form.append("requestId", `outfit${crypto.randomUUID().replaceAll("-", "")}`);
  form.append("consent", "true");
  const res = await fetch(`${BASE}/api/tryon`, { method: "POST", body: form, headers: { Origin: BASE, Cookie: cookie } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

try {
  let r = await post(top, top);
  check("same piece twice → 400", r.status === 400, JSON.stringify(r));
  r = await post(top, jacket);
  check("two upper pieces → 400 with clear message", r.status === 400 && /one top or jacket/.test(r.body.message), JSON.stringify(r));
  r = await post(cami, jeans);
  check("disabled piece in outfit → 404", r.status === 404 && r.body.code === "PRODUCT_UNAVAILABLE", JSON.stringify(r));
  r = await post(jeans, top); // order shouldn't matter: server works out upper/lower
  check("valid outfit composes + uploads, then asks for photo (no credit)", r.status === 409 && r.body.code === "PHOTO_REQUIRED", JSON.stringify(r));
  const { count } = await admin.from("try_on_sessions").select("*", { count: "exact", head: true }).eq("user_id", auth.user.id);
  check("no try-on session was created", count === 0, count);
} finally {
  await admin.auth.admin.deleteUser(auth.user.id);
  console.log("Cleaned up.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
