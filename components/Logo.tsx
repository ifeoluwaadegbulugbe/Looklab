/** LookLab mark: purple tile, cream "L", butter sparkle (same art as app/icon.svg). */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#6C2BFF" />
      <path d="M20 14h9v28h16v8H20z" fill="#FFF8F0" />
      <path d="M47 11l2.2 5.3L54.5 18.5l-5.3 2.2L47 26l-2.2-5.3L39.5 18.5l5.3-2.2z" fill="#FFE66D" />
    </svg>
  );
}
