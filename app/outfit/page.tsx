import { Suspense } from "react";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { OutfitBuilder, type OutfitPiece } from "@/components/outfit/OutfitBuilder";
import { Sticker } from "@/components/ui/Sticker";

export const metadata: Metadata = { title: "Build an outfit" };

const UPPER = ["tops", "jackets"];
const LOWER = ["trousers", "skirts"];

export default async function OutfitPage() {
  const catalog = await getCatalog();
  const piece = (p: (typeof catalog.products)[number]): OutfitPiece => ({ id: p.id, slug: p.slug, title: p.title, imageUrl: p.image_url });
  const tryable = catalog.products.filter((p) => p.tryon_enabled && p.category);
  const uppers = tryable.filter((p) => UPPER.includes(p.category!.slug)).map(piece);
  const lowers = tryable.filter((p) => LOWER.includes(p.category!.slug)).map(piece);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-8">
      <Sticker tone="butter">Layered try-on</Sticker>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Build an outfit</h1>
      <p className="mt-1 max-w-xl opacity-80">
        Pick a top or jacket and a bottom. We put the top on you first, then add the bottom on top of that look, so
        you see the whole outfit together. It uses 2 try-ons, one per piece.
      </p>
      <Suspense fallback={<div className="looklab-skeleton mt-6 h-64 rounded-card" />}>
        <OutfitBuilder uppers={uppers} lowers={lowers} />
      </Suspense>
    </main>
  );
}
