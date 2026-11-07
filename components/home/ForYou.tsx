"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { readPrefs, subscribePrefs } from "@/lib/preferences";
import { scoreForYouClient } from "@/lib/preferences";

/**
 * Orders the feed by a transparent tag-overlap score with the shopper's onboarding picks.
 * Without picks it falls back to the editor's order and invites them to personalise.
 */
export function ForYou({ products, aestheticNames }: { products: Product[]; aestheticNames: [string, string][] }) {
  const prefsJson = useSyncExternalStore(subscribePrefs, () => JSON.stringify(readPrefs()), () => "null");
  const prefs = JSON.parse(prefsJson) as ReturnType<typeof readPrefs>;
  const names = useMemo(() => new Map(aestheticNames), [aestheticNames]);

  const has = !!prefs && (prefs.aesthetics.length > 0 || prefs.sections.length > 0);
  const ordered = useMemo(() => {
    if (!has || !prefs) return products;
    return [...products]
      .map((p, i) => ({ p, i, s: scoreForYouClient(p, prefs) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.p);
  }, [products, has, prefs]);

  return (
    <section aria-labelledby="for-you" className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="for-you" className="font-display text-2xl font-bold">{has ? "For you" : "Editor's picks"}</h2>
          <p className="text-sm opacity-70">
            {has
              ? `Matched to ${prefs!.aesthetics.map((a) => names.get(a) ?? a).join(", ") || "your picks"}.`
              : "Tell us your vibe and we'll put your kind of pieces first."}
          </p>
        </div>
        <Link href="/welcome" className="shrink-0 text-sm font-semibold underline">
          {has ? "Edit picks" : "Pick my vibe"}
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((p) => (
          <li key={p.id}><ProductCard product={p} aestheticNames={names} /></li>
        ))}
      </ul>
    </section>
  );
}
