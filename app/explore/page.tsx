import Link from "next/link";
import type { Metadata } from "next";
import { collectionProducts, getCatalog } from "@/lib/catalog";
import { CategoryCard, CollectionCard } from "@/components/CollectionCard";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Explore" };

const AESTHETIC_TONES = ["bg-lavender", "bg-butter", "bg-lime", "bg-tangerine"];

export default async function ExplorePage() {
  const catalog = await getCatalog();
  const collections = catalog.collections.map((c) => ({ c, items: collectionProducts(catalog, c) }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Explore</h1>

      <form action="/shop" role="search" className="mt-4 flex items-center gap-2 rounded-full border-2 border-ink/15 bg-surface px-4 focus-within:border-ink">
        <SearchIcon className="size-5 opacity-60" />
        <label htmlFor="explore-q" className="sr-only">Search pieces</label>
        <input id="explore-q" name="q" type="search" placeholder="Search jackets, denim, Y2K…" className="min-h-12 flex-1 bg-transparent outline-none" />
      </form>

      <section aria-labelledby="cats" className="mt-8">
        <h2 id="cats" className="mb-4 font-display text-2xl font-bold">Categories</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {catalog.categories.map((cat) => (
            <li key={cat.id}><CategoryCard category={cat} product={catalog.products.find((p) => p.category?.slug === cat.slug)} /></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="aes" className="mt-10">
        <h2 id="aes" className="mb-4 font-display text-2xl font-bold">Aesthetics</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.aesthetics.map((a, i) => {
            const count = catalog.products.filter((p) => p.aesthetics.includes(a.slug)).length;
            return (
              <li key={a.id}>
                <Link href={`/shop?aesthetic=${a.slug}`} className={`flex h-full flex-col gap-1 rounded-card p-4 transition active:scale-[0.98] ${AESTHETIC_TONES[i % AESTHETIC_TONES.length]}`}>
                  <span className="font-display text-lg font-bold">{a.name}</span>
                  <span className="text-sm opacity-80">{a.blurb}</span>
                  <span className="mt-auto pt-2 text-xs font-semibold">{count} {count === 1 ? "piece" : "pieces"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="cols" className="mt-10">
        <h2 id="cols" className="mb-4 font-display text-2xl font-bold">Collections</h2>
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {collections.map(({ c, items }, i) => (
            <li key={c.id}><CollectionCard collection={c} products={items} index={i} /></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
