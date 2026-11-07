"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons";
import { useFavourites } from "@/components/favourites/useFavourites";

export function FavouriteButton({ productId, title, className = "" }: { productId: string; title: string; className?: string }) {
  const { ids, toggle } = useFavourites();
  const [busy, setBusy] = useState(false);
  const on = ids.has(productId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from saved items` : `Save ${title}`}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        try { await toggle(productId); } finally { setBusy(false); }
      }}
      className={`grid size-11 place-items-center rounded-full bg-surface/90 shadow-sm transition active:scale-90 ${on ? "text-secondary" : "text-ink"} ${className}`}
    >
      <HeartIcon filled={on} className="size-5" />
    </button>
  );
}
