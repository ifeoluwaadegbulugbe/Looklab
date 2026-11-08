"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { useFavourites } from "@/components/favourites/useFavourites";
import { ProductCard } from "@/components/ProductCard";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { completePendingSave, useSavedLooks, type SavedLook } from "@/components/looks/useSavedLooks";
import { EmailLinkDialog, type EmailLinkDialogHandle } from "@/components/auth/EmailLinkDialog";

type Tab = "items" | "looks";

export function SavedTabs({ products, aestheticNames }: { products: Product[]; aestheticNames: [string, string][] }) {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "looks" ? "looks" : "items");
  const { ids } = useFavourites();
  const names = useMemo(() => new Map(aestheticNames), [aestheticNames]);
  const saved = products.filter((p) => ids.has(p.id));
  const { looks, isGuest, reload } = useSavedLooks();
  const [notice, setNotice] = useState<string | null>(params.get("auth") === "failed" ? "That sign-in link didn't work or has expired. Please request a new one." : null);

  // Finish a save the shopper started as a guest, now that they're back from the email link.
  useEffect(() => {
    void completePendingSave().then((msg) => { if (msg) { setNotice(msg); setTab("looks"); void reload(); } });
  }, [reload]);

  return (
    <>
      {notice && <p role="status" className="mt-4 rounded-2xl bg-lavender p-3 text-sm">{notice}</p>}
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
            {t === "items" ? `Items${saved.length ? ` (${saved.length})` : ""}` : `Looks${looks?.length ? ` (${looks.length})` : ""}`}
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
        ) : looks === null ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <li key={i} className="looklab-skeleton aspect-[3/4] rounded-card" />)}</ul>
        ) : isGuest ? (
          <GuestLooks />
        ) : looks.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {looks.map((l) => <li key={l.id}><LookCard look={l} onDeleted={reload} /></li>)}
          </ul>
        ) : (
          <Empty sticker="No looks yet" text="Try something on, then tap Save look to keep it here for good." />
        )}
      </div>
    </>
  );
}

function LookCard({ look, onDeleted }: { look: SavedLook; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/looks/${look.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) onDeleted();
    else setError("We couldn't delete that look. Please try again.");
  }

  return (
    <article className="flex flex-col gap-2 rounded-card bg-surface p-2">
      <div className="relative overflow-hidden rounded-[18px] bg-lavender">
        {look.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={look.imageUrl} alt={`AI-generated preview of you wearing the ${look.productTitle}`} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="aspect-[3/4]" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">AI-generated try-on</span>
        {look.productImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={look.productImageUrl} alt="" className="absolute bottom-2 right-2 size-14 rounded-xl bg-white object-contain p-1 shadow" />
        )}
      </div>
      <div className="flex flex-col gap-2 px-1 pb-1">
        {look.productSlug ? (
          <Link href={`/product/${look.productSlug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{look.productTitle}</Link>
        ) : (
          <span className="line-clamp-2 text-sm font-semibold">{look.productTitle}</span>
        )}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Delete this look?</span>
            <button type="button" onClick={remove} disabled={busy} className="min-h-11 rounded-full bg-secondary px-4 font-semibold text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete"}</button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 px-2 underline">Keep</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 self-start text-sm underline" aria-label={`Delete saved look: ${look.productTitle}`}>Delete</button>
        )}
        {error && <p role="alert" className="text-xs">{error}</p>}
      </div>
    </article>
  );
}

function GuestLooks() {
  const dialog = useRef<EmailLinkDialogHandle>(null);
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-14 text-center">
      <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">Keep your looks</span>
      <p className="max-w-sm opacity-80">Try-on previews disappear after 24 hours. Add your email to save the ones you love, and see them on any device.</p>
      <button type="button" onClick={() => dialog.current?.open()} className={buttonClass("primary")}>Add my email</button>
      <EmailLinkDialog ref={dialog} title="Sign in to LookLab" intro="We'll email you a link. No password needed." next="/saved?tab=looks" />
    </div>
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
