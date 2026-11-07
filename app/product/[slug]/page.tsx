import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { aestheticNameMap, getCatalog, getProductBySlug } from "@/lib/catalog";
import { TryOnSheet } from "@/components/tryon/TryOnSheet";
import { FavouriteButton } from "@/components/favourites/FavouriteButton";
import { ProductGrid } from "@/components/ProductCard";
import { ArrowLeftIcon } from "@/components/icons";
import { Sticker } from "@/components/ui/Sticker";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return { title: product?.title ?? "Not found" };
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-8">
      <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <ArrowLeftIcon /> Shop
      </Link>
      <Suspense fallback={<div className="looklab-skeleton mt-4 aspect-[4/5] w-full max-w-md rounded-card" />}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const names = aestheticNameMap(catalog);
  const related = catalog.products
    .filter((p) => p.id !== product.id)
    .map((p) => ({ p, s: p.aesthetics.filter((a) => product.aesthetics.includes(a)).length + (p.category?.slug === product.category?.slug ? 0 : 0.5) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.p);

  return (
    <>
      <article className="mt-2 grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image_url} alt={product.title} className="aspect-[4/5] w-full rounded-card bg-white object-contain p-4" />
          {product.is_demo && <Sticker className="absolute left-4 top-4">Demo item</Sticker>}
          <FavouriteButton productId={product.id} title={product.title} className="absolute right-4 top-4" />
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <Link href={`/shop?category=${product.category.slug}`} className="text-sm font-semibold uppercase tracking-wider opacity-70 hover:underline">
              {product.category.name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{product.title}</h1>
          {product.description && <p className="text-lg">{product.description}</p>}

          {product.aesthetics.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Aesthetics">
              {product.aesthetics.map((a) => (
                <li key={a}>
                  <Link href={`/shop?aesthetic=${a}`} className="inline-flex min-h-9 items-center rounded-full bg-lavender px-3 text-sm font-semibold">
                    {names.get(a) ?? a}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="fixed inset-x-0 bottom-16 z-20 border-t border-ink/10 bg-bg/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
            {product.tryon_enabled ? (
              <TryOnSheet
                product={{ id: product.id, title: product.title, imageUrl: product.image_url }}
                triggerClassName="min-h-12 w-full rounded-full bg-primary px-8 text-lg font-semibold text-white shadow-lg transition active:scale-[0.98] md:w-auto"
              />
            ) : (
              <p className="rounded-2xl bg-surface p-4 text-sm">Virtual try-on isn&apos;t available for this item.</p>
            )}
          </div>

          <p className="rounded-2xl bg-surface p-4 text-sm">
            <strong>AI preview, not a fit guarantee.</strong> Try-ons show how a piece could look on you. They can&apos;t
            predict size, fit or how the fabric moves. This is a demo catalogue item: no brand, price or shop link.
          </p>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-12">
          <h2 id="related" className="mb-4 font-display text-2xl font-bold">More like this</h2>
          <ProductGrid products={related} aestheticNames={names} />
        </section>
      )}
    </>
  );
}
