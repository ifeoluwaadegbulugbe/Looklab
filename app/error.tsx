"use client";

import { buttonClass } from "@/components/ui/Button";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <span className="-rotate-3 rounded-full bg-tangerine px-4 py-1 text-sm font-bold">Oops</span>
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">Something slipped off the hanger.</h1>
      <p className="text-lg opacity-80" role="alert">That didn&apos;t load. Please try again.</p>
      <button type="button" onClick={reset} className={buttonClass("primary")}>Try again</button>
    </main>
  );
}
