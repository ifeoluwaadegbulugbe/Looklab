import Link from "next/link";
import { aestheticNameMap, collectionProducts, getCatalog, newInIds } from "@/lib/catalog";
import { CategoryCard, CollectionCard } from "@/components/CollectionCard";
import { ForYou } from "@/components/home/ForYou";
import { FirstVisitRedirect } from "@/components/onboarding/FirstVisitRedirect";
import { ProductGrid } from "@/components/ProductCard";
import { SparkleIcon } from "@/components/icons";
import { Sticker } from "@/components/ui/Sticker";

export default async function Home() {
  const catalog = await getCatalog();
  const names = aestheticNameMap(catalog);
  const tryable = catalog.products.filter((p) => p.tryon_enabled);
  const strip = tryable.slice(0, 3);
  const collections = catalog.collections
    .map((c) => ({ c, items: collectionProducts(catalog, c) }))
    .filter((x) => x.items.length > 0);
  const newIds = newInIds(catalog);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8">
      <FirstVisitRedirect />
      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-[32px] bg-ink px-6 pb-6 pt-8 text-white md:px-10 md:pt-12">
        <Sticker tone="lime" tilt={-4}>AI try-on</Sticker>
        <h1 className="mt-3 max-w-xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
          See it on <span className="text-butter">you</span> before you decide.
        </h1>
        <p className="mt-3 max-w-md text-white/80">Discover it. Try it. Make it yours. One photo, every piece, one tap each.</p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-white/70">Try something on</h2>
        <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {strip.map((p) => (
            <li key={p.id} className="shrink-0">
              <Link href={`/product/${p.slug}?try=1`} className="group flex w-36 flex-col gap-2 rounded-card bg-white/10 p-2 transition hover:bg-white/15 md:w-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" className="aspect-[4/5] w-full rounded-[18px] bg-white object-contain p-2" />
                <span className="flex items-center justify-between gap-1 px-1 text-xs font-semibold">
                  <span className="line-clamp-1">{p.title}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary" aria-hidden><SparkleIcon className="size-4" /></span>
                </span>
                <span className="sr-only">Try on {p.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ForYou products={catalog.products} aestheticNames={[...names]} />

      {collections.length > 0 && (
        <section aria-labelledby="collections" className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="collections" className="font-display text-2xl font-bold">Collections</h2>
            <Link href="/explore" className="text-sm font-semibold underline">See all</Link>
          </div>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {collections.map(({ c, items }, i) => (
              <li key={c.id}><CollectionCard collection={c} products={items} index={i} /></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="categories" className="mt-12">
        <h2 id="categories" className="mb-4 font-display text-2xl font-bold">Shop by category</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {catalog.categories.map((cat) => (
            <li key={cat.id}>
              <CategoryCard category={cat} product={catalog.products.find((p) => p.category?.slug === cat.slug)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="new-in" className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="new-in" className="font-display text-2xl font-bold">New in</h2>
          <Link href="/shop" className="text-sm font-semibold underline">Shop all</Link>
        </div>
        <ProductGrid products={catalog.products.filter((p) => newIds.has(p.id))} aestheticNames={names} newIds={newIds} />
      </section>
    </main>
  );
}
