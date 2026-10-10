/**
 * Brand mark of Circuito Gòtic: a Gothic pointed arch (the shop's quarter)
 * with a circuit trace running through it.
 */
export function Logo({ size = 36, decorative = false }: { size?: number; decorative?: boolean }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Circuito Gòtic"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a4d9c" />
          <stop offset="1" stopColor="#2a78d6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-bg)" />
      <path
        d="M12 30V19c0-4.6 3.4-8.4 8-9.6 4.6 1.2 8 5 8 9.6v11"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 30v-7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 26h-4.5M20 23h4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <circle cx="20" cy="20" r="2.4" fill="#fff" />
      <circle cx="15.5" cy="26" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="24.5" cy="23" r="1.5" fill="#fff" opacity="0.8" />
    </svg>
  );
}

/** Abstract after-sales illustration for the home hero: parcel, shield and return loop on a circuit. */
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 420 320" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hero-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="hero-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5b73c" />
          <stop offset="1" stopColor="#e3a12b" />
        </linearGradient>
      </defs>

      {/* circuit traces */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round">
        <path d="M20 250h70l30-30h60" />
        <path d="M20 290h120l30-30h40" />
        <path d="M330 60h70" />
        <path d="M300 100h40l30 30h30" />
        <path d="M60 60h50l30 30" />
      </g>
      <g fill="#ffffff" fillOpacity="0.55">
        <circle cx="20" cy="250" r="4" />
        <circle cx="20" cy="290" r="4" />
        <circle cx="400" cy="60" r="4" />
        <circle cx="400" cy="130" r="4" />
        <circle cx="60" cy="60" r="4" />
      </g>

      {/* parcel */}
      <g transform="translate(150 110)">
        <path d="M60 0 120 32v64L60 128 0 96V32z" fill="url(#hero-box)" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M0 32l60 32 60-32M60 64v64" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 16l60 32" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
      </g>

      {/* return loop */}
      <g transform="translate(70 120)">
        <circle cx="40" cy="40" r="40" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        <path d="M30 46 20 36l10-10" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 36h22a10 10 0 0 1 0 20h-6" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* shield */}
      <g transform="translate(290 150)">
        <path d="M40 0 76 14v30c0 24-16 40-36 48C20 84 4 68 4 44V14z" fill="url(#hero-shield)" />
        <path d="M26 46l10 10 20-22" fill="none" stroke="#0f2a5c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

    </svg>
  );
}

/** Empty-state illustration: an open, empty tray. */
export function EmptyArt() {
  return (
    <svg className="empty-art" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="96" rx="60" ry="8" fill="var(--brand-100)" />
      <path d="M30 40h100l10 30v20a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V70z" fill="var(--surface)" stroke="var(--brand-300)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 70h36l8 10h32l8-10h36" fill="none" stroke="var(--brand-300)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M52 26h56M62 14h36" stroke="var(--brand-200)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="128" cy="22" r="3" fill="var(--amber-400)" />
      <circle cx="34" cy="20" r="2.5" fill="var(--brand-300)" />
    </svg>
  );
}
