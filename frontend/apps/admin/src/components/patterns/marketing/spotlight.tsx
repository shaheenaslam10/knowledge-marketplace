"use client";
/**
 * Spotlight — adapted Aceternity "Background Beams/Spotlight" pattern (component-selection #M1):
 * static SVG beam layer + one ambient pulse; iris/teal on dark, reduced-motion → static.
 */
export function Spotlight({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)] ${className ?? ""}`}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hm-beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b5bd6" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#0d9488" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="url(#hm-beam)" strokeWidth="1.2" fill="none">
          <path d="M-100 480 C 250 380, 420 260, 700 210 S 1150 150, 1350 60" />
          <path d="M-100 560 C 260 470, 480 330, 760 280 S 1200 210, 1400 120" />
          <path d="M-60 340 C 300 260, 520 170, 820 130" opacity="0.5" />
        </g>
        <g fill="#7c7ce8">
          <circle cx="700" cy="210" r="3" />
          <circle cx="760" cy="280" r="2" opacity="0.7" />
          <circle cx="820" cy="130" r="2" opacity="0.5" />
        </g>
      </svg>
      <div
        className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #5b5bd6, transparent)" }}
      />
    </div>
  );
}
