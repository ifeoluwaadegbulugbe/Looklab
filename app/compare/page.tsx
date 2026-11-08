import { Suspense } from "react";
import type { Metadata } from "next";
import { Compare } from "@/components/compare/Compare";

export const metadata: Metadata = { title: "Compare looks" };

export default function ComparePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Compare looks</h1>
      <p className="mt-1 opacity-80">Which one feels more you?</p>
      <Suspense fallback={<div className="looklab-skeleton mt-6 aspect-[3/2] rounded-card" />}>
        <Compare />
      </Suspense>
    </main>
  );
}
