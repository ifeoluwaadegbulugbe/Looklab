import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";

export const metadata: Metadata = { title: "The fitting room is full" };

// Sample gallery of real, saved try-on results is added on Day 3 (only real results, clearly labelled).
export default function FittingRoomFullPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
      <div className="flex flex-col items-start gap-4 rounded-[32px] bg-lavender px-6 py-10 md:px-10">
        <Sticker tone="tangerine">Busy day</Sticker>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">The fitting room is full right now.</h1>
        <p className="max-w-lg">
          LookLab is a hackathon demo with a limited number of AI try-ons. We&apos;ve paused new ones for now so nobody is charged by
          surprise. You can still browse everything and save the pieces you love.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/shop">Keep browsing</ButtonLink>
          <ButtonLink href="/fitting-room" variant="secondary">My fitting room</ButtonLink>
        </div>
      </div>
    </main>
  );
}
