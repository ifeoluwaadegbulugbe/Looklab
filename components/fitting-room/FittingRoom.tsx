"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFittingRoom, type FittingRoomItem } from "@/components/fitting-room/useFittingRoom";
import { ButtonLink } from "@/components/ui/Button";
import type { TryOnStatusResponse } from "@/lib/tryon-types";

const STATE = {
  pending: { label: "Working", cls: "bg-butter" },
  success: { label: "Ready", cls: "bg-lime" },
  failed: { label: "Didn't work", cls: "bg-secondary/15" },
} as const;

export function FittingRoom() {
  const { items, reload } = useFittingRoom();

  // Keep polling while anything is still working.
  useEffect(() => {
    if (!items?.some((i) => i.status === "pending")) return;
    const pending = items.filter((i) => i.status === "pending");
    const t = setTimeout(async () => {
      await Promise.all(pending.map((i) => fetch(`/api/tryon?id=${i.id}`, { cache: "no-store" }).catch(() => null)));
      void reload();
    }, 3000);
    return () => clearTimeout(t);
  }, [items, reload]);

  if (items === null) {
    return (
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Loading">
        {Array.from({ length: 4 }, (_, i) => <li key={i} className="looklab-skeleton aspect-[3/4] rounded-card" />)}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-14 text-center">
        <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">Empty rail</span>
        <p className="max-w-sm opacity-80">Your fitting room is empty. Pick something and tap Try it on.</p>
        <ButtonLink href="/shop">Find something to try</ButtonLink>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <li key={item.id}><Look item={item} /></li>)}
    </ul>
  );
}

function Look({ item }: { item: FittingRoomItem }) {
  const [url, setUrl] = useState(item.resultUrl);
  // Provider result links last 24 h; ask the server for a fresh one if this one is about to lapse.
  useEffect(() => {
    const expired = !!item.resultExpiresAt && Date.parse(item.resultExpiresAt) < Date.now() + 60_000;
    if (item.status !== "success" || !expired) return;
    void fetch(`/api/tryon?id=${item.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TryOnStatusResponse>) : null))
      .then((d) => d?.resultUrl && setUrl(d.resultUrl))
      .catch(() => {});
  }, [item.id, item.status, item.resultExpiresAt]);

  const s = STATE[item.status];
  const title = item.product?.title ?? "Removed item";
  return (
    <article className="flex flex-col gap-2 rounded-card bg-surface p-2">
      <div className="relative overflow-hidden rounded-[18px] bg-lavender">
        {item.status === "success" && url ? (
          <a href={url} target="_blank" rel="noreferrer" aria-label={`Open full size: AI-generated preview of you wearing the ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`AI-generated preview of you wearing the ${title}`} className="aspect-[3/4] w-full object-cover" />
          </a>
        ) : item.product ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.product.image_url} alt="" className={`aspect-[3/4] w-full bg-white object-contain p-4 ${item.status === "pending" ? "animate-pulse" : "opacity-50"}`} />
        ) : (
          <div className="aspect-[3/4]" />
        )}
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
        {item.status === "success" && (
          <span className="absolute bottom-2 left-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">AI-generated try-on</span>
        )}
      </div>
      <div className="px-1 pb-1">
        {item.product ? (
          <Link href={`/product/${item.product.slug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{title}</Link>
        ) : (
          <span className="text-sm font-semibold">{title}</span>
        )}
        {item.status === "failed" && item.message && <p className="mt-1 text-xs opacity-70">{item.message}</p>}
      </div>
    </article>
  );
}
