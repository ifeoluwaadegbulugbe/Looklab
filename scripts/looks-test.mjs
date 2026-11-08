// Tests /api/looks (save) and /api/looks/[id] (delete) against the running dev server.
// Spends NO credits: reuses an existing finished try-on's result link (retrieve is free).
// Creates temporary users and removes them afterwards.
//   node --env-file=.env.local scripts/looks-test.mjs
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const check = (n, ok, d) => { if (ok) pass++; else fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : `  (${d})`}`); };

function ssr() {
  const jar = new Map();
  const client = createServerClient(url, pub, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)) },
  });
  return { client, cookie: () => [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}
async function emailUser(tag) {
  const email = `looklab-test-${tag}-${Date.now()}@example.com`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const s = ssr();
  const { error: e2 } = await s.client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, cookie: s.cookie() };
}
async function anonUser() {
  const s = ssr();
  const { data, error } = await s.client.auth.signInAnonymously();
  if (error) throw error;
  return { id: data.user.id, cookie: s.cookie() };
}
const post = (cookie, body, origin = BASE) =>
  fetch(`${BASE}/api/looks`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });

const { data: src } = await admin.from("try_on_sessions")
  .select("product_id,clothsy_job_id,result_url,result_expires_at").eq("status", "success")
  .order("created_at", { ascending: false }).limit(1).single();
if (!src) throw new Error("Need one finished try-on in the database to copy.");

const A = await emailUser("a");
const B = await emailUser("b");
const G = await anonUser();
const users = [A, B, G];
try {
  const mk = async (u, status) => (await admin.from("try_on_sessions").insert({
    user_id: u.id, product_id: src.product_id, request_id: `lookstest${crypto.randomUUID().replaceAll("-", "")}`,
    status, clothsy_job_id: src.clothsy_job_id, result_url: status === "success" ? src.result_url : null,
    result_expires_at: status === "success" ? src.result_expires_at : null,
  }).select("id").single()).data.id;
  const aDone = await mk(A, "success");
  const aFailed = await mk(A, "failed");
  const bDone = await mk(B, "success");
  const gDone = await mk(G, "success");

  let r = await post(A.cookie, { sessionId: aDone }, "https://evil.example");
  check("cross-origin save refused", r.status === 403, r.status);
  r = await post(null, { sessionId: aDone });
  check("save without session → 401", r.status === 401, r.status);
  r = await post(G.cookie, { sessionId: gDone });
  check("guest (anonymous) save → 403 ACCOUNT_REQUIRED", r.status === 403 && (await r.json()).code === "ACCOUNT_REQUIRED", r.status);
  r = await post(A.cookie, { sessionId: bDone });
  check("save someone else's try-on → 404", r.status === 404, r.status);
  r = await post(A.cookie, { sessionId: aFailed });
  check("save a failed try-on → 409", r.status === 409, r.status);
  r = await post(A.cookie, { sessionId: "nope" });
  check("bad id → 400", r.status === 400, r.status);

  r = await post(A.cookie, { sessionId: aDone });
  const saved = await r.json();
  check("save own finished try-on → 201", r.status === 201 && saved.id, `${r.status} ${JSON.stringify(saved)}`);
  r = await post(A.cookie, { sessionId: aDone });
  const again = await r.json();
  check("saving again is idempotent (same look)", r.status === 200 && again.id === saved.id, `${r.status} ${JSON.stringify(again)}`);

  const { data: row } = await admin.from("saved_looks").select("storage_path,product_title").eq("id", saved.id).single();
  check("path is {user_id}/{look_id}.ext", row.storage_path.startsWith(`${A.id}/${saved.id}.`), row.storage_path);
  check("product title snapshot stored", !!row.product_title, row.product_title);
  const { data: blob } = await admin.storage.from("saved-looks").download(row.storage_path);
  const original = new Uint8Array(await (await fetch(src.result_url)).arrayBuffer());
  const stored = new Uint8Array(await blob.arrayBuffer());
  check("stored bytes identical to provider result (AI label kept)", stored.length === original.length && stored.every((b, i) => b === original[i]), `${stored.length} vs ${original.length}`);

  const del = (u, id, origin = BASE) => fetch(`${BASE}/api/looks/${id}`, { method: "DELETE", headers: { Origin: origin, Cookie: u.cookie } });
  r = await del(B, saved.id);
  check("other user cannot delete the look → 404", r.status === 404, r.status);
  r = await del(A, saved.id, "https://evil.example");
  check("cross-origin delete refused", r.status === 403, r.status);
  r = await del(A, saved.id);
  check("owner deletes look → 200", r.status === 200, r.status);
  const { count } = await admin.from("saved_looks").select("*", { count: "exact", head: true }).eq("id", saved.id);
  const { data: files } = await admin.storage.from("saved-looks").list(A.id);
  check("row and file removed", count === 0 && (files ?? []).length === 0, `${count} rows, ${files?.length} files`);
} finally {
  for (const u of users) {
    const { data: files } = await admin.storage.from("saved-looks").list(u.id);
    if (files?.length) await admin.storage.from("saved-looks").remove(files.map((f) => `${u.id}/${f.name}`));
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log("Cleaned up test users, rows and files.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
