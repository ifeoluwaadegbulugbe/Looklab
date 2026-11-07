import type { Metadata } from "next";
import { aestheticNameMap, getCatalog } from "@/lib/catalog";
import { SavedTabs } from "@/components/saved/SavedTabs";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const catalog = await getCatalog();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Saved</h1>
      <SavedTabs products={catalog.products} aestheticNames={[...aestheticNameMap(catalog)]} />
    </main>
  );
}
