"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFittingRoomCount } from "@/components/fitting-room/useFittingRoom";
import { CompassIcon, HangerIcon, HeartIcon, HomeIcon, UserIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/explore", label: "Explore", Icon: CompassIcon },
  { href: "/fitting-room", label: "Fitting Room", Icon: HangerIcon },
  { href: "/saved", label: "Saved", Icon: HeartIcon },
  { href: "/me", label: "Me", Icon: UserIcon },
] as const;

/** Reads the current route and Fitting Room count. Render inside <Suspense> (Cache Components). */
export function AppNav() {
  return <NavView pathname={usePathname()} count={useFittingRoomCount()} />;
}

/** Pure nav markup; also the static fallback while the route streams in. */
export function NavView({ pathname, count }: { pathname: string; count: number }) {
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop: top nav */}
      <header className="sticky top-0 z-30 hidden border-b border-ink/10 bg-bg/90 backdrop-blur md:block">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
          <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
            Look<span className="text-primary">Lab</span>
          </Link>
          <ul className="flex flex-1 items-center gap-1">
            {TABS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isActive(href) ? "bg-ink text-white" : "hover:bg-ink/5"}`}
                >
                  {label}
                  {href === "/fitting-room" && count > 0 && <Badge n={count} />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Mobile: compact top bar + bottom tab bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center bg-bg/90 px-4 backdrop-blur md:hidden">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          Look<span className="text-primary">Lab</span>
        </Link>
      </header>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive(href) ? "text-secondary" : "text-ink/70"}`}
              >
                <Icon className="size-6" />
                {label}
                {href === "/fitting-room" && count > 0 && <Badge n={count} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute right-[18%] top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white md:-right-1 md:-top-1">
      <span className="sr-only">, </span>{n}<span className="sr-only"> try-ons</span>
    </span>
  );
}
