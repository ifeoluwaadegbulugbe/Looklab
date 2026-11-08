"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TryOnSheet } from "@/components/tryon/TryOnSheet";

export interface OutfitPiece { id: string; slug: string; title: string; imageUrl: string }

export function OutfitBuilder({ uppers, lowers }: { uppers: OutfitPiece[]; lowers: OutfitPiece[] }) {
  const params = useSearchParams();
  const start = params.get("with");
  const [upper, setUpper] = useState<OutfitPiece | null>(uppers.find((p) => p.slug === start) ?? null);
  const [lower, setLower] = useState<OutfitPiece | null>(lowers.find((p) => p.slug === start) ?? null);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-8">
        <Picker label="1. Top or jacket" pieces={uppers} selected={upper} onSelect={setUpper} />
        <Picker label="2. Trousers or skirt" pieces={lowers} selected={lower} onSelect={setLower} />
      </div>

      <aside aria-labelledby="your-outfit" className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-card bg-surface p-4">
          <h2 id="your-outfit" className="font-display text-xl font-bold">Your outfit</h2>
          <div className="mt-3 flex flex-col items-center gap-1 rounded-[18px] bg-white p-3">
            <Slot piece={upper} empty="Pick a top or jacket" />
            <Slot piece={lower} empty="Pick a bottom" />
          </div>
          <div className="mt-4 hidden lg:block">
            <TryButton upper={upper} lower={lower} />
          </div>
        </div>
      </aside>

      {/* Sticky action on mobile */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-ink/10 bg-bg/95 p-3 backdrop-blur lg:hidden">
        <TryButton upper={upper} lower={lower} />
      </div>
    </div>
  );
}

function TryButton({ upper, lower }: { upper: OutfitPiece | null; lower: OutfitPiece | null }) {
  if (!upper || !lower) {
    return (
      <button type="button" disabled className="min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white opacity-40">
        {upper || lower ? "Pick one more piece" : "Pick two pieces"}
      </button>
    );
  }
  return (
    <TryOnSheet
      key={`${upper.id}+${lower.id}`}
      product={{ id: upper.id, title: upper.title, imageUrl: upper.imageUrl }}
      outfitWith={{ id: lower.id, title: lower.title, imageUrl: lower.imageUrl }}
      triggerLabel="Try the outfit on · 2 try-ons"
      triggerClassName="min-h-12 w-full rounded-full bg-primary px-6 font-semibold text-white shadow-lg transition active:scale-[0.98]"
    />
  );
}

function Slot({ piece, empty }: { piece: OutfitPiece | null; empty: string }) {
  return piece ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={piece.imageUrl} alt={piece.title} className="h-36 w-full object-contain" />
  ) : (
    <div className="grid h-36 w-full place-items-center rounded-2xl border-2 border-dashed border-ink/15 text-sm opacity-60">{empty}</div>
  );
}

function Picker({ label, pieces, selected, onSelect }: { label: string; pieces: OutfitPiece[]; selected: OutfitPiece | null; onSelect: (p: OutfitPiece) => void }) {
  return (
    <section aria-label={label}>
      <h2 className="mb-3 font-display text-xl font-bold">{label}</h2>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label={label}>
        {pieces.map((p) => {
          const on = selected?.id === p.id;
          return (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSelect(p)}
                className={`flex w-36 flex-col gap-2 rounded-card bg-surface p-2 text-left transition active:scale-[0.98] ${on ? "ring-4 ring-primary" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt="" className="aspect-[4/5] w-full rounded-[18px] bg-white object-contain p-2" />
                <span className="line-clamp-2 px-1 text-xs font-semibold">{p.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
