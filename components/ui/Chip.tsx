import Link from "next/link";

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
    active ? "border-ink bg-ink text-white" : "border-ink/15 bg-surface hover:border-ink/40"
  }`;

export function ChipLink({ href, active = false, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={chipClass(active)} scroll={false}>
      {children}
    </Link>
  );
}

export function ChipButton({
  active = false,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled} className={`${chipClass(active)} disabled:opacity-40`}>
      {children}
    </button>
  );
}
