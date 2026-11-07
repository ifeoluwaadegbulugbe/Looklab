import Link from "next/link";

const VARIANTS = {
  primary: "bg-primary text-white hover:brightness-110",
  secondary: "border-2 border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink underline-offset-4 hover:underline",
} as const;

export const buttonClass = (variant: keyof typeof VARIANTS = "primary", extra = "") =>
  `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${extra}`;

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
