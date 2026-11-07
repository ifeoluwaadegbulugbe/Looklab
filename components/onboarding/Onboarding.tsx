"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChipButton } from "@/components/ui/Chip";
import { buttonClass } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";
import { MAX_AESTHETICS, markOnboarded, readPrefs, savePrefs } from "@/lib/preferences";

const SECTIONS = [
  { slug: "women", name: "Women's" },
  { slug: "men", name: "Men's" },
  { slug: "unisex", name: "Everyone" },
];

type Step = "welcome" | "sections" | "aesthetics";

export function Onboarding({
  aesthetics,
  heroImages,
}: {
  aesthetics: { slug: string; name: string; blurb: string | null }[];
  heroImages: string[];
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [sections, setSections] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  // Editing existing picks starts from them.
  useEffect(() => {
    const p = readPrefs();
    if (p) {
      setSections(p.sections); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate from localStorage
      setPicked(p.aesthetics);
    }
  }, []);
  useEffect(() => headingRef.current?.focus(), [step]);

  const toggle = (list: string[], set: (v: string[]) => void, slug: string, max?: number) =>
    set(list.includes(slug) ? list.filter((s) => s !== slug) : max && list.length >= max ? list : [...list, slug]);

  async function finish(save: boolean) {
    markOnboarded();
    if (save) await savePrefs({ sections, aesthetics: picked });
    router.push("/");
  }

  if (step === "welcome") {
    return (
      <section className="flex flex-col gap-6 pt-4">
        <div className="relative h-72 overflow-hidden rounded-[32px] bg-lavender md:h-80">
          {heroImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              style={{ left: `${6 + i * 22}%`, top: `${i % 2 ? 22 : 8}%`, rotate: `${(i % 2 ? 1 : -1) * (4 + i * 2)}deg` }}
              className="absolute h-44 w-32 rounded-2xl bg-white object-contain p-2 shadow-lg md:h-52 md:w-40"
            />
          ))}
          <Sticker tone="lime" className="absolute bottom-4 right-4" tilt={4}>Try-on ready</Sticker>
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-5xl font-extrabold leading-[0.98] tracking-tight outline-none">
          Discover it. <span className="text-primary">Try it.</span> Make it yours.
        </h1>
        <p className="text-lg">Browse pieces you love, then see them on you with one photo. Two quick questions to set up your feed.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setStep("sections")} className={buttonClass("primary", "sm:w-auto")}>Start</button>
          <button type="button" onClick={() => finish(false)} className={buttonClass("ghost")}>Skip for now</button>
        </div>
      </section>
    );
  }

  const isSections = step === "sections";
  return (
    <section className="flex flex-col gap-6 pt-4">
      <p className="text-sm font-semibold uppercase tracking-wider opacity-70">Step {isSections ? 1 : 2} of 2</p>
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl font-extrabold leading-tight tracking-tight outline-none">
        {isSections ? "What do you shop?" : "Pick up to 3 vibes"}
      </h1>
      <p className="opacity-80">
        {isSections
          ? "Choose any. This only changes what we show you first."
          : "We'll put pieces with these tags first. No body or size details, ever."}
      </p>

      {isSections ? (
        <div className="flex flex-wrap gap-3" role="group" aria-label="Sections">
          {SECTIONS.map((s) => (
            <ChipButton key={s.slug} active={sections.includes(s.slug)} onClick={() => toggle(sections, setSections, s.slug)}>{s.name}</ChipButton>
          ))}
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Aesthetics">
            {aesthetics.map((a) => {
              const on = picked.includes(a.slug);
              const full = !on && picked.length >= MAX_AESTHETICS;
              return (
                <li key={a.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={full}
                    onClick={() => toggle(picked, setPicked, a.slug, MAX_AESTHETICS)}
                    className={`flex min-h-16 w-full flex-col items-start rounded-card border-2 p-4 text-left transition active:scale-[0.98] disabled:opacity-40 ${on ? "border-ink bg-ink text-white" : "border-ink/10 bg-surface"}`}
                  >
                    <span className="font-display text-lg font-bold">{a.name}</span>
                    {a.blurb && <span className="text-sm opacity-80">{a.blurb}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p role="status" className="text-sm opacity-70">{picked.length} of {MAX_AESTHETICS} picked</p>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => (isSections ? setStep("aesthetics") : finish(true))}
          className={buttonClass("primary")}
        >
          {isSections ? "Continue" : "Show my feed"}
        </button>
        <button type="button" onClick={() => (isSections ? setStep("aesthetics") : finish(sections.length > 0))} className={buttonClass("ghost")}>
          Skip
        </button>
      </div>
    </section>
  );
}
