import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/server";

export interface Category { id: string; slug: string; name: string; sort_order: number }
export interface Aesthetic { id: string; slug: string; name: string; blurb: string | null; sort_order: number }
export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  section: "women" | "men" | "unisex";
  colour: string | null;
  image_url: string;
  is_demo: boolean;
  tryon_enabled: boolean;
  created_at: string;
  category: { slug: string; name: string } | null;
  aesthetics: string[]; // aesthetic slugs
}
export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  productIds: string[];
}
export interface Catalog {
  categories: Category[];
  aesthetics: Aesthetic[];
  products: Product[];
  collections: Collection[];
}

/** The whole demo catalogue in one cached read (it's small). Filter in memory. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const sb = getPublicSupabase();
  const [cats, aes, prods, cols] = await Promise.all([
    sb.from("categories").select("id,slug,name,sort_order").order("sort_order"),
    sb.from("aesthetics").select("id,slug,name,blurb,sort_order").order("sort_order"),
    sb.from("products")
      .select("id,slug,title,description,section,colour,image_url,is_demo,tryon_enabled,created_at,category:categories(slug,name),product_aesthetics(aesthetics(slug))")
      .order("created_at", { ascending: false }),
    sb.from("collections").select("id,slug,title,description,sort_order,collection_items(product_id,sort_order)").order("sort_order"),
  ]);
  if (cats.error || aes.error || prods.error || cols.error) throw new Error("catalogue unavailable");

  type RawProduct = Omit<Product, "aesthetics"> & { product_aesthetics: { aesthetics: { slug: string } | null }[] };
  type RawCollection = Omit<Collection, "productIds"> & { collection_items: { product_id: string; sort_order: number }[] };

  return {
    categories: cats.data,
    aesthetics: aes.data,
    products: (prods.data as unknown as RawProduct[]).map(({ product_aesthetics, ...p }) => ({
      ...p,
      aesthetics: product_aesthetics.map((pa) => pa.aesthetics?.slug).filter((s): s is string => !!s),
    })),
    collections: (cols.data as unknown as RawCollection[]).map(({ collection_items, ...c }) => ({
      ...c,
      productIds: [...collection_items].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.product_id),
    })),
  };
}

/** "New in" = the most recently added demo items (no fake popularity signals). */
export function newInIds(catalog: Catalog, n = 4) {
  return new Set(catalog.products.slice(0, n).map((p) => p.id)); // products are ordered newest first
}

export const aestheticNameMap = (catalog: Catalog) => new Map(catalog.aesthetics.map((a) => [a.slug, a.name]));

export async function getProductBySlug(slug: string) {
  return (await getCatalog()).products.find((p) => p.slug === slug) ?? null;
}

export function collectionProducts(catalog: Catalog, c: Collection) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  return c.productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

export interface ShopFilters { q?: string; category?: string; aesthetic?: string; colour?: string; sort?: "new" | "az" }

export function filterProducts(products: Product[], f: ShopFilters) {
  const q = f.q?.trim().toLowerCase();
  let out = products.filter((p) =>
    (!f.category || p.category?.slug === f.category) &&
    (!f.aesthetic || p.aesthetics.includes(f.aesthetic)) &&
    (!f.colour || p.colour === f.colour) &&
    (!q || [p.title, p.description, p.colour, p.category?.name, ...p.aesthetics].some((s) => s?.toLowerCase().includes(q))),
  );
  if (f.sort === "az") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

