"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog";
import { useFavourites } from "@/components/favourites/useFavourites";
import { ProductCard } from "@/components/ProductCard";
import { ButtonLink } from "@/components/ui/Button";

type Tab = "items" | "looks";

export function SavedTabs({ products, aestheticNames }: { products: Product[]; aestheticNames: [string, string][] }) {
  const [tab, setTab] = useState<Tab>("items");
  const { ids } = useFavourites();
  const names = useMemo(() => new Map(aestheticNames), [aestheticNames]);
  const saved = products.filter((p) => ids.has(p.id));

  return (
    <>
      <div role="tablist" aria-label="Saved" className="mt-4 inline-flex rounded-full bg-surface p-1">
        {(["items", "looks"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full px-5 text-sm font-semibold ${tab === t ? "bg-ink text-white" : ""}`}
          >
            {t === "items" ? `Items${saved.length ? ` (${saved.length})` : ""}` : "Looks"}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "items" ? (
          saved.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {saved.map((p) => <li key={p.id}><ProductCard product={p} aestheticNames={names} /></li>)}
            </ul>
          ) : (
            <Empty sticker="No hearts yet" text="Tap the heart on any piece to keep it here." />
          )
        ) : (
          <Empty sticker="No looks yet" text="Looks you save from your try-ons will live here, even after the 24-hour preview link expires." />
        )}
      </div>
    </>
  );
}

function Empty({ sticker, text }: { sticker: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-14 text-center">
      <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">{sticker}</span>
      <p className="max-w-sm opacity-80">{text}</p>
      <ButtonLink href="/shop" variant="secondary">Browse pieces</ButtonLink>
    </div>
  );
}
