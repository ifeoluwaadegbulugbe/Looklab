// Seeds the 4 garments that passed the Day 1 test matrix as real catalogue rows (Day 1 only;
// the full Day 2 catalogue seed replaces this). Idempotent: upserts by slug.
//   node --env-file=.env.local scripts/seed-test-products.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const img = (f) => `${url}/storage/v1/object/public/catalog/test/${f}`;

const CATEGORIES = [
  { slug: "tops", name: "Tops", sort_order: 1 },
  { slug: "jackets", name: "Jackets & coats", sort_order: 2 },
  { slug: "trousers", name: "Trousers & jeans", sort_order: 3 },
  { slug: "skirts", name: "Skirts", sort_order: 4 },
];
const PRODUCTS = [
  { slug: "navy-pinstripe-off-shoulder-top", title: "Navy pinstripe off-shoulder button top", category: "tops", colour: "navy", file: "top.jpg",
    description: "Fold-over off-shoulder neckline, tortoiseshell buttons and a fitted, ruched waist." },
  { slug: "burgundy-leather-cropped-bomber", title: "Burgundy leather cropped bomber jacket", category: "jackets", colour: "burgundy", file: "jacket.jpg",
    description: "Cropped bomber with dramatic gathered sleeves and ribbed trims." },
  { slug: "mid-blue-wide-leg-jeans", title: "Mid-blue wide-leg high-rise jeans", category: "trousers", colour: "blue", file: "trousers.jpg",
    description: "High-rise, floor-grazing wide leg in a classic mid-blue wash." },
  { slug: "black-faux-leather-mini-skirt", title: "Black faux-leather mini skirt", category: "skirts", colour: "black", file: "skirt.jpg",
    description: "High-waisted mini with front darts and a soft sheen." },
];

const { data: cats, error: ce } = await admin.from("categories").upsert(CATEGORIES, { onConflict: "slug" }).select("id,slug");
if (ce) throw ce;
const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

const rows = PRODUCTS.map(({ category, file, ...p }) => ({
  ...p, category_id: catId[category], section: "women", image_url: img(file), is_demo: true, tryon_enabled: true,
}));
const { data: prods, error: pe } = await admin.from("products").upsert(rows, { onConflict: "slug" }).select("id,slug,title");
if (pe) throw pe;
for (const p of prods) console.log(`${p.slug}  ${p.id}`);
console.log(`Seeded ${cats.length} categories, ${prods.length} products.`);
