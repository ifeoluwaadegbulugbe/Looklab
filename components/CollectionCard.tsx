import Link from "next/link";
import type { Category, Collection, Product } from "@/lib/catalog";

const BLOCKS = ["bg-lavender", "bg-butter", "bg-tangerine", "bg-lime"] as const;
export const CATEGORY_TONE: Record<string, string> = {
  tops: "bg-butter",
  jackets: "bg-tangerine",
  trousers: "bg-lavender",
  skirts: "bg-lime",
};

/** Colour block with up to three overlapping product cut-outs. */
export function CollectionCard({ collection, products, index }: { collection: Collection; products: Product[]; index: number }) {
  const pics = products.slice(0, 3);
  return (
    <Link href={`/collection/${collection.slug}`} className={`group relative flex h-64 w-60 shrink-0 flex-col justify-end overflow-hidden rounded-card p-4 ${BLOCKS[index % BLOCKS.length]} transition active:scale-[0.98]`}>
      <div className="absolute inset-x-0 top-3 flex justify-center">
        {pics.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.image_url}
            alt=""
            style={{ rotate: `${(i - 1) * 7}deg`, zIndex: i === 1 ? 2 : 1 }}
            className={`-mx-5 h-36 w-28 rounded-2xl bg-white object-contain p-1 shadow-md transition duration-300 group-hover:-translate-y-1 ${i === 1 ? "mt-0" : "mt-4"}`}
          />
        ))}
      </div>
      <div className="relative">
        <h3 className="font-display text-xl font-bold leading-tight">{collection.title}</h3>
        <p className="text-xs font-semibold opacity-75">{products.length} {products.length === 1 ? "piece" : "pieces"}</p>
      </div>
    </Link>
  );
}

export function CategoryCard({ category, product }: { category: Category; product?: Product }) {
  return (
    <Link href={`/shop?category=${category.slug}`} className={`group relative flex h-40 items-end overflow-hidden rounded-card p-4 ${CATEGORY_TONE[category.slug] ?? "bg-lavender"} transition active:scale-[0.98] md:h-48`}>
      <h3 className="relative z-10 font-display text-xl font-bold leading-tight">{category.name}</h3>
      {product && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url} alt="" className="absolute -right-3 -top-2 h-[115%] w-3/5 rotate-6 object-contain mix-blend-multiply transition duration-300 group-hover:rotate-3" />
      )}
    </Link>
  );
}
