// Tests every refusal path of /api/tryon against the running dev server. Spends NO credits:
// no test reaches clothsy.tryons.create. Creates a temporary anonymous user and deletes it after.
//   node --env-file=.env.local scripts/route-test.mjs   (dev server must be running on :3000)
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Sign in anonymously the same way the browser does, capturing the auth cookies.
const jar = new Map();
const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)) },
});
const { data: auth, error: authErr } = await ssr.auth.signInAnonymously();
if (authErr) throw authErr;
const userId = auth.user.id;
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");

const { data: prod } = await admin.from("products").select("id").eq("tryon_enabled", true).limit(1).single();
let pass = 0, fail = 0;
const check = (name, ok, detail) => { if (ok) pass++; else fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${detail})`}`); };

async function post(fields, { origin = BASE, withCookie = true, photo } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (photo) form.append("photo", photo, "photo.gif");
  const headers = {};
  if (origin) headers.Origin = origin;
  if (withCookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}/api/tryon`, { method: "POST", body: form, headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const rid = () => `test${crypto.randomUUID().replaceAll("-", "")}`;
const valid = () => ({ productId: prod.id, requestId: rid(), consent: "true" });
const fakeSession = (extra) => ({ user_id: userId, product_id: prod.id, request_id: rid(), ...extra });

try {
  let r;
  r = await post(valid(), { origin: null }); check("no Origin header → 403", r.status === 403, r.status);
  r = await post(valid(), { origin: "https://evil.example" }); check("cross-origin → 403", r.status === 403, r.status);
  r = await post(valid(), { withCookie: false }); check("not signed in → 401", r.status === 401, r.status);
  r = await post({ productId: prod.id, requestId: rid() }); check("no consent → 400 CONSENT_REQUIRED", r.body.code === "CONSENT_REQUIRED", JSON.stringify(r));
  r = await post({ ...valid(), consent: "yes" }); check("consent not exactly 'true' → refused", r.body.code === "CONSENT_REQUIRED", JSON.stringify(r));
  r = await post({ ...valid(), requestId: "short" }); check("bad requestId → 400", r.status === 400, r.status);
  r = await post({ ...valid(), productId: "not-a-uuid" }); check("bad productId → 400", r.status === 400, r.status);
  r = await post({ ...valid(), productId: crypto.randomUUID() }); check("unknown product → 404 PRODUCT_UNAVAILABLE", r.body.code === "PRODUCT_UNAVAILABLE", JSON.stringify(r));
  const gif = new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0])], { type: "image/jpeg" });
  r = await post(valid(), { photo: gif }); check("GIF disguised as JPEG → 400 PHOTO_INVALID", r.body.code === "PHOTO_INVALID", JSON.stringify(r));
  r = await post(valid()); check("no photo and none saved → 409 PHOTO_REQUIRED", r.body.code === "PHOTO_REQUIRED", JSON.stringify(r));

  // Idempotent replay of the same click returns the existing session (no new job).
  const replay = fakeSession({ status: "failed", error_code: "TRYON_FAILED" });
  const { data: rs } = await admin.from("try_on_sessions").insert(replay).select("id").single();
  r = await post({ productId: prod.id, requestId: replay.request_id, consent: "true" });
  check("same requestId → same session, no new job", r.status === 202 && r.body.sessionId === rs.id, JSON.stringify(r));

  // One running try-on at a time.
  const { data: pend } = await admin.from("try_on_sessions").insert(fakeSession({ status: "pending" })).select("id").single();
  r = await post(valid()); check("second try-on while one runs → 409 ALREADY_RUNNING + sessionId", r.body.code === "ALREADY_RUNNING" && r.body.sessionId === pend.id, JSON.stringify(r));
  await admin.from("try_on_sessions").update({ status: "failed" }).eq("id", pend.id);

  // Polling
  const getS = (id, withCookie = true) => fetch(`${BASE}/api/tryon?id=${id}`, { headers: withCookie ? { Cookie: cookie } : {} });
  r = await getS(rs.id, false); check("poll without session → 401", r.status === 401, r.status);
  r = await getS(crypto.randomUUID()); check("poll someone else's / unknown id → 404", r.status === 404, r.status);
  r = await getS(rs.id); const pb = await r.json(); check("poll own failed session → failed + safe code", pb.status === "failed" && pb.code === "TRYON_FAILED" && !("clothsy_job_id" in pb), JSON.stringify(pb));

  // Daily cap (3 by default): two existing successes + 1 more = 3
  await admin.from("try_on_sessions").insert([fakeSession({ status: "success" }), fakeSession({ status: "success" }), fakeSession({ status: "success" })]);
  r = await post(valid()); check("daily cap reached → 429 DAILY_LIMIT", r.status === 429 && r.body.code === "DAILY_LIMIT", JSON.stringify(r));

  // Global cap (10 by default): fill up to the cap
  await admin.from("try_on_sessions").insert(Array.from({ length: 7 }, () => fakeSession({ status: "success" })));
  r = await post(valid()); check("global cap reached → 503 FITTING_ROOM_FULL", r.status === 503 && r.body.code === "FITTING_ROOM_FULL", JSON.stringify(r));

  check("no message leaks provider details", !JSON.stringify(r.body).match(/clothsy_live_|INSUFFICIENT|img_/), JSON.stringify(r.body));
} finally {
  await admin.auth.admin.deleteUser(userId); // cascades its sessions and photos
  console.log("Cleaned up test user and sessions.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
