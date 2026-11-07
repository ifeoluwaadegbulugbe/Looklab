// Small inline icon set (stroke icons, inherit currentColor). Decorative unless given a label.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true } as const;

export const HomeIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const CompassIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
);
export const HangerIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M12 7a2 2 0 1 1 2-2" /><path d="M12 7v1.5L3 15a1.5 1.5 0 0 0 .9 2.7h16.2A1.5 1.5 0 0 0 21 15l-9-6.5" /></svg>
);
export const HeartIcon = ({ className = "size-6", filled = false }: P & { filled?: boolean }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"} className={className}><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z" /></svg>
);
export const UserIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const SparkleIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
);
export const SearchIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const ArrowLeftIcon = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
