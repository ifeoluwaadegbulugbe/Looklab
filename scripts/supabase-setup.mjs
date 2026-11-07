// One-off Supabase setup: checks keys, creates storage buckets, uploads test garments
// and verifies each public URL meets Clothsy's rules (HTTPS, 200, no redirect).
// Idempotent: safe to re-run.
//   node --env-file=.env.local scripts/supabase-setup.mjs
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

console.log("URL looks right:", /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url));
console.log("Publishable key present:", publishable.length > 0, "| secret key present:", secret.length > 0);
if (!url || !publishable || !secret) process.exit(1);

// Publishable key: a harmless public call.
const pub = createClient(url, publishable);
const { error: pubErr } = await pub.auth.getSession();
console.log("Publishable key works:", !pubErr);

const admin = createClient(url, secret, { auth: { persistSession: false } });

const BUCKETS = [
  { id: "catalog", public: true, fileSizeLimit: "4MB", allowedMimeTypes: ["image/jpeg", "image/png"] },
  { id: "saved-looks", public: false, fileSizeLimit: "10MB", allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
];
const { data: existing, error: listErr } = await admin.storage.listBuckets();
if (listErr) {
  console.error("Secret key failed:", listErr.message);
  process.exit(1);
}
console.log("Secret key works: true");
for (const b of BUCKETS) {
  const opts = { public: b.public, fileSizeLimit: b.fileSizeLimit, allowedMimeTypes: b.allowedMimeTypes };
  const has = existing.some((e) => e.id === b.id);
  const { error } = has ? await admin.storage.updateBucket(b.id, opts) : await admin.storage.createBucket(b.id, opts);
  console.log(`Bucket ${b.id} (${b.public ? "public" : "private"}): ${error ? "ERROR " + error.message : has ? "updated" : "created"}`);
}

// Test garments (the four that passed the Day 1 matrix).
const GARMENTS = ["top", "jacket", "trousers", "skirt"];
for (const g of GARMENTS) {
  const bytes = await readFile(new URL(`../private/garments/${g}.jpg`, import.meta.url));
  const path = `test/${g}.jpg`;
  const { error } = await admin.storage.from("catalog").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.log(`${g}: upload ERROR ${error.message}`);
    continue;
  }
  const publicUrl = admin.storage.from("catalog").getPublicUrl(path).data.publicUrl;
  const t = Date.now();
  const res = await fetch(publicUrl, { redirect: "manual" });
  console.log(`${g}: HTTP ${res.status} ${res.headers.get("content-type")} in ${Date.now() - t} ms -> ${publicUrl}`);
}
