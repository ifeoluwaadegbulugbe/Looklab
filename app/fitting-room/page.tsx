import type { Metadata } from "next";
import { FittingRoom } from "@/components/fitting-room/FittingRoom";

export const metadata: Metadata = { title: "Fitting Room" };

export default function FittingRoomPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Fitting Room</h1>
      <p className="mt-1 opacity-80">Your try-ons from the last 24 hours. Your photo is ready to reuse, so the next piece is one tap.</p>
      <FittingRoom />
    </main>
  );
}
