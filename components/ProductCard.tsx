import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { FavouriteButton } from "@/components/favourites/FavouriteButton";
import { SparkleIcon } from "@/components/icons";
import { Sticker } from "@/components/ui/Sticker";

export function ProductCard({ product, aestheticNames, isNew = false }: { product: Product; aestheticNames?: Map<string, string>; isNew?: boolean }) {
  const tags = product.aesthetics.slice(0, 2).map((s) => aestheticNames?.get(s) ?? s);
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block rounded-card bg-surface p-2 transition active:scale-[0.98]">
        <div className="relative overflow-hidden rounded-[18px] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image_url} alt={product.title} loading="lazy" className="aspect-[4/5] w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03]" />
          {isNew && <Sticker tone="tangerine" className="absolute left-2 top-2">New in</Sticker>}
        </div>
        <div className="px-1 pb-1 pt-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
          {tags.length > 0 && <p className="mt-0.5 text-xs opacity-70">{tags.join(" · ")}</p>}
        </div>
      </Link>
      <FavouriteButton productId={product.id} title={product.title} className="absolute right-4 top-4" />
      {product.tryon_enabled && (
        <Link
          href={`/product/${product.slug}?try=1`}
          aria-label={`Try on ${product.title}`}
          className="absolute bottom-[4.5rem] right-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-white shadow-md transition active:scale-95"
        >
          <SparkleIcon className="size-4" /> Try
        </Link>
      )}
    </article>
  );
}

export function ProductGrid({ products, aestheticNames, newIds }: { products: Product[]; aestheticNames?: Map<string, string>; newIds?: Set<string> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}><ProductCard product={p} aestheticNames={aestheticNames} isNew={newIds?.has(p.id)} /></li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-card bg-surface p-2">
          <div className="looklab-skeleton aspect-[4/5] rounded-[18px]" />
          <div className="looklab-skeleton mt-2 h-4 w-3/4 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
