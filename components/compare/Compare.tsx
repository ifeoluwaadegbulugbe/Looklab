"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useFittingRoom, type FittingRoomItem } from "@/components/fitting-room/useFittingRoom";
import { ButtonLink } from "@/components/ui/Button";
import { ChipButton } from "@/components/ui/Chip";
import { getLocalPhoto } from "@/lib/local-photo";
import { SaveLookButton } from "@/components/looks/SaveLookButton";

type Mode = "side" | "slider" | "before";

export function Compare() {
  const params = useSearchParams();
  const { items } = useFittingRoom();
  const [mode, setMode] = useState<Mode>("side");
  const [winner, setWinner] = useState<string | null>(null);

  if (items === null) return <div className="looklab-skeleton mt-6 aspect-[3/2] rounded-card" />;

  const ready = items.filter((i) => i.status === "success" && i.resultUrl);
  const a = ready.find((i) => i.id === params.get("a"));
  const b = ready.find((i) => i.id === params.get("b"));

  if (!a || !b) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-14 text-center">
        <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">Pick two looks</span>
        <p className="max-w-sm opacity-80">
          {ready.length < 2
            ? `You need two ready looks to compare. You have ${ready.length}. Try on another piece first.`
            : "Choose two ready looks in your Fitting Room, then tap Compare."}
        </p>
        <ButtonLink href={ready.length < 2 ? "/shop" : "/fitting-room"}>{ready.length < 2 ? "Find something to try" : "Open Fitting Room"}</ButtonLink>
      </div>
    );
  }

  const local = getLocalPhoto();
  return (
    <>
      <div role="group" aria-label="Compare view" className="mt-5 flex flex-wrap gap-2">
        <ChipButton active={mode === "side"} onClick={() => setMode("side")}>Side by side</ChipButton>
        <ChipButton active={mode === "slider"} onClick={() => setMode("slider")}>Slider</ChipButton>
        <ChipButton active={mode === "before"} onClick={() => setMode("before")} disabled={!local}>Before / after</ChipButton>
      </div>
      {!local && (
        <p className="mt-2 text-xs opacity-70">Before / after uses the photo you added in this tab. It isn&apos;t stored, so it&apos;s gone after a reload.</p>
      )}

      <div className="mt-5">
        {mode === "side" && (
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {[a, b].map((look) => (
              <LookPanel key={look.id} look={look} winner={winner === look.id} onPick={() => setWinner(look.id)} />
            ))}
          </div>
        )}
        {mode === "slider" && (
          <Slider
            left={{ url: a.resultUrl!, label: a.product?.title ?? "Look A", alt: altFor(a) }}
            right={{ url: b.resultUrl!, label: b.product?.title ?? "Look B", alt: altFor(b) }}
          />
        )}
        {mode === "before" && local && (
          <div className="grid gap-6 md:grid-cols-2">
            {[a, b].map((look) => (
              <Slider
                key={look.id}
                left={{ url: local.url, label: "Your photo", alt: "Your original photo" }}
                right={{ url: look.resultUrl!, label: look.product?.title ?? "Look", alt: altFor(look) }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 rounded-2xl bg-surface p-4 text-sm">
        <strong>AI-generated previews.</strong> They show how pieces could look on you, not how they&apos;ll fit. Size,
        fabric and drape may differ from the real garments.
      </p>
    </>
  );
}

const altFor = (look: FittingRoomItem) => `AI-generated preview of you wearing the ${look.product?.title ?? "item"}`;

function LookPanel({ look, winner, onPick }: { look: FittingRoomItem; winner: boolean; onPick: () => void }) {
  return (
    <figure className={`flex flex-col gap-2 rounded-card bg-surface p-2 transition ${winner ? "ring-4 ring-secondary" : ""}`}>
      <div className="relative overflow-hidden rounded-[18px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.resultUrl!} alt={altFor(look)} className="aspect-[3/4] w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">AI-generated try-on</span>
        {winner && <span className="absolute right-2 top-2 rotate-3 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white">Winner</span>}
      </div>
      <figcaption className="flex flex-col gap-2 px-1 pb-1">
        {look.product ? (
          <Link href={`/product/${look.product.slug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{look.product.title}</Link>
        ) : (
          <span className="text-sm font-semibold">Removed item</span>
        )}
        <button type="button" onClick={onPick} aria-pressed={winner} className="min-h-11 rounded-full border-2 border-ink text-sm font-semibold transition hover:bg-ink hover:text-white">
          {winner ? "Picked" : "Pick this one"}
        </button>
        <SaveLookButton sessionId={look.id} className="min-h-11 text-sm" />
      </figcaption>
    </figure>
  );
}

/** Two images stacked; the range input reveals the right one over the left. Keyboard accessible. */
function Slider({ left, right }: { left: { url: string; label: string; alt: string }; right: { url: string; label: string; alt: string } }) {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-card bg-lavender">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={left.url} alt={left.alt} className="absolute inset-0 size-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={right.url}
          alt={right.alt}
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden style={{ left: `${pos}%` }} className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)]">
          <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-bold text-ink shadow">⇆</span>
        </div>
        <span className="absolute bottom-2 left-2 max-w-[45%] truncate rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">{left.label}</span>
        <span className="absolute bottom-2 right-2 max-w-[45%] truncate rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">{right.label}</span>
        <span className="absolute right-2 top-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">AI-generated try-on</span>
      </div>
      <label htmlFor={id} className="sr-only">Reveal {right.label} over {left.label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.currentTarget.value))}
        className="mx-auto w-full max-w-md accent-[#6C2BFF]"
      />
    </figure>
  );
}
