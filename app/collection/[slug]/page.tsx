import { Suspense } from "react";
import { notFound } from "next/navigation";
import { aestheticNameMap, collectionProducts, getCatalog } from "@/lib/catalog";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.collections.map((c) => ({ slug: c.slug }));
}

export default function CollectionPage({ params }: PageProps<"/collection/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
      <Suspense fallback={<><div className="looklab-skeleton h-48 rounded-[32px]" /><div className="mt-6"><ProductGridSkeleton count={4} /></div></>}>
        <CollectionDetail params={params} />
      </Suspense>
    </main>
  );
}

async function CollectionDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const collection = catalog.collections.find((c) => c.slug === slug);
  if (!collection) notFound();
  const items = collectionProducts(catalog, collection);
  const first = items.find((p) => p.tryon_enabled);

  return (
    <>
      <header className="relative overflow-hidden rounded-[32px] bg-lavender px-6 py-8 md:px-10">
        <Sticker tone="butter">Collection</Sticker>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">{collection.title}</h1>
        {collection.description && <p className="mt-2 max-w-lg">{collection.description}</p>}
        {first && (
          <div className="mt-5">
            <ButtonLink href={`/product/${first.slug}?try=1`}>Try on a few</ButtonLink>
          </div>
        )}
      </header>
      <div className="mt-6">
        {items.length > 0 ? (
          <ProductGrid products={items} aestheticNames={aestheticNameMap(catalog)} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center">
            <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">Coming soon</span>
            <p className="opacity-80">This edit is still being styled. Have a look around in the meantime.</p>
            <ButtonLink href="/shop" variant="secondary">Shop all</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
