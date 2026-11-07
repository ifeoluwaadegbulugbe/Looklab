import { Suspense } from "react";
import type { Metadata } from "next";
import { aestheticNameMap, filterProducts, getCatalog, type ShopFilters } from "@/lib/catalog";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { ChipLink } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Shop" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
      <Suspense fallback={<ShopSkeleton />}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function ShopSkeleton() {
  return (
    <>
      <div className="looklab-skeleton h-10 w-48 rounded-full" />
      <div className="looklab-skeleton mt-4 h-12 rounded-full" />
      <div className="mt-6"><ProductGridSkeleton /></div>
    </>
  );
}

async function ShopResults({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const sp = await searchParams;
  const f: ShopFilters = {
    q: one(sp.q)?.slice(0, 80),
    category: one(sp.category),
    aesthetic: one(sp.aesthetic),
    colour: one(sp.colour),
    sort: one(sp.sort) === "az" ? "az" : "new",
  };
  const catalog = await getCatalog();
  const names = aestheticNameMap(catalog);
  const results = filterProducts(catalog.products, f);
  const colours = [...new Set(catalog.products.map((p) => p.colour).filter((c): c is string => !!c))].sort();
  const category = catalog.categories.find((c) => c.slug === f.category);

  const href = (patch: Partial<ShopFilters>) => {
    const next = { ...f, ...patch };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "new")) qs.set(k, v);
    const s = qs.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const title = f.q ? `“${f.q}”` : category?.name ?? (f.aesthetic ? names.get(f.aesthetic) ?? "Shop" : "Shop all");
  const anyFilter = !!(f.q || f.category || f.aesthetic || f.colour);

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>

      <form action="/shop" role="search" className="mt-4 flex items-center gap-2 rounded-full border-2 border-ink/15 bg-surface px-4 focus-within:border-ink">
        {f.category && <input type="hidden" name="category" value={f.category} />}
        <SearchIcon className="size-5 opacity-60" />
        <label htmlFor="shop-q" className="sr-only">Search pieces</label>
        <input id="shop-q" name="q" type="search" defaultValue={f.q} placeholder="Search by name, colour or vibe" className="min-h-12 flex-1 bg-transparent outline-none" />
      </form>

      <div className="mt-5 flex flex-col gap-3">
        <FilterRow label="Category">
          <ChipLink href={href({ category: undefined })} active={!f.category}>All</ChipLink>
          {catalog.categories.map((c) => (
            <ChipLink key={c.id} href={href({ category: c.slug })} active={f.category === c.slug}>{c.name}</ChipLink>
          ))}
        </FilterRow>
        <FilterRow label="Aesthetic">
          <ChipLink href={href({ aesthetic: undefined })} active={!f.aesthetic}>Any</ChipLink>
          {catalog.aesthetics.map((a) => (
            <ChipLink key={a.id} href={href({ aesthetic: a.slug })} active={f.aesthetic === a.slug}>{a.name}</ChipLink>
          ))}
        </FilterRow>
        <FilterRow label="Colour">
          <ChipLink href={href({ colour: undefined })} active={!f.colour}>Any</ChipLink>
          {colours.map((c) => (
            <ChipLink key={c} href={href({ colour: c })} active={f.colour === c}><span className="capitalize">{c}</span></ChipLink>
          ))}
        </FilterRow>
      </div>

      <div className="mb-4 mt-6 flex items-center justify-between gap-4 text-sm">
        <p role="status">{results.length} {results.length === 1 ? "piece" : "pieces"}</p>
        <div className="flex gap-2">
          <ChipLink href={href({ sort: "new" })} active={f.sort === "new"}>New</ChipLink>
          <ChipLink href={href({ sort: "az" })} active={f.sort === "az"}>A–Z</ChipLink>
        </div>
      </div>

      {results.length > 0 ? (
        <ProductGrid products={results} aestheticNames={names} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center">
          <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">Nothing here yet</span>
          <p className="max-w-sm opacity-80">No pieces match those filters. Try another aesthetic, or clear the filters.</p>
          {anyFilter && <ButtonLink href="/shop" variant="secondary">Clear filters</ButtonLink>}
        </div>
      )}
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider opacity-60">{label}</span>
      <div className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pr-4">{children}</div>
    </div>
  );
}
