import type { Metadata } from "next";
import Link from "next/link";
import { DeleteMyData } from "@/components/me/DeleteMyData";
import { AccountCard } from "@/components/me/AccountCard";

export const metadata: Metadata = { title: "Me" };

const ROWS = [
  { href: "/welcome", title: "Edit my picks", text: "Change your sections and aesthetics." },
  { href: "/fitting-room", title: "Fitting Room", text: "Your try-ons from the last 24 hours." },
  { href: "/saved", title: "Saved", text: "Hearted pieces and saved looks." },
  { href: "/privacy", title: "Privacy & AI info", text: "What happens to your photo, and what we store." },
];

export default function MePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Me</h1>
      <AccountCard />
      <ul className="mt-6 flex flex-col gap-3">
        {ROWS.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="flex min-h-16 flex-col justify-center rounded-card bg-surface px-5 py-4 transition hover:bg-white active:scale-[0.99]">
              <span className="font-semibold">{r.title}</span>
              <span className="text-sm opacity-70">{r.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <DeleteMyData />
    </main>
  );
}
