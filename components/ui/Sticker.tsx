const TONES = {
  butter: "bg-butter text-ink",
  tangerine: "bg-tangerine text-ink",
  lime: "bg-lime text-ink",
  lavender: "bg-lavender text-ink",
} as const;

/** Slightly rotated pill label for tags like "New in" or "Demo item". */
export function Sticker({
  children,
  tone = "butter",
  tilt = -3,
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      style={{ rotate: `${tilt}deg` }}
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
