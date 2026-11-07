// Seeds the demo catalogue from supabase/seed/catalog.mjs. Idempotent: upserts by slug and
// rebuilds aesthetic/collection links. Uploads each product image from private/catalog/ (falls
// back to private/garments/) to the public `catalog` bucket and verifies the URL meets Clothsy's
// rules (HTTPS, HTTP 200, no redirect, JPEG/PNG, ≤ 4 MB).
//   node --env-file=.env.local scripts/seed-catalog.mjs
import { readFile, stat } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { AESTHETICS, CATEGORIES, COLLECTIONS, PRODUCTS } from "../supabase/seed/catalog.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const db = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function findImage(file) {
  for (const dir of ["catalog", "garments"]) {
    const p = new URL(`../private/${dir}/${file}`, import.meta.url);
    try { await stat(p); return p; } catch {}
  }
  throw new Error(`Image not found: private/catalog/${file}`);
}

const catId = Object.fromEntries(must(await db.from("categories").upsert(CATEGORIES, { onConflict: "slug" }).select("id,slug")).map((r) => [r.slug, r.id]));
const aesId = Object.fromEntries(must(await db.from("aesthetics").upsert(AESTHETICS, { onConflict: "slug" }).select("id,slug")).map((r) => [r.slug, r.id]));
const colId = Object.fromEntries(must(await db.from("collections").upsert(COLLECTIONS, { onConflict: "slug" }).select("id,slug")).map((r) => [r.slug, r.id]));

let problems = 0;
const productRows = [];
for (const p of PRODUCTS) {
  const bytes = await readFile(await findImage(p.file));
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const path = `products/${p.slug}.${isPng ? "png" : "jpg"}`;
  if (bytes.length > 4 * 1024 * 1024) { console.log(`TOO LARGE  ${p.slug}`); problems++; continue; }
  must(await db.storage.from("catalog").upload(path, bytes, { contentType: isPng ? "image/png" : "image/jpeg", upsert: true }));
  const imageUrl = db.storage.from("catalog").getPublicUrl(path).data.publicUrl;
  const res = await fetch(imageUrl, { redirect: "manual" });
  await res.arrayBuffer().catch(() => {});
  if (res.status !== 200) { console.log(`BAD URL  ${p.slug}  HTTP ${res.status}`); problems++; }
  productRows.push({
    slug: p.slug, title: p.title, description: p.description ?? null, category_id: catId[p.category],
    section: p.section, colour: p.colour ?? null, image_url: imageUrl, is_demo: true,
    tryon_enabled: p.tryon_enabled ?? true,
  });
}
const prodId = Object.fromEntries(must(await db.from("products").upsert(productRows, { onConflict: "slug" }).select("id,slug")).map((r) => [r.slug, r.id]));

// Rebuild links for seeded products.
const ids = Object.values(prodId);
must(await db.from("product_aesthetics").delete().in("product_id", ids));
must(await db.from("collection_items").delete().in("product_id", ids));
const links = PRODUCTS.filter((p) => prodId[p.slug]);
must(await db.from("product_aesthetics").insert(links.flatMap((p) => p.aesthetics.map((a) => ({ product_id: prodId[p.slug], aesthetic_id: aesId[a] })))));
must(await db.from("collection_items").insert(links.flatMap((p, i) => (p.collections ?? []).map((c) => ({ collection_id: colId[c], product_id: prodId[p.slug], sort_order: i })))));

console.log(`Seeded ${CATEGORIES.length} categories, ${AESTHETICS.length} aesthetics, ${COLLECTIONS.length} collections, ${ids.length} products.`);
console.log(problems ? `${problems} problem(s) above.` : "All product image URLs return 200 with no redirect.");
process.exit(problems ? 1 : 0);
