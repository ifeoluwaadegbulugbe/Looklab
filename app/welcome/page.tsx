import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const catalog = await getCatalog();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
      <Onboarding
        aesthetics={catalog.aesthetics.map((a) => ({ slug: a.slug, name: a.name, blurb: a.blurb }))}
        heroImages={catalog.products.slice(0, 4).map((p) => p.image_url)}
      />
    </main>
  );
}
