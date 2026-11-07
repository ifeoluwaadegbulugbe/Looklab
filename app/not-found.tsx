import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <span className="-rotate-3 rounded-full bg-butter px-4 py-1 text-sm font-bold">404</span>
      <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight">This rail is empty.</h1>
      <p className="text-lg opacity-80">We couldn&apos;t find that page. It may have moved, or the piece is no longer in the demo catalogue.</p>
      <ButtonLink href="/">Back to LookLab</ButtonLink>
    </main>
  );
}
